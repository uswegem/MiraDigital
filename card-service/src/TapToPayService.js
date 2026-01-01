const crypto = require('crypto');
const logger = require('../../../api-gateway/src/utils/logger');

/**
 * Tap-to-Pay Service
 * Handles NFC-based contactless payments using tokenized cards
 * 
 * Features:
 * - Generate payment cryptograms for NFC
 * - Transaction pre-authorization
 * - Device attestation
 */
class TapToPayService {
  constructor(visaSDK, tokenService, config) {
    this.visaSDK = visaSDK;
    this.tokenService = tokenService;
    this.config = config;
  }

  /**
   * Verify device can perform tap-to-pay
   */
  async verifyDeviceCapability(deviceInfo) {
    const requirements = {
      ios: {
        minVersion: '15.0',
        requiresSecureEnclave: true,
      },
      android: {
        minVersion: '9.0',
        requiresHCE: true, // Host Card Emulation
        requiresTEE: true, // Trusted Execution Environment
      },
    };

    const platform = deviceInfo.platform?.toLowerCase();
    const reqs = requirements[platform];

    if (!reqs) {
      return {
        capable: false,
        reason: 'Unsupported platform',
      };
    }

    // Check NFC capability
    if (!deviceInfo.nfcCapable) {
      return {
        capable: false,
        reason: 'Device does not support NFC',
      };
    }

    // Version check
    const deviceVersion = parseFloat(deviceInfo.osVersion);
    const minVersion = parseFloat(reqs.minVersion);

    if (deviceVersion < minVersion) {
      return {
        capable: false,
        reason: `Requires ${platform === 'ios' ? 'iOS' : 'Android'} ${reqs.minVersion} or higher`,
      };
    }

    // Android-specific checks
    if (platform === 'android') {
      if (reqs.requiresHCE && !deviceInfo.hceSupported) {
        return {
          capable: false,
          reason: 'Device does not support Host Card Emulation',
        };
      }
    }

    return {
      capable: true,
      platform,
      features: {
        nfc: true,
        hce: platform === 'android',
        secureElement: platform === 'ios',
      },
    };
  }

  /**
   * Prepare card for tap-to-pay transaction
   * Returns encrypted payment data for the device
   */
  async prepareTransaction({
    cardId,
    userId,
    tenantId,
    deviceId,
    amount,
    currency = 'TZS',
    merchantId,
    merchantName,
    merchantCategoryCode,
  }) {
    // Verify device is bound to card
    const isBound = await this.tokenService.isDeviceBound(
      cardId,
      deviceId,
      userId,
      tenantId
    );

    if (!isBound) {
      throw new Error('Device not authorized for this card');
    }

    // Get token for transaction
    const tokenData = await this.tokenService.getTokenForTransaction(
      cardId,
      userId,
      tenantId
    );

    // Generate cryptogram from VISA
    const cryptogram = await this.visaSDK.generateCryptogram(
      tokenData.tokenReferenceId,
      {
        type: 'CONTACTLESS',
        amount,
        currency: this._getCurrencyCode(currency),
        merchantId,
        mcc: merchantCategoryCode || '5411',
        deviceId,
      }
    );

    // Create transaction session
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes

    // Store session (in production, use Redis with TTL)
    const session = {
      sessionId,
      cardId,
      userId,
      tenantId,
      deviceId,
      amount,
      currency,
      merchantId,
      merchantName,
      cryptogram: cryptogram.cryptogram,
      expiresAt,
      status: 'PENDING',
    };

    logger.info('Tap-to-pay session created', {
      sessionId,
      cardId,
      merchantId,
      amount,
    });

    return {
      sessionId,
      paymentData: {
        token: tokenData.token,
        cryptogram: cryptogram.cryptogram,
        cryptogramType: cryptogram.cryptogramType,
        panLastFour: tokenData.panLastFour,
        cardBrand: tokenData.cardBrand,
      },
      expiresAt,
      transaction: {
        amount,
        currency,
        merchantName,
      },
    };
  }

