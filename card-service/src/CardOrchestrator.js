const VisaSDK = require('./VisaSDK');
const TokenService = require('./TokenService');
const TapToPayService = require('./TapToPayService');
const OnlinePaymentService = require('./OnlinePaymentService');
const logger = require('../../../api-gateway/src/utils/logger');

/**
 * Card Orchestrator
 * Coordinates all card services for a tenant
 * Provides unified interface for card operations
 */
class CardOrchestrator {
  constructor(tenantConfig, database) {
    this.tenantId = tenantConfig.id;
    this.config = tenantConfig.integrations?.visa || {};
    this.database = database;
    this.initialized = false;
    
    if (this.config.enabled) {
      this._initialize();
    }
  }

  _initialize() {
    // Initialize VISA SDK
    this.visaSDK = new VisaSDK(this.config, this.tenantId);
    
    // Initialize Token Service
    this.tokenService = new TokenService(
      {
        encryptionKey: this.config.tokenEncryptionKey || 
          process.env.TOKEN_ENCRYPTION_KEY,
      },
      this.database
    );
    
    // Initialize Tap-to-Pay Service
    this.tapToPayService = new TapToPayService(
      this.visaSDK,
      this.tokenService,
      {
        cardArtUrl: this.config.cardArtUrl,
      }
    );
    
    // Initialize Online Payment Service
    this.onlinePaymentService = new OnlinePaymentService(
      this.visaSDK,
      this.tokenService,
      {
        threeDSUrl: this.config.threeDSUrl,
        paymentPortalUrl: this.config.paymentPortalUrl,
      }
    );
    
    this.initialized = true;
    logger.info(`Card services initialized for tenant ${this.tenantId}`);
  }

  /**
   * Check if card services are available
   */
  isAvailable() {
    return this.initialized && this.config.enabled;
  }

  /**
   * Get available card features for this tenant
   */
  getAvailableFeatures() {
    if (!this.isAvailable()) {
      return [];
    }

    const features = ['CARD_TOKENIZATION', 'CARD_MANAGEMENT'];
    
    if (this.config.features?.tapToPay) {
      features.push('TAP_TO_PAY');
    }
    if (this.config.features?.onlinePayments) {
      features.push('ONLINE_PAYMENTS');
    }
    if (this.config.features?.pushToCard) {
      features.push('PUSH_TO_CARD');
    }
    if (this.config.features?.applePay) {
      features.push('APPLE_PAY');
    }
    if (this.config.features?.googlePay) {
      features.push('GOOGLE_PAY');
    }

    return features;
  }

  // ==================
  // CARD MANAGEMENT
  // ==================

  /**
   * Add a new card (tokenize and store)
   */
  async addCard({
    userId,
    cardNumber,
    expiryMonth,
    expiryYear,
    cvv,
    cardholderName,
    billingAddress,
    deviceId,
    isDefault = false,
  }) {
    this._checkAvailability();

    // Tokenize card with VISA
    const tokenResult = await this.visaSDK.tokenizeCard({
      cardNumber,
      expiryMonth,
      expiryYear,
      cvv,
      cardholderName,
      billingAddress,
    });

    // Store token securely
    const storedCard = await this.tokenService.storeToken({
      userId,
      tenantId: this.tenantId,
      token: tokenResult.token,
      tokenReferenceId: tokenResult.tokenReferenceId,
      panLastFour: tokenResult.panLastFour,
      cardBrand: tokenResult.cardBrand,
      expiryMonth,
      expiryYear,
      cardholderName,
      deviceId,
      isDefault,
    });

    logger.info('Card added successfully', {
      userId,
      tenantId: this.tenantId,
      cardId: storedCard.id,
    });

    return storedCard;
  }

  /**
   * Get user's saved cards
   */
  async getCards(userId) {
    this._checkAvailability();
    return this.tokenService.getUserCards(userId, this.tenantId);
  }

  /**
   * Remove a saved card
   */
  async removeCard(cardId, userId) {
    this._checkAvailability();

    // Get token reference to delete from VISA
    const tokenData = await this.tokenService.getTokenForTransaction(
      cardId,
      userId,
      this.tenantId
    );

    // Delete from VISA
    await this.visaSDK.deleteToken(tokenData.tokenReferenceId);

    // Delete locally
    await this.tokenService.deleteToken(cardId, userId, this.tenantId);

    return { success: true };
  }

  /**
   * Suspend a card
   */
  async suspendCard(cardId, userId, reason) {
    this._checkAvailability();

    const tokenData = await this.tokenService.getTokenForTransaction(
      cardId,
      userId,
      this.tenantId
    );

    await this.visaSDK.suspendToken(tokenData.tokenReferenceId, reason);
    await this.tokenService.suspendToken(cardId, userId, this.tenantId, reason);

    return { success: true, status: 'SUSPENDED' };
  }

  /**
   * Resume a suspended card
   */
  async resumeCard(cardId, userId) {
    this._checkAvailability();

    const tokenData = await this.tokenService.getTokenForTransaction(
      cardId,
      userId,
      this.tenantId
    );

    await this.visaSDK.resumeToken(tokenData.tokenReferenceId);
    await this.tokenService.resumeToken(cardId, userId, this.tenantId);

    return { success: true, status: 'ACTIVE' };
  }

