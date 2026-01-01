const { authenticate, optionalAuth, retailOnly, corporateOnly, requirePermission } = require('./auth');
const { generalLimiter, authLimiter, otpLimiter, transactionLimiter } = require('./rateLimiter');
const { errorHandler, notFoundHandler, asyncHandler } = require('./errorHandler');

module.exports = {
  // Authentication
  authenticate,
  optionalAuth,
  retailOnly,
  corporateOnly,
  requirePermission,

  // Rate Limiting
  generalLimiter,
  authLimiter,
  otpLimiter,
  transactionLimiter,

  // Error Handling
  errorHandler,
  notFoundHandler,
  asyncHandler,
};
