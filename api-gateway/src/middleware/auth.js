const jwt = require('jsonwebtoken');
const config = require('../config');
const logger = require('../utils/logger');

/**
 * Authentication Middleware
 * Verifies JWT token and attaches user to request
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'No token provided. Please login.',
        },
      });
    }

    const token = authHeader.split(' ')[1];

    try {
      const decoded = jwt.verify(token, config.jwt.secret);
      
      // Attach user info to request
      req.user = {
        id: decoded.id,
        clientId: decoded.clientId,
        username: decoded.username,
        type: decoded.type, // 'retail' or 'corporate'
        permissions: decoded.permissions || [],
      };

      // Add token to request for potential refresh
      req.token = token;

      logger.debug('User authenticated', { userId: decoded.id, type: decoded.type });
      next();
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          error: {
            code: 'TOKEN_EXPIRED',
            message: 'Your session has expired. Please login again.',
          },
        });
      }

      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Invalid authentication token.',
        },
      });
    }
  } catch (error) {
    logger.error('Authentication error', { error: error.message });
    return res.status(500).json({
      success: false,
      error: {
        code: 'AUTH_ERROR',
        message: 'Authentication failed. Please try again.',
      },
    });
  }
};

/**
 * Optional Authentication
 * Attaches user if token exists, continues if not
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = jwt.verify(token, config.jwt.secret);
        req.user = {
          id: decoded.id,
          clientId: decoded.clientId,
          username: decoded.username,
          type: decoded.type,
          permissions: decoded.permissions || [],
        };
      } catch {
        // Token invalid, continue without user
        req.user = null;
      }
    }
    next();
  } catch (error) {
    next();
  }
};

/**
 * Retail Customer Only Middleware
 */
const retailOnly = (req, res, next) => {
  if (req.user?.type !== 'retail') {
    return res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'This feature is only available for retail customers.',
      },
    });
  }
  next();
};

/**
 * Corporate Customer Only Middleware
 */
const corporateOnly = (req, res, next) => {
  if (req.user?.type !== 'corporate') {
    return res.status(403).json({
      success: false,
      error: {
        code: 'FORBIDDEN',
        message: 'This feature is only available for corporate customers.',
      },
    });
  }
  next();
};

/**
 * Permission Check Middleware Factory
 */
const requirePermission = (...permissions) => {
  return (req, res, next) => {
    const userPermissions = req.user?.permissions || [];
    const hasPermission = permissions.some(p => userPermissions.includes(p));

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have permission to perform this action.',
        },
      });
    }
    next();
  };
};

module.exports = {
  authenticate,
  optionalAuth,
  retailOnly,
  corporateOnly,
  requirePermission,
};
