const mongoose = require('mongoose');

/**
 * Tenant Schema
 * Stores tenant configuration including branding, features, and integrations
 */
const tenantSchema = new mongoose.Schema({
  // Unique tenant identifier (used in subdomain)
  id: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: /^[a-z0-9-]+$/,
  },
  
  // Display name
  name: {
    type: String,
    required: true,
  },
  
  // Tenant type
  type: {
    type: String,
    enum: ['bank', 'microfinance', 'sacco', 'fintech'],
    required: true,
  },
  
  // Status
  active: {
    type: Boolean,
    default: true,
    index: true,
  },
  
  // Subscription tier (affects feature limits)
  tier: {
    type: String,
    enum: ['starter', 'professional', 'enterprise'],
    default: 'starter',
  },
  
  // Branding configuration
  branding: {
    appName: { type: String, default: 'MiraDigital' },
    tagline: String,
    primaryColor: { type: String, default: '#1E3A8A' },
    secondaryColor: { type: String, default: '#10B981' },
    accentColor: { type: String, default: '#F59E0B' },
    logoUrl: String,
    logoLightUrl: String, // For dark backgrounds
    faviconUrl: String,
    loginBackgroundUrl: String,
    splashScreenUrl: String, // For mobile app
  },
  
  // Feature flags
  features: {
    // Core features
    retailBanking: { type: Boolean, default: true },
    corporateBanking: { type: Boolean, default: false },
    loans: { type: Boolean, default: true },
    
    // Channels
    webPortal: { type: Boolean, default: true },
    mobileApp: { type: Boolean, default: true },
    ussd: { type: Boolean, default: false },
    
    // Payment features
    billPayments: { type: Boolean, default: false },
    tipsTransfer: { type: Boolean, default: false },
    gepg: { type: Boolean, default: false },
    
    // Card features
    cardManagement: { type: Boolean, default: false },
    virtualCards: { type: Boolean, default: false },
    tapToPay: { type: Boolean, default: false },
    onlinePayments: { type: Boolean, default: false },
    
    // Advanced features
    scheduledPayments: { type: Boolean, default: false },
    beneficiaryManagement: { type: Boolean, default: true },
    budgetTracking: { type: Boolean, default: false },
    savingsGoals: { type: Boolean, default: false },
    notifications: { type: Boolean, default: true },
  },
  
  // MIFOS/Fineract configuration
  mifos: {
    baseUrl: { type: String, required: true },
    tenantId: { type: String, required: true },
    username: { type: String, required: true },
    password: String, // Encrypted
    sslVerify: { type: Boolean, default: false },
  },
  
  // Payment provider integrations
  integrations: {
    // Selcom - Bill Payments
    selcom: {
      enabled: { type: Boolean, default: false },
      sandbox: { type: Boolean, default: true },
      apiKey: String,
      apiSecret: String,
      vendorId: String,
      callbackUrl: String,
    },
    
    // TIPS - Tanzania Instant Payment System
    tips: {
      enabled: { type: Boolean, default: false },
      sandbox: { type: Boolean, default: true },
      institutionCode: String,
      apiKey: String,
      apiSecret: String,
      callbackUrl: String,
    },
    
    // GEPG - Government Payments
    gepg: {
      enabled: { type: Boolean, default: false },
      sandbox: { type: Boolean, default: true },
      spCode: String,
      serviceCode: String,
      apiKey: String,
      privateKey: String, // For signing
      callbackUrl: String,
    },
    
    // VISA - Card Services
    visa: {
      enabled: { type: Boolean, default: false },
      sandbox: { type: Boolean, default: true },
      merchantId: String,
      apiKey: String,
      sharedSecret: String,
      certificatePath: String,
      privateKeyPath: String,
    },
    
    // SMS Gateway
    sms: {
      provider: { type: String, enum: ['infobip', 'africastalking', 'nexmo', 'twilio'] },
      apiKey: String,
      apiSecret: String,
      senderId: String,
    },
  },
  
  // Transaction limits
  limits: {
    // Transfer limits
    minTransferAmount: { type: Number, default: 1000 },
    maxTransferAmount: { type: Number, default: 10000000 },
    dailyTransferLimit: { type: Number, default: 50000000 },
    monthlyTransferLimit: { type: Number, default: 500000000 },
    
    // Bill payment limits
    maxBillPayment: { type: Number, default: 5000000 },
    
    // Card limits
    dailyCardLimit: { type: Number, default: 2000000 },
    onlinePaymentLimit: { type: Number, default: 1000000 },
    
    // Session limits
    sessionTimeout: { type: Number, default: 300 }, // 5 minutes
    maxLoginAttempts: { type: Number, default: 5 },
    lockoutDuration: { type: Number, default: 900 }, // 15 minutes
  },
  
  // Supported currencies
  currencies: [{
    code: { type: String, default: 'TZS' },
    name: { type: String, default: 'Tanzanian Shilling' },
    symbol: { type: String, default: 'TZS' },
    isDefault: { type: Boolean, default: true },
  }],
  
  // Contact information
  contact: {
    supportPhone: String,
    supportEmail: String,
    supportWhatsapp: String,
    headquarters: String,
    website: String,
  },
  
  // Compliance
  compliance: {
    license: String, // Banking license number
    regulatorId: String,
    kycRequired: { type: Boolean, default: true },
    amlEnabled: { type: Boolean, default: true },
  },
  
  // Metadata
  createdAt: { type: Date, default: Date.now },
  updatedAt: Date,
  createdBy: String,
});

// Update timestamp on save
tenantSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Indexes
tenantSchema.index({ active: 1, type: 1 });

module.exports = mongoose.model('Tenant', tenantSchema);
