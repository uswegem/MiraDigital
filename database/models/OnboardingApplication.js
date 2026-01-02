const mongoose = require('mongoose');

/**
 * Onboarding Application Schema
 * Stores customer self-registration applications
 */
const OnboardingApplicationSchema = new mongoose.Schema({
  // Tenant identification
  tenantId: {
    type: String,
    required: true,
    index: true,
  },

  // Application status
  status: {
    type: String,
    enum: [
      'DRAFT',
      'PHONE_VERIFIED',
      'PERSONAL_INFO_COMPLETE',
      'DOCUMENTS_UPLOADED',
      'SELFIE_VERIFIED',
      'ADDRESS_COMPLETE',
      'EMPLOYMENT_COMPLETE',
      'PRODUCT_SELECTED',
      'TERMS_ACCEPTED',
      'PENDING_VERIFICATION',
      'PENDING_APPROVAL',
      'APPROVED',
      'REJECTED',
      'EXPIRED',
    ],
    default: 'DRAFT',
    index: true,
  },

  // Current step for resuming
  currentStep: {
    type: Number,
    default: 1,
  },

  // Phone verification
  phone: {
    number: { type: String, required: true, index: true },
    countryCode: { type: String, default: '+255' },
    verified: { type: Boolean, default: false },
    verifiedAt: Date,
    otpAttempts: { type: Number, default: 0 },
    lastOtpSentAt: Date,
  },

  // Personal information
  personalInfo: {
    firstName: { type: String, trim: true },
    middleName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    dateOfBirth: Date,
    gender: { type: String, enum: ['MALE', 'FEMALE', 'OTHER'] },
    maritalStatus: { type: String, enum: ['SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED'] },
    nationality: { type: String, default: 'Tanzanian' },
    email: { type: String, lowercase: true, trim: true },
    mothersMaidenName: { type: String, trim: true },
  },

  // Identification documents
  identification: {
    type: {
      type: String,
      enum: ['NIDA', 'PASSPORT', 'VOTER_ID', 'DRIVERS_LICENSE'],
    },
    number: { type: String, trim: true },
    issueDate: Date,
    expiryDate: Date,
    issuingAuthority: String,

    // Document images
    documentFrontKey: String, // S3 key
    documentFrontUrl: String, // Signed URL (temporary)
    documentBackKey: String,
    documentBackUrl: String,

    // OCR extracted data
    ocrData: {
      extractedName: String,
      extractedDob: String,
      extractedNumber: String,
      confidence: Number,
    },

    // NIDA verification
    nidaVerification: {
      verified: { type: Boolean, default: false },
      verifiedAt: Date,
      matchScore: Number,
      nidaPhoto: String, // Base64 from NIDA
      response: mongoose.Schema.Types.Mixed,
    },
  },

  // Selfie and liveness
  selfie: {
    imageKey: String,
    imageUrl: String,

    // Liveness detection results
    liveness: {
      passed: { type: Boolean, default: false },
      score: Number,
      provider: String, // e.g., 'AWS_REKOGNITION', 'FACETEC'
      checkedAt: Date,
    },

    // Face matching with ID
    faceMatch: {
      matched: { type: Boolean, default: false },
      score: Number,
      threshold: { type: Number, default: 80 },
      checkedAt: Date,
    },
  },

  // Address information
  address: {
    // Physical address
    physical: {
      region: String,
      district: String,
      ward: String,
      street: String,
      houseNumber: String,
      landmark: String,
    },
    // Postal address
    postal: {
      poBox: String,
      postalCode: String,
      city: String,
    },
    // GPS coordinates (optional)
    coordinates: {
      latitude: Number,
      longitude: Number,
    },
    residenceDuration: String, // e.g., '0-1 years', '1-3 years', '3+ years'
    residenceType: { type: String, enum: ['OWNED', 'RENTED', 'FAMILY', 'EMPLOYER'] },
  },

  // Employment information
  employment: {
    status: {
      type: String,
      enum: ['EMPLOYED', 'SELF_EMPLOYED', 'BUSINESS_OWNER', 'STUDENT', 'RETIRED', 'UNEMPLOYED'],
    },
    // For employed
    employerName: String,
    employerAddress: String,
    employerPhone: String,
    jobTitle: String,
    employmentDate: Date,
    employeeId: String,

    // For self-employed/business
    businessName: String,
    businessType: String,
    businessRegistration: String,
    businessAddress: String,

    // Income
    monthlyIncome: {
      currency: { type: String, default: 'TZS' },
      amount: Number,
      range: String, // e.g., '0-500000', '500000-1000000', etc.
    },
    incomeSource: String,
  },

  // Next of kin
  nextOfKin: {
    fullName: String,
    relationship: String,
    phone: String,
    address: String,
  },

  // Selected product
  selectedProduct: {
    productId: Number,
    productName: String,
    productType: String, // 'SAVINGS', 'CURRENT', etc.
    currency: { type: String, default: 'TZS' },
  },

  // Terms and conditions
  termsAcceptance: {
    accepted: { type: Boolean, default: false },
    acceptedAt: Date,
    version: String,
    ipAddress: String,
    deviceInfo: String,
  },

  // Risk assessment
  riskAssessment: {
    score: Number,
    level: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH'] },
    flags: [String],
    sanctionsChecked: { type: Boolean, default: false },
    pepChecked: { type: Boolean, default: false }, // Politically Exposed Person
    assessedAt: Date,
  },

  // Device & session info
  deviceInfo: {
    deviceId: String,
    platform: String, // 'ios', 'android'
    osVersion: String,
    appVersion: String,
    ipAddress: String,
    userAgent: String,
  },

  // Submission
  submittedAt: Date,

  // Review
  review: {
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: Date,
    decision: { type: String, enum: ['APPROVED', 'REJECTED', 'REQUIRES_INFO'] },
    comments: String,
    rejectionReason: String,
    rejectionCategory: String,
  },

  // Mifos integration (after approval)
  mifos: {
    clientId: Number,
    accountId: Number,
    accountNumber: String,
    createdAt: Date,
    syncStatus: { type: String, enum: ['PENDING', 'SYNCED', 'FAILED'] },
    syncError: String,
  },

  // For resuming incomplete applications
  sessionToken: String,
  sessionExpiresAt: Date,

  // Expiry
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    index: true,
  },

}, {
  timestamps: true,
});

