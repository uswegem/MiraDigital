const crypto = require('crypto');
const logger = require('../../../api-gateway/src/utils/logger');

/**
 * Token Storage Service
 * Manages encrypted storage and retrieval of card tokens
 * 
 * Features:
 * - AES-256-GCM encryption for tokens at rest
 * - Token lifecycle management
 * - Device binding for tap-to-pay
 */
class TokenService {
  constructor(config, database) {
    this.config = config;
    this.db = database;
    this.encryptionKey = Buffer.from(config.encryptionKey, 'hex');
    this.algorithm = 'aes-256-gcm';
  }

  /**
   * Encrypt sensitive data
   */
  _encrypt(data) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.encryptionKey, iv);
    
    const encrypted = Buffer.concat([
      cipher.update(JSON.stringify(data), 'utf8'),
      cipher.final(),
    ]);
    
    const authTag = cipher.getAuthTag();
    
    return {
      encrypted: encrypted.toString('base64'),
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
    };
  }

  /**
   * Decrypt sensitive data
   */
  _decrypt(encryptedData) {
    const decipher = crypto.createDecipheriv(
      this.algorithm,
      this.encryptionKey,
      Buffer.from(encryptedData.iv, 'base64')
    );
    
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'base64'));
    
    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedData.encrypted, 'base64')),
      decipher.final(),
    ]);
    
    return JSON.parse(decrypted.toString('utf8'));
  }

  /**
   * Store a new card token
   */
  async storeToken({
    userId,
    tenantId,
    token,
    tokenReferenceId,
    panLastFour,
    cardBrand,
    expiryMonth,
    expiryYear,
    cardholderName,
    deviceId,
    isDefault = false,
  }) {
    // Encrypt sensitive token data
    const encryptedToken = this._encrypt({
      token,
      tokenReferenceId,
    });

    const cardToken = {
      id: crypto.randomUUID(),
      userId,
      tenantId,
      encryptedToken: encryptedToken.encrypted,
      iv: encryptedToken.iv,
      authTag: encryptedToken.authTag,
      panLastFour,
      cardBrand,
      expiryMonth,
      expiryYear,
      cardholderName,
      isDefault,
      status: 'ACTIVE',
      deviceBindings: deviceId ? [deviceId] : [],
      createdAt: new Date(),
      updatedAt: new Date(),
      lastUsedAt: null,
    };

    // If setting as default, unset other defaults
    if (isDefault) {
      await this.db.collection('cardTokens').updateMany(
        { userId, tenantId, isDefault: true },
        { $set: { isDefault: false, updatedAt: new Date() } }
      );
    }

    await this.db.collection('cardTokens').insertOne(cardToken);

    logger.info('Card token stored', {
      userId,
      tenantId,
      tokenId: cardToken.id,
      panLastFour,
    });

    return {
      id: cardToken.id,
      panLastFour,
      cardBrand,
      expiryMonth,
      expiryYear,
      cardholderName,
      isDefault,
      status: 'ACTIVE',
    };
  }

  /**
   * Get user's stored cards
   */
  async getUserCards(userId, tenantId) {
    const cards = await this.db.collection('cardTokens')
      .find({
        userId,
        tenantId,
        status: { $in: ['ACTIVE', 'SUSPENDED'] },
      })
      .project({
        id: 1,
        panLastFour: 1,
        cardBrand: 1,
        expiryMonth: 1,
        expiryYear: 1,
        cardholderName: 1,
        isDefault: 1,
        status: 1,
        lastUsedAt: 1,
      })
      .sort({ isDefault: -1, lastUsedAt: -1 })
      .toArray();

    return cards;
  }

  /**
   * Get token for transaction
   */
  async getTokenForTransaction(cardId, userId, tenantId) {
    const card = await this.db.collection('cardTokens').findOne({
      id: cardId,
      userId,
      tenantId,
      status: 'ACTIVE',
    });

    if (!card) {
      throw new Error('Card not found or inactive');
    }

    // Decrypt token
    const tokenData = this._decrypt({
      encrypted: card.encryptedToken,
      iv: card.iv,
      authTag: card.authTag,
    });

    // Update last used
    await this.db.collection('cardTokens').updateOne(
      { id: cardId },
      { $set: { lastUsedAt: new Date() } }
    );

    return {
      token: tokenData.token,
      tokenReferenceId: tokenData.tokenReferenceId,
      panLastFour: card.panLastFour,
      cardBrand: card.cardBrand,
    };
  }

  /**
   * Bind device to card for tap-to-pay
   */
  async bindDevice(cardId, userId, tenantId, deviceInfo) {
    const deviceId = crypto
      .createHash('sha256')
      .update(`${deviceInfo.deviceId}:${deviceInfo.platform}:${userId}`)
      .digest('hex');

    await this.db.collection('cardTokens').updateOne(
      { id: cardId, userId, tenantId },
      {
        $addToSet: { deviceBindings: deviceId },
        $set: { updatedAt: new Date() },
      }
    );

    // Store device details separately
    await this.db.collection('deviceBindings').updateOne(
      { deviceId },
      {
        $set: {
          deviceId,
          userId,
          tenantId,
          cardId,
          platform: deviceInfo.platform, // ios, android
          deviceName: deviceInfo.deviceName,
          osVersion: deviceInfo.osVersion,
          appVersion: deviceInfo.appVersion,
          bindingTime: new Date(),
          lastActive: new Date(),
          nfcCapable: deviceInfo.nfcCapable || false,
        },
      },
      { upsert: true }
    );

    logger.info('Device bound to card', {
      cardId,
      userId,
      tenantId,
      platform: deviceInfo.platform,
    });

    return {
      success: true,
      deviceId,
      cardId,
    };
  }

  /**
   * Check if device is bound to card
   */
  async isDeviceBound(cardId, deviceId, userId, tenantId) {
    const card = await this.db.collection('cardTokens').findOne({
      id: cardId,
      userId,
      tenantId,
      deviceBindings: deviceId,
    });

    return !!card;
  }

  /**
   * Suspend a card token
   */
  async suspendToken(cardId, userId, tenantId, reason) {
    const result = await this.db.collection('cardTokens').updateOne(
      { id: cardId, userId, tenantId },
      {
        $set: {
          status: 'SUSPENDED',
          suspendedAt: new Date(),
          suspendReason: reason,
          updatedAt: new Date(),
        },
      }
    );

    if (result.modifiedCount === 0) {
      throw new Error('Card not found');
    }

    logger.info('Card token suspended', { cardId, userId, reason });

    return { success: true, status: 'SUSPENDED' };
  }

  /**
   * Resume a suspended card token
   */
  async resumeToken(cardId, userId, tenantId) {
    const result = await this.db.collection('cardTokens').updateOne(
      { id: cardId, userId, tenantId, status: 'SUSPENDED' },
      {
        $set: {
          status: 'ACTIVE',
          updatedAt: new Date(),
        },
        $unset: {
          suspendedAt: '',
          suspendReason: '',
        },
      }
    );

    if (result.modifiedCount === 0) {
      throw new Error('Card not found or not suspended');
    }

    logger.info('Card token resumed', { cardId, userId });

    return { success: true, status: 'ACTIVE' };
  }

  /**
   * Delete a card token
   */
  async deleteToken(cardId, userId, tenantId) {
    const result = await this.db.collection('cardTokens').updateOne(
      { id: cardId, userId, tenantId },
      {
        $set: {
          status: 'DELETED',
          deletedAt: new Date(),
          updatedAt: new Date(),
        },
      }
    );

    if (result.modifiedCount === 0) {
      throw new Error('Card not found');
    }

    // Remove device bindings
    await this.db.collection('deviceBindings').deleteMany({ cardId });

    logger.info('Card token deleted', { cardId, userId });

    return { success: true, status: 'DELETED' };
  }

  /**
   * Set card as default
   */
  async setDefault(cardId, userId, tenantId) {
    // Unset current default
    await this.db.collection('cardTokens').updateMany(
      { userId, tenantId, isDefault: true },
      { $set: { isDefault: false, updatedAt: new Date() } }
    );

    // Set new default
    const result = await this.db.collection('cardTokens').updateOne(
      { id: cardId, userId, tenantId, status: 'ACTIVE' },
      { $set: { isDefault: true, updatedAt: new Date() } }
    );

    if (result.modifiedCount === 0) {
      throw new Error('Card not found or inactive');
    }

    return { success: true, cardId, isDefault: true };
  }
}

module.exports = TokenService;
