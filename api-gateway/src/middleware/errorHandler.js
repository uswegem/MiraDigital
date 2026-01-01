const logger = require('../utils/logger');

/**
 * Error Handler Middleware
 * Catches all errors and returns consistent response
 */
const errorHandler = (err, req, res, next) => {
  // Log the error
  logger.error('Request error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    userId: req.user?.id,
    body: req.body,
  });

  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request data',
        details: err.details || err.message,
      },
    });
  }

  if (err.name === 'MongoError' || err.name === 'MongoServerError') {
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'DUPLICATE_ENTRY',
          message: 'A record with this information already exists.',
        },
      });
    }
  }

  if (err.isAxiosError) {
    // MIFOS API error
    const status = err.response?.status || 500;
    const message = err.response?.data?.defaultUserMessage || 
                    err.response?.data?.errors?.[0]?.defaultUserMessage ||
                    'External service error';

    return res.status(status).json({
      success: false,
      error: {
        code: 'MIFOS_ERROR',
        message,
        details: err.response?.data,
      },
    });
  }

  // Default error response
  const statusCode = err.statusCode || 500;
  const message = err.message || 'An unexpected error occurred';

  res.status(statusCode).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: statusCode === 500 ? 'An unexpected error occurred. Please try again.' : message,
    },
  });
};

/**
 * Not Found Handler
 */
const notFoundHandler = (req, res) => {
  logger.warn('Route not found', { 
    path: req.path, 
    method: req.method 
  });

  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`,
    },
  });
};

/**
 * Async Handler Wrapper
 * Wraps async route handlers to catch errors
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  errorHandler,
  notFoundHandler,
  asyncHandler,
};