// Indexes
OnboardingApplicationSchema.index({ tenantId: 1, 'phone.number': 1 });
OnboardingApplicationSchema.index({ tenantId: 1, status: 1 });
OnboardingApplicationSchema.index({ tenantId: 1, 'identification.number': 1 });
OnboardingApplicationSchema.index({ sessionToken: 1 }, { sparse: true });
OnboardingApplicationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Virtual for full name
OnboardingApplicationSchema.virtual('fullName').get(function() {
  const parts = [
    this.personalInfo?.firstName,
    this.personalInfo?.middleName,
    this.personalInfo?.lastName,
  ].filter(Boolean);
  return parts.join(' ');
});

// Methods
OnboardingApplicationSchema.methods.canProceedToStep = function(step) {
  const stepRequirements = {
    2: this.phone.verified,
    3: this.personalInfo?.firstName && this.personalInfo?.lastName,
    4: this.identification?.documentFrontKey,
    5: this.selfie?.imageKey,
    6: this.address?.physical?.region,
    7: this.employment?.status,
    8: this.selectedProduct?.productId,
    9: this.termsAcceptance?.accepted,
  };

  // Check all previous steps are complete
  for (let i = 2; i <= step; i++) {
    if (!stepRequirements[i]) return false;
  }
  return true;
};

OnboardingApplicationSchema.methods.isComplete = function() {
  return (
    this.phone.verified &&
    this.personalInfo?.firstName &&
    this.personalInfo?.lastName &&
    this.personalInfo?.dateOfBirth &&
    this.identification?.number &&
    this.identification?.documentFrontKey &&
    this.selfie?.imageKey &&
    this.selfie?.liveness?.passed &&
    this.selfie?.faceMatch?.matched &&
    this.address?.physical?.region &&
    this.employment?.status &&
    this.selectedProduct?.productId &&
    this.termsAcceptance?.accepted
  );
};

OnboardingApplicationSchema.methods.canAutoApprove = function() {
  return (
    this.identification?.nidaVerification?.verified &&
    this.selfie?.faceMatch?.matched &&
    this.selfie?.faceMatch?.score >= 85 &&
    this.riskAssessment?.level === 'LOW' &&
    !this.riskAssessment?.flags?.length
  );
};

// Statics
OnboardingApplicationSchema.statics.findByPhone = function(tenantId, phoneNumber) {
  return this.findOne({
    tenantId,
    'phone.number': phoneNumber,
    status: { $nin: ['APPROVED', 'REJECTED', 'EXPIRED'] },
  }).sort({ createdAt: -1 });
};

OnboardingApplicationSchema.statics.findPendingApproval = function(tenantId) {
  return this.find({
    tenantId,
    status: 'PENDING_APPROVAL',
  }).sort({ submittedAt: 1 });
};

const OnboardingApplication = mongoose.model('OnboardingApplication', OnboardingApplicationSchema);

module.exports = OnboardingApplication;
