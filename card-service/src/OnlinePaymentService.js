const crypto = require('crypto');
const logger = require('../../../api-gateway/src/utils/logger');

/**
 * Online Payment Service
 * Handles card-not-present (CNP) transactions for e-commerce
 * 
 * Features:
 * - 3D Secure authentication
 * - One-click payments with saved cards
 * - Recurring payment setup
 */
class OnlinePaymentService {
  constructor(visaSDK, tokenService, config) {
    this.visaSDK = visaSDK;
    this.tokenService = tokenService;
    this.config = config;
  }

  /**
   * Process online payment with tokenized card
   */
  async processPayment({
    cardId,
    userId,
    tenantId,
    amount,
    currency = 'TZS',
    merchantId,
    merchantName,
    orderId,
    description,
    customerIp,
    browserInfo,
    use3DS = true,
  }) {
    // Get token
    const tokenData = await this.tokenService.getTokenForTransaction(
      cardId,
      userId,
      tenantId
    );

    const transactionId = crypto.randomUUID();

    // Check if 3DS is required
    if (use3DS && this._requires3DS(amount, currency)) {
      return this._initiate3DSAuthentication({
        transactionId,
        tokenData,
        amount,
        currency,
        merchantId,
        merchantName,
        orderId,
        customerIp,
        browserInfo,
      });
    }

    // Process payment directly
    return this._processDirectPayment({
      transactionId,
      tokenData,
      amount,
      currency,
      merchantId,
      merchantName,
      orderId,
      description,
    });
  }

  /**
   * Check if 3DS is required based on amount or rules
   */
  _requires3DS(amount, currency) {
    // Tanzania regulations or merchant rules
    const thresholds = {
      TZS: 100000, // 100,000 TZS
      USD: 50,
      EUR: 50,
    };
    
    const threshold = thresholds[currency] || 0;
    return amount > threshold;
  }

  /**
   * Initiate 3D Secure authentication
   */
  async _initiate3DSAuthentication({
    transactionId,
    tokenData,
    amount,
    currency,
    merchantId,
    merchantName,
    orderId,
    customerIp,
    browserInfo,
  }) {
    // In production, integrate with VISA 3DS server or Arcot/Cardinal Commerce
    const authenticationRequest = {
      transactionId,
      amount,
      currency,
      cardToken: tokenData.token,
      merchantId,
      merchantName,
      threeDSVersion: '2.2.0',
      browserInfo: {
        acceptHeader: browserInfo?.acceptHeader || '*/*',
        userAgent: browserInfo?.userAgent || '',
        language: browserInfo?.language || 'en',
        colorDepth: browserInfo?.colorDepth || 24,
        screenHeight: browserInfo?.screenHeight || 1080,
        screenWidth: browserInfo?.screenWidth || 1920,
        timeZone: browserInfo?.timeZone || 180,
        javaEnabled: browserInfo?.javaEnabled || false,
        javascriptEnabled: true,
      },
      customerIp,
    };

    // Simulate 3DS initiation response
    const challengeUrl = `${this.config.threeDSUrl}/challenge/${transactionId}`;
    
    return {
      transactionId,
      requires3DS: true,
      threeDSStatus: 'CHALLENGE_REQUIRED',
      challengeUrl,
      challengeData: {
        acsUrl: challengeUrl,
        creq: Buffer.from(JSON.stringify({
          transactionId,
          amount,
          currency,
          merchantName,
        })).toString('base64'),
      },
      expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
    };
  }

  /**
   * Complete 3DS authentication after challenge
   */
  async complete3DSAuthentication({
    transactionId,
    authenticationResult,
    cres, // Challenge response from ACS
  }) {
    // Validate 3DS response
    // In production, verify signature and check with 3DS server
    
    if (authenticationResult?.status !== 'SUCCESS') {
      return {
        transactionId,
        success: false,
        status: 'AUTHENTICATION_FAILED',
        message: '3D Secure authentication failed',
      };
    }

    // Retrieve pending transaction and process
    // const pendingTx = await this.redis.get(`3ds:${transactionId}`);
    
    return {
      transactionId,
      success: true,
      status: 'AUTHENTICATED',
      authenticationValue: authenticationResult.cavv,
      eci: authenticationResult.eci,
      message: 'Authentication successful, proceed with payment',
    };
  }

