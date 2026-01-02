const express = require('express');
const router = express.Router();
const { authLimiter, asyncHandler } = require('../middleware');

/**
 * Auth Routes
 * @param {AuthService} authService
 */
module.exports = (authService) => {
  
  /**
   * @route POST /auth/register/retail
   * @desc Register a new retail customer
   * @access Public
   */
  router.post('/register/retail', authLimiter, asyncHandler(async (req, res) => {
    const { mobileNumber, pin, fullName, email, dateOfBirth } = req.body;

    // Validate required fields
    if (!mobileNumber || !pin || !fullName) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Mobile number, PIN, and full name are required' },
      });
    }

    // Validate PIN format (4-6 digits)
    if (!/^\d{4,6}$/.test(pin)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'PIN must be 4-6 digits' },
      });
    }

    const result = await authService.registerRetail({ mobileNumber, pin, fullName, email, dateOfBirth });
    
    res.status(201).json({
      success: true,
      data: result,
    });
  }));

  /**
   * @route POST /auth/register/corporate
   * @desc Register a new corporate customer
   * @access Public
   */
  router.post('/register/corporate', authLimiter, asyncHandler(async (req, res) => {
    const { companyName, registrationNumber, email, password, adminName, adminPhone } = req.body;

    // Validate required fields
    if (!companyName || !registrationNumber || !email || !password) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Company name, registration number, email, and password are required' },
      });
    }

    const result = await authService.registerCorporate({ 
      companyName, registrationNumber, email, password, adminName, adminPhone 
    });
    
    res.status(201).json({
      success: true,
      data: result,
    });
  }));

  /**
   * @route POST /auth/login/retail
   * @desc Login retail customer with mobile and PIN
   * @access Public
   */
  router.post('/login/retail', authLimiter, asyncHandler(async (req, res) => {
    const { mobileNumber, pin } = req.body;

    if (!mobileNumber || !pin) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Mobile number and PIN are required' },
      });
    }

    const result = await authService.loginRetail({ mobileNumber, pin });
    
    res.json({
      success: true,
      data: result,
    });
  }));

  /**
   * @route POST /auth/login/corporate
   * @desc Login corporate customer with email and password
   * @access Public
   */
  router.post('/login/corporate', authLimiter, asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Email and password are required' },
      });
    }

    const result = await authService.loginCorporate({ email, password });
    
    res.json({
      success: true,
      data: result,
    });
  }));

  /**
   * @route POST /auth/login/pin
   * @desc Login with 4-digit PIN (Mobile Channel)
   * @access Public
   */
  router.post('/login/pin', authLimiter, asyncHandler(async (req, res) => {
    const { pin, useBiometric } = req.body;

    if (!pin) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'PIN is required' },
      });
    }

    // Validate PIN format (4 digits)
    if (!/^\d{4}$/.test(pin)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'PIN must be 4 digits' },
      });
    }

    const result = await authService.loginWithPin(pin, useBiometric, req.ip);
    
    res.json({
      success: true,
      token: result.token,
      refreshToken: result.refreshToken,
      user: result.user,
    });
  }));

  /**
   * @route POST /auth/login/biometric
   * @desc Login with biometric authentication (Fingerprint/Face ID)
   * @access Private (requires valid JWT token)
   */
  router.post('/login/biometric', asyncHandler(async (req, res) => {
    const { biometricType, timestamp } = req.body;
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: { code: 'UNAUTHORIZED', message: 'No token provided' },
      });
    }

    const token = authHeader.split(' ')[1];

    if (!biometricType || !['fingerprint', 'face'].includes(biometricType)) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Valid biometric type is required (fingerprint or face)' },
      });
    }

    const result = await authService.loginWithBiometric(token, biometricType, timestamp, req.ip);
    
    res.json({
      success: true,
      user: result.user,
      lastBiometricLogin: timestamp,
    });
  }));

  /**
   * @route POST /auth/refresh
   * @desc Refresh access token
   * @access Public
   */
  router.post('/refresh', asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Refresh token is required' },
      });
    }

    const result = await authService.refreshToken(refreshToken);
    
    res.json({
      success: true,
      data: result,
    });
  }));

  /**
   * @route POST /auth/logout
   * @desc Logout and invalidate refresh token
   * @access Public
   */
  router.post('/logout', asyncHandler(async (req, res) => {
    const { refreshToken } = req.body;
    
    const result = await authService.logout(refreshToken);
    
    res.json({
      success: true,
      data: result,
    });
  }));

  return router;
};