  /**
   * Set card as default
   */
  async setDefaultCard(cardId, userId) {
    this._checkAvailability();
    return this.tokenService.setDefault(cardId, userId, this.tenantId);
  }

  // ==================
  // TAP-TO-PAY
  // ==================

  /**
   * Check device tap-to-pay capability
   */
  async checkTapToPayCapability(deviceInfo) {
    this._checkAvailability();
    this._checkFeature('TAP_TO_PAY');
    return this.tapToPayService.verifyDeviceCapability(deviceInfo);
  }

  /**
   * Bind device for tap-to-pay
   */
  async bindDeviceForTapToPay(cardId, userId, deviceInfo) {
    this._checkAvailability();
    this._checkFeature('TAP_TO_PAY');
    return this.tokenService.bindDevice(
      cardId,
      userId,
      this.tenantId,
      deviceInfo
    );
  }

  /**
   * Prepare tap-to-pay transaction
   */
  async prepareTapToPay(params) {
    this._checkAvailability();
    this._checkFeature('TAP_TO_PAY');
    return this.tapToPayService.prepareTransaction({
      ...params,
      tenantId: this.tenantId,
    });
  }

  /**
   * Process tap-to-pay result
   */
  async processTapToPayResult(params) {
    this._checkAvailability();
    this._checkFeature('TAP_TO_PAY');
    return this.tapToPayService.processTransactionResult({
      ...params,
      tenantId: this.tenantId,
    });
  }

  // ==================
  // ONLINE PAYMENTS
  // ==================

  /**
   * Process online payment
   */
  async processOnlinePayment(params) {
    this._checkAvailability();
    this._checkFeature('ONLINE_PAYMENTS');
    return this.onlinePaymentService.processPayment({
      ...params,
      tenantId: this.tenantId,
    });
  }

  /**
   * Complete 3DS authentication
   */
  async complete3DS(params) {
    this._checkAvailability();
    this._checkFeature('ONLINE_PAYMENTS');
    return this.onlinePaymentService.complete3DSAuthentication(params);
  }

  /**
   * Create recurring payment
   */
  async createRecurringPayment(params) {
    this._checkAvailability();
    this._checkFeature('ONLINE_PAYMENTS');
    return this.onlinePaymentService.createRecurringPayment({
      ...params,
      tenantId: this.tenantId,
    });
  }

  /**
   * Cancel recurring payment
   */
  async cancelRecurringPayment(subscriptionId, userId) {
    this._checkAvailability();
    return this.onlinePaymentService.cancelRecurringPayment(
      subscriptionId,
      userId,
      this.tenantId
    );
  }

  /**
   * Generate payment link
   */
  async generatePaymentLink(params) {
    this._checkAvailability();
    this._checkFeature('ONLINE_PAYMENTS');
    return this.onlinePaymentService.generatePaymentLink(params);
  }

  // ==================
  // PUSH TO CARD
  // ==================

  /**
   * Send money to a VISA card
   */
  async pushToCard(params) {
    this._checkAvailability();
    this._checkFeature('PUSH_TO_CARD');
    return this.visaSDK.pushToCard(params);
  }

  // ==================
  // WALLET INTEGRATION
  // ==================

  /**
   * Add card to Apple Pay
   */
  async addToApplePay(cardId, userId) {
    this._checkAvailability();
    this._checkFeature('APPLE_PAY');
    return this.tapToPayService.generateWalletPayload({
      cardId,
      userId,
      tenantId: this.tenantId,
      walletType: 'APPLE_PAY',
    });
  }

  /**
   * Add card to Google Pay
   */
  async addToGooglePay(cardId, userId) {
    this._checkAvailability();
    this._checkFeature('GOOGLE_PAY');
    return this.tapToPayService.generateWalletPayload({
      cardId,
      userId,
      tenantId: this.tenantId,
      walletType: 'GOOGLE_PAY',
    });
  }

  // ==================
  // HELPERS
  // ==================

  _checkAvailability() {
    if (!this.isAvailable()) {
      throw new Error('Card services not available for this tenant');
    }
  }

  _checkFeature(feature) {
    if (!this.getAvailableFeatures().includes(feature)) {
      throw new Error(`${feature} not enabled for this tenant`);
    }
  }

  /**
   * Health check
   */
  async healthCheck() {
    if (!this.isAvailable()) {
      return {
        status: 'disabled',
        tenantId: this.tenantId,
      };
    }

    const visaHealth = await this.visaSDK.healthCheck();

    return {
      status: visaHealth.status,
      tenantId: this.tenantId,
      features: this.getAvailableFeatures(),
      visa: visaHealth,
    };
  }
}

// Cache of orchestrators by tenant
const orchestratorCache = new Map();

/**
 * Get or create a card orchestrator for a tenant
 */
function getOrchestrator(tenantConfig, database) {
  if (!orchestratorCache.has(tenantConfig.id)) {
    orchestratorCache.set(
      tenantConfig.id,
      new CardOrchestrator(tenantConfig, database)
    );
  }
  return orchestratorCache.get(tenantConfig.id);
}

/**
 * Clear orchestrator cache
 */
function clearCache(tenantId) {
  if (tenantId) {
    orchestratorCache.delete(tenantId);
  } else {
    orchestratorCache.clear();
  }
}

module.exports = {
  CardOrchestrator,
  getOrchestrator,
  clearCache,
};
