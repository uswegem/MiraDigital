const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * Auth Service
 * Handles customer authentication and session management
 */
class AuthService {
  constructor(mifosClient, userModel, redisClient) {
    this.mifos = mifosClient;
    this.User = userModel;
    this.redis = redisClient;
  }

  /**
   * Register new retail customer
   * Creates: MIFOS Client + Savings Account + Sets mobile number as account alias
   */
  async registerRetail({ mobileNumber, pin, fullName, email, dateOfBirth }) {
    // Check if user already exists
    const existingUser = await this.User.findOne({ mobileNumber });
    if (existingUser) {
      throw { statusCode: 409, code: 'USER_EXISTS', message: 'An account with this mobile number already exists' };
    }

    // Validate mobile number format (Tanzania: +255XXXXXXXXX or 0XXXXXXXXX)
    const cleanMobile = mobileNumber.replace(/\s+/g, '');
    if (!/^(\+255|0)[67]\d{8}$/.test(cleanMobile)) {
      throw { statusCode: 400, code: 'INVALID_MOBILE', message: 'Invalid mobile number format' };
    }

    let mifosClient = null;
    let savingsAccount = null;

    try {
      // Step 1: Search for existing client in MIFOS
      const searchResult = await this.mifos.searchClients(mobileNumber);
      if (searchResult && searchResult.length > 0) {
        mifosClient = searchResult[0];
        logger.info('Found existing MIFOS client', { clientId: mifosClient.id, mobileNumber });
      }
    } catch (error) {
      logger.warn('Client not found in MIFOS, will create new', { mobileNumber });
    }

    // Step 2: Create MIFOS client if doesn't exist
    if (!mifosClient) {
      try {
        const nameParts = fullName.trim().split(' ');
        const clientData = {
          officeId: 1,
          firstname: nameParts[0],
          lastname: nameParts.slice(1).join(' ') || nameParts[0],
          mobileNo: mobileNumber,
          externalId: `DIGITAL-${mobileNumber}`,
          active: true,
          activationDate: this._formatDate(new Date()),
          locale: 'en',
          dateFormat: 'dd MMMM yyyy',
        };
        mifosClient = await this.mifos.createClient(clientData);
        logger.info('Created MIFOS client', { clientId: mifosClient.clientId || mifosClient.resourceId });
      } catch (error) {
        logger.error('Failed to create MIFOS client', { error: error.message });
        throw { statusCode: 500, code: 'REGISTRATION_FAILED', message: 'Failed to create banking account. Please try again.' };
      }
    }

    const clientId = mifosClient.clientId || mifosClient.resourceId || mifosClient.id;

    // Step 3: Create savings account for the client
    try {
      // Create savings account (productId: 1 is usually the default savings product)
      const savingsData = await this.mifos.createSavingsAccount(clientId, 1);
      const savingsAccountId = savingsData.savingsId || savingsData.resourceId;

      // Approve the savings account
      await this.mifos.approveSavingsAccount(savingsAccountId);

      // Activate the savings account
      await this.mifos.activateSavingsAccount(savingsAccountId);

      // Get full account details (including account number)
      savingsAccount = await this.mifos.getSavingsAccount(savingsAccountId);

      logger.info('Created and activated savings account', {
        clientId,
        accountId: savingsAccountId,
        accountNo: savingsAccount.accountNo,
      });
    } catch (error) {
      logger.error('Failed to create savings account', { error: error.message, clientId });
      // Don't fail registration if account creation fails - can be created later
      logger.warn('Continuing registration without savings account');
    }

    // Step 4: Hash PIN
    const hashedPin = await bcrypt.hash(pin, 12);

    // Step 5: Create user in local database
    const user = await this.User.create({
      mobileNumber,
      pin: hashedPin,
      fullName,
      email,
      dateOfBirth,
      type: 'retail',
      mifosClientId: clientId,
      savingsAccountId: savingsAccount?.id || null,
      accountNo: savingsAccount?.accountNo || null,
      accountAlias: mobileNumber, // Mobile number is the account alias
      status: 'active',
      createdAt: new Date(),
    });

    // Step 6: Generate tokens
    const tokens = this._generateTokens(user);

    logger.info('Retail customer registered successfully', {
      userId: user._id,
      mobileNumber,
      clientId,
      accountNo: savingsAccount?.accountNo,
    });

    return {
      user: this._sanitizeUser(user),
      accountNo: savingsAccount?.accountNo || 'Pending',
      accountAlias: mobileNumber,
      message: 'Registration successful! Your mobile number can be used to receive deposits.',
      ...tokens,
    };
  }

