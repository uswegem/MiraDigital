const axios = require('axios');
const crypto = require('crypto');
const forge = require('node-forge');
const logger = require('../../../api-gateway/src/utils/logger');

/**
 * VISA Direct SDK Integration
 * Handles card tokenization, payments, and push payments
 * 
 * APIs Used:
 * - Visa Token Service (VTS) - Card tokenization
 * - Visa Direct - Push to card payments
 * - CyberSource - Card-not-present transactions
 */
class VisaSDK {
  constructor(config, tenantId) {
    this.tenantId = tenantId;
    this.config = config;
    
    // VISA API endpoints
    this.baseUrl = config.sandbox
      ? 'https://sandbox.api.visa.com'
      : 'https://api.visa.com';
    
    // Initialize HTTPS client with mutual TLS
    this.client = this._createClient();
    
    logger.info(`VISA SDK initialized for tenant ${tenantId}`, {
      sandbox: config.sandbox,
      apiKeyMasked: config.apiKey?.substring(0, 8) + '...',
    });
  }

  /**
   * Create HTTPS client with mTLS
   */
  _createClient() {
    const httpsAgent = require('https');
    
    return axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      auth: {
        username: this.config.userId,
        password: this.config.password,
      },
      // For mTLS in production
      // httpsAgent: new httpsAgent.Agent({
      //   cert: this.config.certificate,
      //   key: this.config.privateKey,
      //   ca: this.config.caCert,
      // }),
    });
  }

  /**
   * Generate X-Pay-Token for VISA API authentication
   */
  _generateXPayToken(resourcePath, queryString, body) {
    const timestamp = Math.floor(Date.now() / 1000);
    const requestBody = typeof body === 'string' ? body : JSON.stringify(body || '');
    
    const preHashString = timestamp + resourcePath + queryString + requestBody;
    
    const hmac = crypto.createHmac('sha256', this.config.sharedSecret);
    hmac.update(preHashString);
    const hash = hmac.digest('hex');
    
    return `xv2:${timestamp}:${hash}`;
  }

  /**
   * Encrypt card data using VISA's public key
   */
  _encryptCardData(cardData) {
    const publicKey = forge.pki.publicKeyFromPem(this.config.visaPublicKey);
    
    const data = JSON.stringify(cardData);
    const encrypted = publicKey.encrypt(data, 'RSA-OAEP', {
      md: forge.md.sha256.create(),
    });
    
    return forge.util.encode64(encrypted);
  }

  /**
   * Tokenize a card (create a virtual card token)
   * This replaces the actual card number with a token for secure storage
   */
  async tokenizeCard({
    cardNumber,
    expiryMonth,
    expiryYear,
    cvv,
    cardholderName,
    billingAddress,
  }) {
    const resourcePath = '/vts/v1/tokenize';
    
    // Encrypt sensitive card data
    const encryptedCard = this._encryptCardData({
      primaryAccountNumber: cardNumber,
      expirationMonth: expiryMonth,
      expirationYear: expiryYear,
      securityCode: cvv,
    });

    const requestBody = {
      encryptedCard: encryptedCard,
      cardholderInfo: {
        name: cardholderName,
        billingAddress: {
          line1: billingAddress?.line1 || '',
          line2: billingAddress?.line2 || '',
          city: billingAddress?.city || '',
          state: billingAddress?.state || '',
          country: billingAddress?.country || 'TZ',
          postalCode: billingAddress?.postalCode || '',
        },
      },
      tokenType: 'SECURE_ELEMENT', // or 'CLOUD' for HCE
      clientAppId: this.config.clientAppId,
      clientWalletAccountId: crypto.randomUUID(),
    };

    const xPayToken = this._generateXPayToken(resourcePath, '', requestBody);

    try {
      const response = await this.client.post(resourcePath, requestBody, {
        headers: {
          'X-Pay-Token': xPayToken,
        },
      });

      return {
        success: true,
        token: response.data.token,
        tokenReferenceId: response.data.tokenReferenceId,
        panLastFour: response.data.panLastFour,
        cardBrand: response.data.cardBrand || 'VISA',
        expiryMonth: expiryMonth,
        expiryYear: expiryYear,
        tokenStatus: 'ACTIVE',
        createdAt: new Date().toISOString(),
      };
    } catch (error) {
      logger.error('Card tokenization failed', {
        tenantId: this.tenantId,
        error: error.message,
      });
      throw new Error(`Tokenization failed: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Get token details
   */
  async getTokenDetails(tokenReferenceId) {
    const resourcePath = `/vts/v1/tokens/${tokenReferenceId}`;
    const xPayToken = this._generateXPayToken(resourcePath, '', null);

    const response = await this.client.get(resourcePath, {
      headers: {
        'X-Pay-Token': xPayToken,
      },
    });

    return {
      tokenReferenceId: response.data.tokenReferenceId,
      panLastFour: response.data.panLastFour,
      tokenStatus: response.data.tokenStatus,
      cardBrand: response.data.cardBrand,
      expirationDate: response.data.expirationDate,
    };
  }

  /**
   * Suspend a token (temporarily disable)
   */
  async suspendToken(tokenReferenceId, reason = 'USER_REQUEST') {
    const resourcePath = `/vts/v1/tokens/${tokenReferenceId}/suspend`;
    
    const requestBody = {
      reason: reason,
    };

    const xPayToken = this._generateXPayToken(resourcePath, '', requestBody);

    const response = await this.client.post(resourcePath, requestBody, {
      headers: {
        'X-Pay-Token': xPayToken,
      },
    });

    return {
      success: true,
      tokenReferenceId,
      status: 'SUSPENDED',
      reason,
    };
  }

  /**
   * Resume a suspended token
   */
  async resumeToken(tokenReferenceId) {
    const resourcePath = `/vts/v1/tokens/${tokenReferenceId}/resume`;
    const xPayToken = this._generateXPayToken(resourcePath, '', {});

    await this.client.post(resourcePath, {}, {
      headers: {
        'X-Pay-Token': xPayToken,
      },
    });

    return {
      success: true,
      tokenReferenceId,
      status: 'ACTIVE',
    };
  }

  /**
   * Delete a token permanently
   */
  async deleteToken(tokenReferenceId, reason = 'USER_REQUEST') {
    const resourcePath = `/vts/v1/tokens/${tokenReferenceId}`;
    
    const xPayToken = this._generateXPayToken(resourcePath, '', null);

    await this.client.delete(resourcePath, {
      headers: {
        'X-Pay-Token': xPayToken,
      },
      data: { reason },
    });

    return {
      success: true,
      tokenReferenceId,
      status: 'DELETED',
    };
  }

  /**
   * Push payment to card (VISA Direct)
   * For sending money to any VISA card
   */
  async pushToCard({
    senderAccountNumber,
    recipientCardNumber,
    amount,
    currency = 'TZS',
    transactionIdentifier,
    senderName,
    recipientName,
    purpose = 'FUND_TRANSFER',
  }) {
    const resourcePath = '/visadirect/fundstransfer/v1/pushfundstransactions';
    
    const requestBody = {
      systemsTraceAuditNumber: this._generateSTAN(),
      retrievalReferenceNumber: this._generateRRN(),
      localTransactionDateTime: new Date().toISOString().replace(/[-:]/g, '').substring(0, 14),
      acquiringBin: this.config.acquiringBin,
      acquirerCountryCode: '834', // Tanzania
      senderAccountNumber: senderAccountNumber,
      senderName: senderName,
      senderAddress: 'Tanzania',
      senderCity: 'Dar es Salaam',
      senderCountryCode: 'TZA',
      recipientPrimaryAccountNumber: recipientCardNumber,
      recipientName: recipientName,
      transactionAmount: amount,
      transactionCurrencyCode: currency === 'TZS' ? '834' : currency,
      businessApplicationId: this._mapPurpose(purpose),
      merchantCategoryCode: '6012', // Financial institution
      pointOfServiceData: {
        posConditionCode: '00',
        panEntryMode: '010', // Manual entry
      },
    };

    const xPayToken = this._generateXPayToken(resourcePath, '', requestBody);

    try {
      const response = await this.client.post(resourcePath, requestBody, {
        headers: {
          'X-Pay-Token': xPayToken,
        },
      });

      return {
        success: response.data.actionCode === '00',
        transactionId: transactionIdentifier || response.data.transactionIdentifier,
        approvalCode: response.data.approvalCode,
        actionCode: response.data.actionCode,
        responseCode: response.data.responseCode,
        transmissionDateTime: response.data.transmissionDateTime,
        amount,
        currency,
        status: response.data.actionCode === '00' ? 'APPROVED' : 'DECLINED',
      };
    } catch (error) {
      logger.error('Push to card failed', {
        tenantId: this.tenantId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Generate cryptogram for tap-to-pay transaction
   */
  async generateCryptogram(tokenReferenceId, transactionData) {
    const resourcePath = '/vts/v1/tokens/cryptograms';
    
    const requestBody = {
      tokenReferenceId: tokenReferenceId,
      transactionType: transactionData.type || 'CONTACTLESS',
      transactionAmount: transactionData.amount,
      transactionCurrencyCode: transactionData.currency || '834',
      merchantId: transactionData.merchantId,
      merchantCategoryCode: transactionData.mcc || '5411',
      deviceId: transactionData.deviceId,
    };

    const xPayToken = this._generateXPayToken(resourcePath, '', requestBody);

    const response = await this.client.post(resourcePath, requestBody, {
      headers: {
        'X-Pay-Token': xPayToken,
      },
    });

    return {
      cryptogram: response.data.cryptogram,
      cryptogramType: response.data.cryptogramType,
      expirationTime: response.data.expirationTime,
      tokenReferenceId,
    };
  }

  /**
   * Generate 6-digit Systems Trace Audit Number
   */
  _generateSTAN() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Generate 12-character Retrieval Reference Number
   */
  _generateRRN() {
    const date = new Date();
    const julian = Math.floor((date - new Date(date.getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
    const time = date.toTimeString().substring(0, 8).replace(/:/g, '');
    const random = Math.floor(1000 + Math.random() * 9000);
    return `${julian}${time}${random}`.substring(0, 12);
  }

  /**
   * Map purpose to VISA Business Application ID
   */
  _mapPurpose(purpose) {
    const purposeMap = {
      FUND_TRANSFER: 'AA', // Account to Account
      MONEY_TRANSFER: 'PP', // Person to Person
      MERCHANT_PAYMENT: 'MP', // Merchant Payment
      WALLET_TRANSFER: 'WT', // Wallet Transfer
    };
    return purposeMap[purpose] || 'AA';
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      const resourcePath = '/vdp/helloworld';
      const xPayToken = this._generateXPayToken(resourcePath, '', null);
      
      await this.client.get(resourcePath, {
        headers: {
          'X-Pay-Token': xPayToken,
        },
      });

      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString(),
      };
    }
  }
}

module.exports = VisaSDK;
