const mongoose = require('mongoose');

/**
 * User Schema
 * Stores retail and corporate customer information
 */
const userSchema = new mongoose.Schema({
  // Common fields
  type: {
    type: String,
    enum: ['retail', 'corporate'],
    required: true,
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'pending_verification', 'suspended'],
    default: 'active',
  },
  mifosClientId: {
    type: Number,
    index: true,
  },
  
  // Retail customer fields
  mobileNumber: {
    type: String,
    unique: true,
    sparse: true,
    index: true,
  },
  pin: String,
  fullName: String,
  dateOfBirth: Date,
  
  // Corporate customer fields
  companyName: String,
  registrationNumber: {
    type: String,
    unique: true,
    sparse: true,
  },
  email: {
    type: String,
    unique: true,
    sparse: true,
    lowercase: true,
  },
  password: String,
  adminName: String,
  adminPhone: String,
  
  // Security fields
  failedLoginAttempts: {
    type: Number,
    default: 0,
  },
  lockUntil: Date,
  lastLogin: Date,
  
  // Permissions (for corporate users)
  permissions: [{
    type: String,
  }],
  
  // Metadata
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: Date,
}, {
  timestamps: true,
});

// Indexes
userSchema.index({ type: 1, status: 1 });
userSchema.index({ mobileNumber: 1, type: 1 });
userSchema.index({ email: 1, type: 1 });

module.exports = mongoose.model('User', userSchema);
