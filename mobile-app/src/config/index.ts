// API Configuration for MiraDigital Mobile App
const API_CONFIG = {
  development: {
    baseUrl: 'http://localhost:4000/api/v1',
    wsUrl: 'ws://localhost:4000',
  },
  staging: {
    baseUrl: 'https://api.staging.miracore.app/api/v1',
    wsUrl: 'wss://api.staging.miracore.app',
  },
  production: {
    baseUrl: 'https://api.miracore.app/api/v1',
    wsUrl: 'wss://api.miracore.app',
  },
};

const APP_CONFIG = {
  // App Information
  appName: 'MiraDigital',
  version: '1.0.0',
  buildNumber: 1,

  // Session & Security
  sessionTimeout: 5 * 60 * 1000, // 5 minutes
  inactivityWarning: 60 * 1000, // 1 minute warning
  maxPinAttempts: 3,
  biometricEnabled: true,

  // OTP Settings
  otpLength: 6,
  otpTimeout: 120, // seconds
  resendOtpDelay: 30, // seconds

  // Transaction Limits (can be overridden by tenant config)
  defaultLimits: {
    dailyTransfer: 5000000, // TZS
    perTransaction: 1000000,
    dailyBillPayment: 2000000,
  },

  // Pagination
  defaultPageSize: 20,

  // Cache TTL
  cacheTTL: {
    balance: 30 * 1000, // 30 seconds
    transactions: 60 * 1000, // 1 minute
    billers: 24 * 60 * 60 * 1000, // 24 hours
  },
};

const getApiConfig = (environment = __DEV__ ? 'development' : 'production') => {
  return API_CONFIG[environment] || API_CONFIG.production;
};

export { API_CONFIG, APP_CONFIG, getApiConfig };
