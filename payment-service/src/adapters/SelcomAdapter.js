const axios = require('axios');
const crypto = require('crypto');
const BaseAdapter = require('./BaseAdapter');

/**
 * Selcom Payment Adapter
 * Handles bill payments via Selcom API
 * 
 * Supported billers:
 * - LUKU (Prepaid Electricity)
 * - DAWASCO (Water)
 * - DSTV, Azam TV
 * - Airtime (Vodacom, Airtel, Tigo, Halotel)
 * - And more...
 */
class SelcomAdapter extends BaseAdapter {
  constructor(config, tenantId) {
    super(config, tenantId);
    this.name = 'SelcomAdapter';
    
    this.baseUrl = config.sandbox 
      ? 'https://apigw.selcommobile.com/v1/sandbox'
      : 'https://apigw.selcommobile.com/v1';
    
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request signing
    this.client.interceptors.request.use((request) => {
      const timestamp = new Date().toISOString();
      const digest = this._generateDigest(request.data, timestamp);
      
      request.headers['Authorization'] = `SELCOM ${this.config.apiKey}:${digest}`;
      request.headers['Digest'] = `SHA256=${digest}`;
      request.headers['Timestamp'] = timestamp;
      request.headers['Signed-Fields'] = 'transid,amount,msisdn';
      
      return request;
    });
  }

  /**
   * Generate HMAC signature for Selcom API
   */
  _generateDigest(data, timestamp) {
    const message = JSON.stringify(data) + timestamp;
    return crypto
      .createHmac('sha256', this.config.apiSecret)
      .update(message)
      .digest('base64');
  }

  /**
   * Get available billers
   */
  async getBillers() {
    const response = await this.client.get('/checkout/billers');
    return response.data.data;
  }

  /**
   * Validate bill/meter number
   */
  async validateBiller(billerCode, customerRef) {
    const response = await this.client.post('/checkout/bill-validation', {
      vendor: this.config.vendorId,
      biller_code: billerCode,
      customer_ref: customerRef,
    });

    return {
      valid: response.data.result === 'SUCCESS',
      customerName: response.data.data?.customer_name,
      balance: response.data.data?.balance,
      message: response.data.message,
    };
  }

  /**
   * Pay a bill (LUKU, Water, TV, etc.)
   */
  async payBill({ billerCode, customerRef, amount, phone, description }) {
    this.validate({ amount });

    const reference = this.generateReference('BILL');

    const response = await this.client.post('/checkout/bill-payment', {
      vendor: this.config.vendorId,
      transid: reference,
      biller_code: billerCode,
      customer_ref: customerRef,
      amount: amount,
      msisdn: phone,
      narration: description || `Bill payment - ${billerCode}`,
      callback_url: this.config.callbackUrl,
    });

    const transaction = {
      reference,
      type: 'BILL_PAYMENT',
      billerCode,
      customerRef,
      amount,
      status: response.data.result === 'SUCCESS' ? 'COMPLETED' : 'FAILED',
      providerReference: response.data.data?.reference,
      message: response.data.message,
      token: response.data.data?.token, // For LUKU tokens
      timestamp: new Date(),
    };

    await this.logTransaction(transaction);

    return transaction;
  }

  /**
   * Buy airtime
   */
  async buyAirtime({ phone, amount, network }) {
    this.validate({ amount });

    const reference = this.generateReference('AIR');

    // Map network to biller code
    const networkCodes = {
      VODACOM: 'VODABUNDLES',
      AIRTEL: 'AIRTELBUNDLES',
      TIGO: 'TIGOBUNDLES',
      HALOTEL: 'HALOBUNDLES',
    };

    const billerCode = networkCodes[network?.toUpperCase()] || 'VODABUNDLES';

    const response = await this.client.post('/checkout/airtime-topup', {
      vendor: this.config.vendorId,
      transid: reference,
      msisdn: phone,
      amount: amount,
      biller_code: billerCode,
      callback_url: this.config.callbackUrl,
    });

    const transaction = {
      reference,
      type: 'AIRTIME',
      phone,
      network,
      amount,
      status: response.data.result === 'SUCCESS' ? 'COMPLETED' : 'FAILED',
      providerReference: response.data.data?.reference,
      message: response.data.message,
      timestamp: new Date(),
    };

    await this.logTransaction(transaction);

    return transaction;
  }

  /**
   * Check transaction status
   */
  async checkStatus(reference) {
    const response = await this.client.get(`/checkout/order-status/${reference}`);
    
    return {
      reference,
      status: response.data.data?.payment_status,
      providerReference: response.data.data?.reference,
      message: response.data.message,
    };
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      await this.getBillers();
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

module.exports = SelcomAdapter;
