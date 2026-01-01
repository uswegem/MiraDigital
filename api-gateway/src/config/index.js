require('dotenv').config();

module.exports = {
  // Server Configuration
  server: {
    port: parseInt(process.env.PORT) || 4000,
    host: process.env.HOST || '0.0.0.0',
    env: process.env.NODE_ENV || 'development',
  },

  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'default-secret-change-me',
    expiry: process.env.JWT_EXPIRY || '24h',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  },

  // MIFOS/Fineract Configuration
  mifos: {
    baseUrl: process.env.MIFOS_BASE_URL || 'https://135.181.33.13:8443/fineract-provider/api/v1',
    tenantId: process.env.MIFOS_TENANT_ID || 'zedone-uat',
    username: process.env.MIFOS_USERNAME || 'mifos',
    password: process.env.MIFOS_PASSWORD || 'password',
    sslVerify: process.env.MIFOS_SSL_VERIFY === 'true',
  },

  // MongoDB Configuration
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/miradigital',
    options: {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    },
  },

  // Redis Configuration
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
  },

  // Rate Limiting
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  },

  // OTP Configuration
  otp: {
    length: parseInt(process.env.OTP_LENGTH) || 6,
    expiryMinutes: parseInt(process.env.OTP_EXPIRY_MINUTES) || 5,
  },

  // SMS Gateway
  sms: {
    gatewayUrl: process.env.SMS_GATEWAY_URL,
    apiKey: process.env.SMS_API_KEY,
  },

  // Logging
  logging: {
    level: process.env.LOG_LEVEL || 'debug',
    file: process.env.LOG_FILE || 'logs/app.log',
  },

  // CORS
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    credentials: true,
  },
};
