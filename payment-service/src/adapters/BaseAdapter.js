const { v4: uuidv4 } = require('uuid');

/**
 * Base Payment Adapter
 * All payment adapters must extend this class
 */
class BaseAdapter {
  constructor(config, tenantId) {
    this.config = config;
    this.tenantId = tenantId;
    this.name = 'BaseAdapter';
  }

  /**
   * Generate unique transaction reference
   */
  generateReference(prefix = 'TXN') {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}${timestamp}${random}`;
  }

  /**
   * Validate payment request
   * Override in child classes
   */
  validate(request) {
    if (!request.amount || request.amount <= 0) {
      throw new Error('Invalid payment amount');
    }
    return true;
  }

  /**
   * Log transaction for audit
   */
  async logTransaction(transaction) {
    console.log(`[${this.name}] Transaction logged:`, {
      tenantId: this.tenantId,
      reference: transaction.reference,
      type: transaction.type,
      amount: transaction.amount,
      status: transaction.status,
    });
  }

  /**
   * Check adapter health
   */
  async healthCheck() {
    return {
      adapter: this.name,
      status: 'healthy',
      timestamp: new Date().toISOString(),
    };
  }
}

module.exports = BaseAdapter;