  /**
   * Process tap-to-pay result from device
   */
  async processTransactionResult({
    sessionId,
    userId,
    tenantId,
    transactionResult,
    terminalData,
  }) {
    // In production, retrieve session from Redis
    // const session = await this.redis.get(`tap:session:${sessionId}`);
    
    const transaction = {
      id: crypto.randomUUID(),
      sessionId,
      userId,
      tenantId,
      type: 'TAP_TO_PAY',
      amount: transactionResult.amount,
      currency: transactionResult.currency,
      merchantId: terminalData.merchantId,
      merchantName: terminalData.merchantName,
      terminalId: terminalData.terminalId,
      authorizationCode: transactionResult.authorizationCode,
      responseCode: transactionResult.responseCode,
      status: this._mapResponseCode(transactionResult.responseCode),
      timestamp: new Date(),
      deviceInfo: {
        platform: terminalData.platform,
        posEntryMode: 'CONTACTLESS',
      },
    };

    // Store transaction
    // await this.db.collection('transactions').insertOne(transaction);

    logger.info('Tap-to-pay transaction processed', {
      transactionId: transaction.id,
      status: transaction.status,
      amount: transaction.amount,
    });

    return {
      transactionId: transaction.id,
      status: transaction.status,
      authorizationCode: transaction.authorizationCode,
      message: this._getStatusMessage(transaction.status),
    };
  }

  /**
   * Generate Apple Pay / Google Pay payload
   */
  async generateWalletPayload({
    cardId,
    userId,
    tenantId,
    walletType, // APPLE_PAY, GOOGLE_PAY
  }) {
    const tokenData = await this.tokenService.getTokenForTransaction(
      cardId,
      userId,
      tenantId
    );

    if (walletType === 'APPLE_PAY') {
      return this._generateApplePayPayload(tokenData);
    } else if (walletType === 'GOOGLE_PAY') {
      return this._generateGooglePayPayload(tokenData);
    }

    throw new Error('Unsupported wallet type');
  }

  /**
   * Generate Apple Pay provisioning data
   */
  _generateApplePayPayload(tokenData) {
    return {
      walletType: 'APPLE_PAY',
      provisioningData: {
        encryptedPassData: Buffer.from(JSON.stringify({
          token: tokenData.token,
          tokenReferenceId: tokenData.tokenReferenceId,
          cardBrand: tokenData.cardBrand,
        })).toString('base64'),
        activationData: crypto.randomBytes(32).toString('base64'),
        ephemeralPublicKey: crypto.randomBytes(65).toString('base64'),
      },
      cardDetails: {
        lastFour: tokenData.panLastFour,
        cardBrand: tokenData.cardBrand,
        cardArt: this.config.cardArtUrl,
      },
    };
  }

  /**
   * Generate Google Pay provisioning data
   */
  _generateGooglePayPayload(tokenData) {
    return {
      walletType: 'GOOGLE_PAY',
      provisioningData: {
        opaquePaymentCard: Buffer.from(JSON.stringify({
          token: tokenData.token,
          tokenReferenceId: tokenData.tokenReferenceId,
        })).toString('base64'),
        userAddress: {},
        displayName: `VISA •••• ${tokenData.panLastFour}`,
      },
      cardDetails: {
        lastFour: tokenData.panLastFour,
        cardBrand: tokenData.cardBrand,
        cardNetwork: 'VISA',
      },
    };
  }

  /**
   * Map ISO currency code
   */
  _getCurrencyCode(currency) {
    const codes = {
      TZS: '834',
      USD: '840',
      EUR: '978',
      GBP: '826',
      KES: '404',
    };
    return codes[currency] || currency;
  }

  /**
   * Map response code to status
   */
  _mapResponseCode(code) {
    if (code === '00' || code === '10' || code === '11') {
      return 'APPROVED';
    } else if (code === '01' || code === '02') {
      return 'REFER';
    } else if (code === '51') {
      return 'INSUFFICIENT_FUNDS';
    } else if (code === '54' || code === '55') {
      return 'EXPIRED_OR_INVALID';
    } else if (code === '91') {
      return 'ISSUER_UNAVAILABLE';
    }
    return 'DECLINED';
  }

  /**
   * Get user-friendly status message
   */
  _getStatusMessage(status) {
    const messages = {
      APPROVED: 'Payment successful',
      DECLINED: 'Payment declined',
      REFER: 'Please contact your bank',
      INSUFFICIENT_FUNDS: 'Insufficient funds',
      EXPIRED_OR_INVALID: 'Card expired or invalid',
      ISSUER_UNAVAILABLE: 'Bank temporarily unavailable',
    };
    return messages[status] || 'Transaction could not be processed';
  }
}

module.exports = TapToPayService;