  /**
   * Register corporate customer
   */
  async registerCorporate({ companyName, registrationNumber, email, password, adminName, adminPhone }) {
    // Check if company already exists
    const existingUser = await this.User.findOne({ 
      $or: [{ email }, { registrationNumber }] 
    });
    if (existingUser) {
      throw { statusCode: 409, code: 'COMPANY_EXISTS', message: 'A company with this email or registration number already exists' };
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Create corporate user
    const user = await this.User.create({
      companyName,
      registrationNumber,
      email,
      password: hashedPassword,
      adminName,
      adminPhone,
      type: 'corporate',
      status: 'pending_verification',
      createdAt: new Date(),
    });

    logger.info('Corporate customer registered', { userId: user._id, companyName });

    return {
      user: this._sanitizeUser(user),
      message: 'Registration submitted. Please wait for verification.',
    };
  }

  /**
   * Login with mobile and PIN (retail)
   */
  async loginRetail({ mobileNumber, pin }) {
    const user = await this.User.findOne({ mobileNumber, type: 'retail' });
    if (!user) {
      throw { statusCode: 401, code: 'INVALID_CREDENTIALS', message: 'Invalid mobile number or PIN' };
    }

    if (user.status !== 'active') {
      throw { statusCode: 403, code: 'ACCOUNT_INACTIVE', message: 'Your account is not active' };
    }

    // Check if account is locked
    if (user.lockUntil && user.lockUntil > new Date()) {
      const remainingMinutes = Math.ceil((user.lockUntil - new Date()) / 60000);
      throw { 
        statusCode: 423, 
        code: 'ACCOUNT_LOCKED', 
        message: `Account locked. Try again in ${remainingMinutes} minutes.` 
      };
    }

    // Verify PIN
    const isValidPin = await bcrypt.compare(pin, user.pin);
    if (!isValidPin) {
      // Increment failed attempts
      await this._handleFailedLogin(user);
      throw { statusCode: 401, code: 'INVALID_CREDENTIALS', message: 'Invalid mobile number or PIN' };
    }

    // Reset failed attempts on successful login
    await this.User.updateOne(
      { _id: user._id },
      { $set: { failedLoginAttempts: 0, lockUntil: null, lastLogin: new Date() } }
    );

    // Generate tokens
    const tokens = this._generateTokens(user);

    logger.info('Retail customer logged in', { userId: user._id, mobileNumber });

    return {
      user: this._sanitizeUser(user),
      ...tokens,
    };
  }

  /**
   * Login with email and password (corporate)
   */
  async loginCorporate({ email, password }) {
    const user = await this.User.findOne({ email, type: 'corporate' });
    if (!user) {
      throw { statusCode: 401, code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' };
    }

    if (user.status !== 'active') {
      throw { statusCode: 403, code: 'ACCOUNT_INACTIVE', message: 'Your account is not active. Please contact support.' };
    }

    // Check if account is locked
    if (user.lockUntil && user.lockUntil > new Date()) {
      const remainingMinutes = Math.ceil((user.lockUntil - new Date()) / 60000);
      throw { 
        statusCode: 423, 
        code: 'ACCOUNT_LOCKED', 
        message: `Account locked. Try again in ${remainingMinutes} minutes.` 
      };
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      await this._handleFailedLogin(user);
      throw { statusCode: 401, code: 'INVALID_CREDENTIALS', message: 'Invalid email or password' };
    }

    // Reset failed attempts
    await this.User.updateOne(
      { _id: user._id },
      { $set: { failedLoginAttempts: 0, lockUntil: null, lastLogin: new Date() } }
    );

    // Generate tokens
    const tokens = this._generateTokens(user);

    logger.info('Corporate customer logged in', { userId: user._id, email });

    return {
      user: this._sanitizeUser(user),
      ...tokens,
    };
  }

  /**
   * Refresh access token
   */
  async refreshToken(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, config.jwt.secret);
      
      // Check if refresh token is blacklisted
      const isBlacklisted = await this.redis.get(`blacklist:${refreshToken}`);
      if (isBlacklisted) {
        throw { statusCode: 401, code: 'TOKEN_REVOKED', message: 'Token has been revoked' };
      }

      const user = await this.User.findById(decoded.id);
      if (!user || user.status !== 'active') {
        throw { statusCode: 401, code: 'INVALID_TOKEN', message: 'Invalid refresh token' };
      }

      // Generate new access token
      const accessToken = this._generateAccessToken(user);

      return { accessToken };
    } catch (error) {
      if (error.statusCode) throw error;
      throw { statusCode: 401, code: 'INVALID_TOKEN', message: 'Invalid refresh token' };
    }
  }