  /**
   * Process payment directly (no 3DS)
   */
  async _processDirectPayment({
    transactionId,
    tokenData,
    amount,
    currency,
    merchantId,
    merchantName,
    orderId,
    description,
  }) {
    try {
      // In production, call VISA/CyberSource authorization API
      const authorizationResult = {
        success: true,
        authorizationCode: this._generateAuthCode(),
        responseCode: '00',
        avsResult: 'Y',
        cvvResult: 'M',
      };

      const transaction = {
        id: transactionId,
        type: 'ONLINE_PAYMENT',
        status: authorizationResult.success ? 'APPROVED' : 'DECLINED',
        amount,
        currency,
        merchantId,
        merchantName,
        orderId,
        description,
        cardLastFour: tokenData.panLastFour,
        cardBrand: tokenData.cardBrand,
        authorizationCode: authorizationResult.authorizationCode,
        responseCode: authorizationResult.responseCode,
        timestamp: new Date(),
      };

      logger.info('Online payment processed', {
        transactionId,
        status: transaction.status,
        amount,
        merchantId,
      });

      return {
        transactionId,
        success: authorizationResult.success,
        status: transaction.status,
        authorizationCode: transaction.authorizationCode,
        message: authorizationResult.success 
          ? 'Payment successful' 
          : 'Payment declined',
      };
    } catch (error) {
      logger.error('Online payment failed', {
        transactionId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Create recurring payment schedule
   */
  async createRecurringPayment({
    cardId,
    userId,
    tenantId,
    merchantId,
    merchantName,
    amount,
    currency = 'TZS',
    frequency, // DAILY, WEEKLY, MONTHLY, YEARLY
    startDate,
    endDate,
    description,
  }) {
    const subscriptionId = crypto.randomUUID();

    const subscription = {
      id: subscriptionId,
      cardId,
      userId,
      tenantId,
      merchantId,
      merchantName,
      amount,
      currency,
      frequency,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : null,
      description,
      status: 'ACTIVE',
      nextPaymentDate: new Date(startDate),
      paymentCount: 0,
      createdAt: new Date(),
    };

    // Store subscription
    // await this.db.collection('subscriptions').insertOne(subscription);

    logger.info('Recurring payment created', {
      subscriptionId,
      userId,
      merchantId,
      frequency,
    });

    return {
      subscriptionId,
      status: 'ACTIVE',
      nextPaymentDate: subscription.nextPaymentDate,
      frequency,
      amount,
      currency,
    };
  }

  /**
   * Cancel recurring payment
   */
  async cancelRecurringPayment(subscriptionId, userId, tenantId) {
    // Update subscription status
    // await this.db.collection('subscriptions').updateOne(
    //   { id: subscriptionId, userId, tenantId },
    //   { $set: { status: 'CANCELLED', cancelledAt: new Date() } }
    // );

    logger.info('Recurring payment cancelled', { subscriptionId, userId });

    return {
      subscriptionId,
      status: 'CANCELLED',
    };
  }

  /**
   * Generate one-time payment link
   */
  async generatePaymentLink({
    merchantId,
    merchantName,
    amount,
    currency = 'TZS',
    orderId,
    description,
    expiresIn = 24 * 60 * 60 * 1000, // 24 hours default
    callbackUrl,
  }) {
    const linkId = crypto.randomBytes(16).toString('hex');
    const expiresAt = new Date(Date.now() + expiresIn);

    const paymentLink = {
      id: linkId,
      merchantId,
      merchantName,
      amount,
      currency,
      orderId,
      description,
      expiresAt,
      callbackUrl,
      status: 'PENDING',
      createdAt: new Date(),
    };

    // Store payment link
    // await this.db.collection('paymentLinks').insertOne(paymentLink);

    const url = `${this.config.paymentPortalUrl}/pay/${linkId}`;

    return {
      linkId,
      url,
      amount,
      currency,
      expiresAt,
    };
  }

  /**
   * Generate authorization code
   */
  _generateAuthCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }
}

module.exports = OnlinePaymentService;
