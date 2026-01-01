const logger = require('../../api-gateway/src/utils/logger');

/**
 * Tenant Resolution Middleware
 * Extracts and validates tenant from request
 */
const tenantMiddleware = (TenantModel) => {
  // Cache tenants in memory (refresh every 5 minutes)
  let tenantCache = {};
  let cacheExpiry = 0;
  const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  const refreshCache = async () => {
    try {
      const tenants = await TenantModel.find({ active: true }).lean();
      tenantCache = {};
      tenants.forEach(t => {
        tenantCache[t.id] = t;
      });
      cacheExpiry = Date.now() + CACHE_TTL;
      logger.info('Tenant cache refreshed', { count: tenants.length });
    } catch (error) {
      logger.error('Failed to refresh tenant cache', { error: error.message });
    }
  };

  return async (req, res, next) => {
    try {
      // Refresh cache if expired
      if (Date.now() > cacheExpiry) {
        await refreshCache();
      }

      let tenantId = null;

      // Method 1: Subdomain (channel.miracore.app)
      const host = req.get('host') || '';
      const hostParts = host.split('.');
      if (hostParts.length >= 3) {
        const subdomain = hostParts[0].toLowerCase();
        if (subdomain !== 'www' && subdomain !== 'api' && subdomain !== 'admin') {
          tenantId = subdomain;
        }
      }

      // Method 2: X-Tenant-ID header
      if (!tenantId) {
        tenantId = req.get('X-Tenant-ID')?.toLowerCase();
      }

      // Method 3: Query param (development only)
      if (!tenantId && process.env.NODE_ENV === 'development') {
        tenantId = req.query.tenant?.toLowerCase();
      }

      // Method 4: From JWT token (for authenticated requests)
      if (!tenantId && req.user?.tenantId) {
        tenantId = req.user.tenantId;
      }

      if (!tenantId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'TENANT_REQUIRED',
            message: 'Tenant identification is required. Use subdomain or X-Tenant-ID header.',
          },
        });
      }

      // Get tenant from cache or database
      let tenant = tenantCache[tenantId];
      if (!tenant) {
        tenant = await TenantModel.findOne({ id: tenantId, active: true }).lean();
        if (tenant) {
          tenantCache[tenantId] = tenant;
        }
      }

      if (!tenant) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'TENANT_NOT_FOUND',
            message: 'Tenant not found or inactive.',
          },
        });
      }

      // Attach tenant to request
      req.tenant = tenant;
      req.tenantId = tenant.id;

      // Log tenant access
      logger.debug('Tenant resolved', { tenantId: tenant.id, path: req.path });

      next();
    } catch (error) {
      logger.error('Tenant middleware error', { error: error.message });
      next(error);
    }
  };
};

/**
 * Feature Gate Middleware Factory
 * Checks if a feature is enabled for the tenant
 */
const requireFeature = (...features) => {
  return (req, res, next) => {
    if (!req.tenant) {
      return res.status(500).json({
        success: false,
        error: { code: 'TENANT_NOT_SET', message: 'Tenant not resolved' },
      });
    }

    const missingFeatures = features.filter(f => !req.tenant.features?.[f]);
    
    if (missingFeatures.length > 0) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FEATURE_DISABLED',
          message: `This feature is not available for your organization.`,
          features: missingFeatures,
        },
      });
    }

    next();
  };
};

module.exports = {
  tenantMiddleware,
  requireFeature,
};