  /**
   * Logout - blacklist the refresh token
   */
  async logout(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, config.jwt.secret);
      const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);
      
      // Blacklist the refresh token
      await this.redis.setex(`blacklist:${refreshToken}`, expiresIn, 'true');
      
      return { message: 'Logged out successfully' };
    } catch {
      return { message: 'Logged out successfully' };
    }
  }

  /**
   * Request OTP for transaction verification
   */
  async requestOTP(userId, purpose = 'transaction') {
    const user = await this.User.findById(userId);
    if (!user) {
      throw { statusCode: 404, code: 'USER_NOT_FOUND', message: 'User not found' };
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Store OTP in Redis with expiry
    const otpKey = `otp:${userId}:${purpose}`;
    await this.redis.setex(otpKey, config.otp.expiryMinutes * 60, otp);

    // TODO: Send OTP via SMS
    logger.info('OTP generated', { userId, purpose, otp: '******' });

    // In development, return OTP for testing
    if (config.server.env === 'development') {
      return { message: 'OTP sent', otp }; // Remove in production!
    }

    return { message: 'OTP sent to your registered mobile number' };
  }

  /**
   * Verify OTP
   */
  async verifyOTP(userId, purpose, otp) {
    const otpKey = `otp:${userId}:${purpose}`;
    const storedOtp = await this.redis.get(otpKey);

    if (!storedOtp) {
      throw { statusCode: 400, code: 'OTP_EXPIRED', message: 'OTP has expired. Please request a new one.' };
    }

    if (storedOtp !== otp) {
      throw { statusCode: 400, code: 'INVALID_OTP', message: 'Invalid OTP' };
    }

    // Delete OTP after successful verification
    await this.redis.del(otpKey);

    return { verified: true };
  }

  /**
   * Login with PIN (Mobile Channel)
   */
  async loginWithPin(pin, useBiometric, ipAddress) {
    // Find user by PIN
    const users = await this.User.find({ type: 'retail', status: 'active' });
    let user = null;

    for (const u of users) {
      if (u.pin && await bcrypt.compare(pin, u.pin)) {
        user = u;
        break;
      }
    }

    if (!user) {
      logger.warn('Failed PIN login attempt', { pin: '****', ipAddress });
      throw { statusCode: 401, code: 'INVALID_PIN', message: 'Incorrect PIN' };
    }

    // Check if account is locked
    if (user.lockUntil && user.lockUntil > new Date()) {
      const remainingMinutes = Math.ceil((user.lockUntil - new Date()) / 60000);
      throw { 
        statusCode: 423, 
        code: 'ACCOUNT_LOCKED', 
        message: `Account locked due to too many failed attempts. Try again in ${remainingMinutes} minutes.` 
      };
    }

    // Reset failed attempts on successful login
    await this.User.updateOne(
      { _id: user._id },
      { 
        $set: { 
          failedLoginAttempts: 0, 
          lockUntil: null, 
          lastLogin: new Date(),
          biometricEnabled: useBiometric || user.biometricEnabled || false,
        } 
      }
    );

    // Generate tokens
    const tokens = this._generateTokens(user);

    // Log authentication event
    logger.info('PIN login successful', { 
      userId: user._id, 
      mobileNumber: user.mobileNumber,
      ipAddress,
      biometricEnabled: useBiometric,
    });

    return {
      user: this._sanitizeUser(user),
      token: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  /**
   * Login with biometric (Fingerprint/Face ID)
   */
  async loginWithBiometric(token, biometricType, timestamp, ipAddress) {
    try {
      // Verify JWT token
      const decoded = jwt.verify(token, config.jwt.secret);
      
      // Get user
      const user = await this.User.findById(decoded.id);
      if (!user) {
        throw { statusCode: 404, code: 'USER_NOT_FOUND', message: 'User not found' };
      }

      // Check if account is active
      if (user.status !== 'active') {
        throw { statusCode: 403, code: 'ACCOUNT_INACTIVE', message: 'Your account is not active' };
      }

      // Check if biometric is enabled for this user
      if (!user.biometricEnabled) {
        throw { statusCode: 403, code: 'BIOMETRIC_DISABLED', message: 'Biometric authentication is not enabled for your account' };
      }

      // Update last biometric login
      await this.User.updateOne(
        { _id: user._id },
        { 
          $set: { 
            lastBiometricLogin: new Date(timestamp),
            lastBiometricType: biometricType,
            lastLogin: new Date(),
          } 
        }
      );

      // Log biometric authentication event
      logger.info('Biometric login successful', { 
        userId: user._id, 
        mobileNumber: user.mobileNumber,
        biometricType,
        timestamp,
        ipAddress,
      });

      return {
        user: this._sanitizeUser(user),
      };
    } catch (error) {
      if (error.statusCode) throw error;
      logger.error('Biometric login failed', { error: error.message, ipAddress });
      throw { statusCode: 401, code: 'BIOMETRIC_AUTH_FAILED', message: 'Biometric authentication failed' };
    }
  }

  /**
   * Change PIN (retail)
   */
  async changePin(userId, oldPin, newPin) {
    const user = await this.User.findById(userId);
    if (!user) {
      throw { statusCode: 404, code: 'USER_NOT_FOUND', message: 'User not found' };
    }

    // Verify old PIN
    const isValidPin = await bcrypt.compare(oldPin, user.pin);
    if (!isValidPin) {
      throw { statusCode: 401, code: 'INVALID_PIN', message: 'Current PIN is incorrect' };
    }

    // Hash and save new PIN
    const hashedPin = await bcrypt.hash(newPin, 12);
    await this.User.updateOne({ _id: userId }, { $set: { pin: hashedPin } });

    logger.info('PIN changed', { userId });

    return { message: 'PIN changed successfully' };
  }

  /**
   * Change password (corporate)
   */
  async changePassword(userId, oldPassword, newPassword) {
    const user = await this.User.findById(userId);
    if (!user) {
      throw { statusCode: 404, code: 'USER_NOT_FOUND', message: 'User not found' };
    }

    // Verify old password
    const isValidPassword = await bcrypt.compare(oldPassword, user.password);
    if (!isValidPassword) {
      throw { statusCode: 401, code: 'INVALID_PASSWORD', message: 'Current password is incorrect' };
    }

    // Hash and save new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await this.User.updateOne({ _id: userId }, { $set: { password: hashedPassword } });

    logger.info('Password changed', { userId });

    return { message: 'Password changed successfully' };
  }

  // =====================
  // HELPER METHODS
  // =====================

  _generateTokens(user) {
    const accessToken = this._generateAccessToken(user);
    const refreshToken = jwt.sign(
      { id: user._id, type: user.type },
      config.jwt.secret,
      { expiresIn: config.jwt.refreshExpiry }
    );
    return { accessToken, refreshToken };
  }

  _generateAccessToken(user) {
    return jwt.sign(
      {
        id: user._id,
        clientId: user.mifosClientId,
        username: user.mobileNumber || user.email,
        type: user.type,
        permissions: user.permissions || [],
      },
      config.jwt.secret,
      { expiresIn: config.jwt.expiry }
    );
  }

  _sanitizeUser(user) {
    const { pin, password, ...sanitized } = user.toObject ? user.toObject() : user;
    return sanitized;
  }

  async _handleFailedLogin(user) {
    const failedAttempts = (user.failedLoginAttempts || 0) + 1;
    const maxAttempts = 5;
    const lockDuration = 15 * 60 * 1000; // 15 minutes

    const update = { failedLoginAttempts: failedAttempts };
    
    if (failedAttempts >= maxAttempts) {
      update.lockUntil = new Date(Date.now() + lockDuration);
      logger.warn('Account locked due to failed attempts', { userId: user._id });
    }

    await this.User.updateOne({ _id: user._id }, { $set: update });
  }

  _formatDate(date) {
    const months = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    const d = new Date(date);
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  }
}

module.exports = AuthService;
