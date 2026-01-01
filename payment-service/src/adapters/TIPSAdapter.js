const axios = require('axios');
const crypto = require('crypto');
const BaseAdapter = require('./BaseAdapter');

/**
 * TIPS (Tanzania Instant Payment System) Adapter
 * Handles instant bank-to-bank and mobile money transfers
 * 
 * Supported operations:
 * - Bank to Bank transfers
 * - Bank to Mobile Money
 * - Account validation
 */
class TIPSAdapter extends BaseAdapter {
  constructor(config, tenantId) {
    super(config, tenantId);
    this.name = 'TIPSAdapter';
    
    this.baseUrl = config.sandbox
      ? 'https://sandbox.tips.co.tz/api/v1'
      : 'https://api.tips.co.tz/api/v1';
    
    this.institutionCode = config.institutionCode;
    
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 60000, // TIPS can take longer
      headers: {
        'Content-Type': 'application/json',
        'X-Institution-Code': this.institutionCode,
        'X-API-Key': config.apiKey,
      },
    });

    // Add request signing
    this.client.interceptors.request.use((request) => {
      const timestamp = Date.now().toString();
      const signature = this._signRequest(request.data, timestamp);
      
      request.headers['X-Timestamp'] = timestamp;
      request.headers['X-Signature'] = signature;
      
      return request;
    });
  }

  /**
   * Sign request for TIPS API
   */
  _signRequest(data, timestamp) {
    const payload = JSON.stringify(data) + timestamp + this.config.apiSecret;
    return crypto
      .createHash('sha256')
      .update(payload)
      .digest('hex');
  }

  /**
   * Validate destination account
   */
  async validateAccount({ accountNumber, bankCode, accountType = 'BANK' }) {
    const response = await this.client.post('/accounts/validate', {
      account_number: accountNumber,
      bank_code: bankCode,
      account_type: accountType, // BANK or MOBILE
    });

    return {
      valid: response.data.success,
      accountName: response.data.data?.account_name,
      accountNumber: response.data.data?.account_number,
      bankName: response.data.data?.bank_name,
      message: response.data.message,
    };
  }

  /**
   * Transfer funds via TIPS
   */
  async transfer({
    sourceAccount,
    destinationAccount,
    destinationBankCode,
    amount,
    currency = 'TZS',
    narration,
    senderName,
    senderPhone,
    recipientName,
    accountType = 'BANK', // BANK or MOBILE
  }) {
    this.validate({ amount });

    const reference = this.generateReference('TIPS');

    const response = await this.client.post('/transfers', {
      transaction_reference: reference,
      source_account: sourceAccount,
      destination_account: destinationAccount,
      destination_bank_code: destinationBankCode,
      destination_type: accountType,
      amount: amount,
      currency: currency,
      narration: narration || 'Fund Transfer',
      sender_name: senderName,
      sender_phone: senderPhone,
      recipient_name: recipientName,
      callback_url: this.config.callbackUrl,
    });

    const transaction = {
      reference,
      type: 'TIPS_TRANSFER',
      sourceAccount,
      destinationAccount,
      destinationBankCode,
      amount,
      currency,
      status: this._mapStatus(response.data.data?.status),
      tipsReference: response.data.data?.tips_reference,
      message: response.data.message,
      timestamp: new Date(),
    };

    await this.logTransaction(transaction);

    return transaction;
  }

  /**
   * Transfer to mobile money
   */
  async transferToMobile({
    sourceAccount,
    mobileNumber,
    network, // MPESA, TIGOPESA, AIRTELMONEY, HALOPESA
    amount,
    narration,
    senderName,
    recipientName,
  }) {
    const networkCodes = {
      MPESA: 'MPESA',
      VODACOM: 'MPESA',
      TIGOPESA: 'TIGOPESA',
      TIGO: 'TIGOPESA',
      AIRTELMONEY: 'AIRTELMONEY',
      AIRTEL: 'AIRTELMONEY',
      HALOPESA: 'HALOPESA',
      HALOTEL: 'HALOPESA',
    };

    return this.transfer({
      sourceAccount,
      destinationAccount: mobileNumber,
      destinationBankCode: networkCodes[network?.toUpperCase()] || 'MPESA',
      amount,
      narration,
      senderName,
      recipientName,
      accountType: 'MOBILE',
    });
  }

  /**
   * Get list of participating banks
   */
  async getBanks() {
    const response = await this.client.get('/banks');
    return response.data.data.map(bank => ({
      code: bank.bank_code,
      name: bank.bank_name,
      swiftCode: bank.swift_code,
      active: bank.is_active,
    }));
  }

  /**
   * Check transaction status
   */
  async checkStatus(reference) {
    const response = await this.client.get(`/transfers/${reference}/status`);
    
    return {
      reference,
      status: this._mapStatus(response.data.data?.status),
      tipsReference: response.data.data?.tips_reference,
      completedAt: response.data.data?.completed_at,
      failureReason: response.data.data?.failure_reason,
      message: response.data.message,
    };
  }

  /**
   * Map TIPS status to standard status
   */
  _mapStatus(tipsStatus) {
    const statusMap = {
      PENDING: 'PENDING',
      PROCESSING: 'PROCESSING',
      SUCCESSFUL: 'COMPLETED',
      COMPLETED: 'COMPLETED',
      FAILED: 'FAILED',
      REVERSED: 'REVERSED',
      CANCELLED: 'CANCELLED',
    };
    return statusMap[tipsStatus] || 'UNKNOWN';
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      await this.getBanks();
      return {
        adapter: this.name,
        status: 'healthy',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        adapter: this.name,
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }
}

module.exports = TIPSAdapter;
