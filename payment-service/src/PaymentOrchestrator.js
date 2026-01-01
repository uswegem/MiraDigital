const { SelcomAdapter, TIPSAdapter, GEPGAdapter } = require('./adapters');
const logger = require('../../../api-gateway/src/utils/logger');

/**
 * Payment Orchestrator
 * Coordinates all payment adapters for a tenant
 * Handles routing, fallback, and transaction management
 */
class PaymentOrchestrator {
  constructor(tenantConfig) {
    this.tenantId = tenantConfig.id;
    this.adapters = {};
    this.initialized = false;
    
    this._initializeAdapters(tenantConfig);
  }

  /**
   * Initialize payment adapters based on tenant configuration
   */
  _initializeAdapters(tenantConfig) {
    const integrations = tenantConfig.integrations || {};

    // Initialize Selcom if configured
    if (integrations.selcom?.enabled) {
      this.adapters.selcom = new SelcomAdapter(
        integrations.selcom,
        this.tenantId
      );
      logger.info(`Selcom adapter initialized for tenant ${this.tenantId}`);
    }

    // Initialize TIPS if configured
    if (integrations.tips?.enabled) {
      this.adapters.tips = new TIPSAdapter(
        integrations.tips,
        this.tenantId
      );
      logger.info(`TIPS adapter initialized for tenant ${this.tenantId}`);
    }

    // Initialize GEPG if configured
    if (integrations.gepg?.enabled) {
      this.adapters.gepg = new GEPGAdapter(
        integrations.gepg,
        this.tenantId
      );
      logger.info(`GEPG adapter initialized for tenant ${this.tenantId}`);
    }

    this.initialized = true;
  }

  /**
   * Check if a payment type is available
   */
  isAvailable(paymentType) {
    const typeMap = {
      BILL_PAYMENT: ['selcom'],
      AIRTIME: ['selcom'],
      BANK_TRANSFER: ['tips'],
      MOBILE_TRANSFER: ['tips'],
      GOVERNMENT: ['gepg'],
    };

    const adapters = typeMap[paymentType] || [];
    return adapters.some(adapter => this.adapters[adapter]);
  }

  /**
   * Get available payment methods for this tenant
   */
  getAvailableMethods() {
    const methods = [];

    if (this.adapters.selcom) {
      methods.push({
        type: 'BILL_PAYMENT',
        name: 'Bill Payments',
        description: 'Pay utility bills, subscriptions, and services',
        provider: 'selcom',
      });
      methods.push({
        type: 'AIRTIME',
        name: 'Airtime & Data',
        description: 'Buy airtime and data bundles',
        provider: 'selcom',
      });
    }

    if (this.adapters.tips) {
      methods.push({
        type: 'BANK_TRANSFER',
        name: 'Bank Transfer',
        description: 'Transfer to other bank accounts',
        provider: 'tips',
      });
      methods.push({
        type: 'MOBILE_TRANSFER',
        name: 'Mobile Money',
        description: 'Send to mobile money wallets',
        provider: 'tips',
      });
    }

    if (this.adapters.gepg) {
      methods.push({
        type: 'GOVERNMENT',
        name: 'Government Payments',
        description: 'Pay taxes, fees, and government services',
        provider: 'gepg',
      });
    }

    return methods;
  }

  // ==================
  // BILL PAYMENTS
  // ==================

  /**
   * Get available billers
   */
  async getBillers(category) {
    if (!this.adapters.selcom) {
      throw new Error('Bill payment not available for this tenant');
    }
    return this.adapters.selcom.getBillers(category);
  }

  /**
   * Validate biller account
   */
  async validateBiller(billerCode, accountNumber) {
    if (!this.adapters.selcom) {
      throw new Error('Bill payment not available for this tenant');
    }
    return this.adapters.selcom.validateBiller(billerCode, accountNumber);
  }

  /**
   * Pay a bill
   */
  async payBill({ billerCode, accountNumber, amount, payerPhone }) {
    if (!this.adapters.selcom) {
      throw new Error('Bill payment not available for this tenant');
    }
    return this.adapters.selcom.payBill({
      billerCode,
      accountNumber,
      amount,
      payerPhone,
    });
  }

