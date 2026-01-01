const axios = require('axios');
const crypto = require('crypto');
const xml2js = require('xml2js');
const BaseAdapter = require('./BaseAdapter');

/**
 * GEPG (Government Electronic Payment Gateway) Adapter
 * Handles government payments including taxes, fees, and licenses
 * 
 * Supported operations:
 * - Bill lookup
 * - Bill payment
 * - Receipt verification
 */
class GEPGAdapter extends BaseAdapter {
  constructor(config, tenantId) {
    super(config, tenantId);
    this.name = 'GEPGAdapter';
    
    this.baseUrl = config.sandbox
      ? 'https://uat.gepg.go.tz/api/v1'
      : 'https://api.gepg.go.tz/api/v1';
    
    this.spCode = config.spCode; // Service Provider Code
    this.systemId = config.systemId;
    
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 60000,
      headers: {
        'Content-Type': 'application/xml',
        'Accept': 'application/xml',
      },
    });

    this.xmlParser = new xml2js.Parser({ explicitArray: false });
    this.xmlBuilder = new xml2js.Builder({ headless: true });
  }

  /**
   * Generate digital signature for GEPG
   */
  _generateSignature(data) {
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(data);
    return sign.sign(this.config.privateKey, 'base64');
  }

  /**
   * Verify GEPG response signature
   */
  _verifySignature(data, signature) {
    const verify = crypto.createVerify('RSA-SHA256');
    verify.update(data);
    return verify.verify(this.config.gepgPublicKey, signature, 'base64');
  }

  /**
   * Build signed XML request
   */
  _buildSignedRequest(operation, data) {
    const requestData = {
      gepgServiceRequest: {
        requestHeader: {
          systemId: this.systemId,
          spCode: this.spCode,
          timestamp: new Date().toISOString(),
          operation: operation,
        },
        requestBody: data,
      },
    };

    const xml = this.xmlBuilder.buildObject(requestData);
    const signature = this._generateSignature(xml);
    
    return `<?xml version="1.0" encoding="UTF-8"?>
<gepgSignedRequest>
  <requestData>${Buffer.from(xml).toString('base64')}</requestData>
  <signature>${signature}</signature>
</gepgSignedRequest>`;
  }

  /**
   * Parse GEPG XML response
   */
  async _parseResponse(xmlResponse) {
    const result = await this.xmlParser.parseStringPromise(xmlResponse);
    
    if (result.gepgSignedResponse) {
      const responseData = Buffer.from(
        result.gepgSignedResponse.responseData, 
        'base64'
      ).toString('utf-8');
      
      // Verify signature in production
      if (!this.config.sandbox) {
        const isValid = this._verifySignature(
          responseData,
          result.gepgSignedResponse.signature
        );
        if (!isValid) {
          throw new Error('Invalid GEPG response signature');
        }
      }
      
      return this.xmlParser.parseStringPromise(responseData);
    }
    
    return result;
  }

  /**
   * Get list of available service providers (MDAs)
   */
  async getServiceProviders() {
    const signedRequest = this._buildSignedRequest('GET_SP_LIST', {});
    
    const response = await this.client.post('/mdas', signedRequest);
    const parsed = await this._parseResponse(response.data);
    
    const spList = parsed.gepgServiceResponse?.responseBody?.spList || [];
    
    return (Array.isArray(spList) ? spList : [spList]).map(sp => ({
      code: sp.spCode,
      name: sp.spName,
      services: sp.services || [],
    }));
  }

  /**
   * Lookup a control number (bill)
   */
  async lookupBill(controlNumber) {
    const signedRequest = this._buildSignedRequest('BILL_INQUIRY', {
      controlNumber: controlNumber,
    });

    const response = await this.client.post('/bills/inquiry', signedRequest);
    const parsed = await this._parseResponse(response.data);
    
    const billInfo = parsed.gepgServiceResponse?.responseBody?.billInfo;
    
    if (!billInfo) {
      return {
        found: false,
        message: 'Control number not found',
      };
    }

    return {
      found: true,
      controlNumber: billInfo.controlNumber,
      billId: billInfo.billId,
      payerName: billInfo.payerName,
      payerId: billInfo.payerId,
      amount: parseFloat(billInfo.billAmount),
      currency: billInfo.currency || 'TZS',
      description: billInfo.billDesc,
      serviceProvider: billInfo.spName,
      spCode: billInfo.spCode,
      expiryDate: billInfo.billExpiryDate,
      status: this._mapBillStatus(billInfo.billStatus),
    };
  }

  /**
   * Pay a GEPG bill using control number
   */
  async payBill({
    controlNumber,
    amount,
    payerName,
    payerPhone,
    payerEmail,
    payerAccount,
    paymentMethod = 'ACCOUNT', // ACCOUNT, CARD, MOBILE
  }) {
    this.validate({ amount });

    // First lookup the bill
    const billInfo = await this.lookupBill(controlNumber);
    
    if (!billInfo.found) {
      throw new Error('Invalid control number');
    }

    if (billInfo.status === 'PAID') {
      throw new Error('Bill already paid');
    }

    if (billInfo.status === 'EXPIRED') {
      throw new Error('Control number expired');
    }

    // Validate amount matches
    if (Math.abs(billInfo.amount - amount) > 0.01) {
      throw new Error(`Amount mismatch. Expected ${billInfo.amount}, got ${amount}`);
    }

    const reference = this.generateReference('GEPG');

    const signedRequest = this._buildSignedRequest('PAYMENT', {
      paymentInfo: {
        controlNumber: controlNumber,
        billId: billInfo.billId,
        spCode: billInfo.spCode,
        transactionId: reference,
        payerName: payerName,
        payerPhone: payerPhone,
        payerEmail: payerEmail || '',
        payerAccount: payerAccount,
        paymentAmount: amount,
        paymentCurrency: 'TZS',
        paymentMethod: paymentMethod,
        timestamp: new Date().toISOString(),
      },
    });

    const response = await this.client.post('/payments', signedRequest);
    const parsed = await this._parseResponse(response.data);
    
    const paymentResult = parsed.gepgServiceResponse?.responseBody?.paymentResult;

    const transaction = {
      reference,
      type: 'GEPG_PAYMENT',
      controlNumber,
      billId: billInfo.billId,
      amount,
      currency: 'TZS',
      status: this._mapPaymentStatus(paymentResult?.status),
      gepgReceipt: paymentResult?.receiptNumber,
      message: paymentResult?.message || 'Payment submitted',
      serviceProvider: billInfo.serviceProvider,
      timestamp: new Date(),
    };

    await this.logTransaction(transaction);

    return transaction;
  }

  /**
   * Verify payment receipt
   */
  async verifyReceipt(receiptNumber) {
    const signedRequest = this._buildSignedRequest('RECEIPT_INQUIRY', {
      receiptNumber: receiptNumber,
    });

    const response = await this.client.post('/receipts/verify', signedRequest);
    const parsed = await this._parseResponse(response.data);
    
    const receipt = parsed.gepgServiceResponse?.responseBody?.receiptInfo;

    return {
      valid: receipt?.valid === 'true' || receipt?.valid === true,
      receiptNumber: receipt?.receiptNumber,
      controlNumber: receipt?.controlNumber,
      amount: parseFloat(receipt?.amount || 0),
      paymentDate: receipt?.paymentDate,
      payerName: receipt?.payerName,
      serviceProvider: receipt?.spName,
    };
  }

  /**
   * Check payment status
   */
  async checkStatus(reference) {
    const signedRequest = this._buildSignedRequest('PAYMENT_STATUS', {
      transactionId: reference,
    });

    const response = await this.client.post('/payments/status', signedRequest);
    const parsed = await this._parseResponse(response.data);
    
    const statusResult = parsed.gepgServiceResponse?.responseBody?.statusInfo;

    return {
      reference,
      status: this._mapPaymentStatus(statusResult?.status),
      gepgReceipt: statusResult?.receiptNumber,
      completedAt: statusResult?.paymentDate,
      message: statusResult?.message,
    };
  }

  /**
   * Map GEPG bill status
   */
  _mapBillStatus(status) {
    const statusMap = {
      'PENDING': 'PENDING',
      'PAID': 'PAID',
      'PARTIAL': 'PARTIAL',
      'EXPIRED': 'EXPIRED',
      'CANCELLED': 'CANCELLED',
    };
    return statusMap[status] || 'UNKNOWN';
  }

  /**
   * Map GEPG payment status
   */
  _mapPaymentStatus(status) {
    const statusMap = {
      'PENDING': 'PENDING',
      'PROCESSING': 'PROCESSING',
      'SUCCESSFUL': 'COMPLETED',
      'SUCCESS': 'COMPLETED',
      'COMPLETED': 'COMPLETED',
      'FAILED': 'FAILED',
      'REJECTED': 'FAILED',
    };
    return statusMap[status] || 'UNKNOWN';
  }

  /**
   * Health check
   */
  async healthCheck() {
    try {
      await this.getServiceProviders();
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

module.exports = GEPGAdapter;
