const rateLimit = require('express-rate-limit');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * General API Rate Limiter
 */
const generalLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  message: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Please try again later.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    logger.warn('Rate limit exceeded', { 
      ip: req.ip, 
      path: req.path,
      userId: req.user?.id 
    });
    res.status(429).json(options.message);
  },
});

/**
 * Auth Endpoints Rate Limiter (stricter)
 * Prevents brute force attacks on login
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 attempts
  message: {
    success: false,
    error: {
      code: 'TOO_MANY_LOGIN_ATTEMPTS',
      message: 'Too many login attempts. Please try again after 15 minutes.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful logins
  handler: (req, res, next, options) => {
    logger.warn('Auth rate limit exceeded', { 
      ip: req.ip, 
      username: req.body?.username 
    });
    res.status(429).json(options.message);
  },
});

/**
 * OTP Request Rate Limiter
 */
const otpLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 3, // 3 OTP requests per minute
  message: {
    success: false,
    error: {
      code: 'OTP_LIMIT_EXCEEDED',
      message: 'Too many OTP requests. Please wait before requesting another.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Transaction Rate Limiter
 */
const transactionLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 transactions per minute
  message: {
    success: false,
    error: {
      code: 'TRANSACTION_LIMIT_EXCEEDED',
      message: 'Too many transactions. Please slow down.',
    },
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || req.ip, // Rate limit by user ID
});

module.exports = {
  generalLimiter,
  authLimiter,
  otpLimiter,
  transactionLimiter,
};