  /**
   * Buy airtime
   */
  async buyAirtime({ phoneNumber, amount, network }) {
    if (!this.adapters.selcom) {
      throw new Error('Airtime purchase not available for this tenant');
    }
    return this.adapters.selcom.buyAirtime({
      phoneNumber,
      amount,
      network,
    });
  }

  // ==================
  // BANK TRANSFERS (TIPS)
  // ==================

  /**
   * Get participating banks
   */
  async getBanks() {
    if (!this.adapters.tips) {
      throw new Error('Bank transfers not available for this tenant');
    }
    return this.adapters.tips.getBanks();
  }

  /**
   * Validate bank account
   */
  async validateBankAccount({ accountNumber, bankCode }) {
    if (!this.adapters.tips) {
      throw new Error('Bank transfers not available for this tenant');
    }
    return this.adapters.tips.validateAccount({
      accountNumber,
      bankCode,
      accountType: 'BANK',
    });
  }

  /**
   * Transfer to bank account
   */
  async transferToBank(transferDetails) {
    if (!this.adapters.tips) {
      throw new Error('Bank transfers not available for this tenant');
    }
    return this.adapters.tips.transfer({
      ...transferDetails,
      accountType: 'BANK',
    });
  }

  /**
   * Transfer to mobile money
   */
  async transferToMobile(transferDetails) {
    if (!this.adapters.tips) {
      throw new Error('Mobile transfers not available for this tenant');
    }
    return this.adapters.tips.transferToMobile(transferDetails);
  }

  // ==================
  // GOVERNMENT PAYMENTS (GEPG)
  // ==================

  /**
   * Get government service providers
   */
  async getGovernmentServices() {
    if (!this.adapters.gepg) {
      throw new Error('Government payments not available for this tenant');
    }
    return this.adapters.gepg.getServiceProviders();
  }

  /**
   * Lookup control number
   */
  async lookupControlNumber(controlNumber) {
    if (!this.adapters.gepg) {
      throw new Error('Government payments not available for this tenant');
    }
    return this.adapters.gepg.lookupBill(controlNumber);
  }

  /**
   * Pay government bill
   */
  async payGovernmentBill(paymentDetails) {
    if (!this.adapters.gepg) {
      throw new Error('Government payments not available for this tenant');
    }
    return this.adapters.gepg.payBill(paymentDetails);
  }

  /**
   * Verify GEPG receipt
   */
  async verifyReceipt(receiptNumber) {
    if (!this.adapters.gepg) {
      throw new Error('Government payments not available for this tenant');
    }
    return this.adapters.gepg.verifyReceipt(receiptNumber);
  }

  // ==================
  // TRANSACTION STATUS
  // ==================

  /**
   * Check transaction status
   */
  async checkTransactionStatus(reference, provider) {
    if (!this.adapters[provider]) {
      throw new Error(`Provider ${provider} not available`);
    }
    return this.adapters[provider].checkStatus(reference);
  }

  // ==================
  // HEALTH CHECK
  // ==================

  /**
   * Check health of all adapters
   */
  async healthCheck() {
    const results = {
      tenantId: this.tenantId,
      adapters: {},
      overall: 'healthy',
    };

    for (const [name, adapter] of Object.entries(this.adapters)) {
      try {
        results.adapters[name] = await adapter.healthCheck();
        if (results.adapters[name].status !== 'healthy') {
          results.overall = 'degraded';
        }
      } catch (error) {
        results.adapters[name] = {
          status: 'unhealthy',
          error: error.message,
        };
        results.overall = 'degraded';
      }
    }

    return results;
  }
}

// Cache of orchestrators by tenant
const orchestratorCache = new Map();

/**
 * Get or create a payment orchestrator for a tenant
 */
function getOrchestrator(tenantConfig) {
  if (!orchestratorCache.has(tenantConfig.id)) {
    orchestratorCache.set(
      tenantConfig.id,
      new PaymentOrchestrator(tenantConfig)
    );
  }
  return orchestratorCache.get(tenantConfig.id);
}

/**
 * Clear orchestrator cache (for config updates)
 */
function clearCache(tenantId) {
  if (tenantId) {
    orchestratorCache.delete(tenantId);
  } else {
    orchestratorCache.clear();
  }
}

module.exports = {
  PaymentOrchestrator,
  getOrchestrator,
  clearCache,
};
