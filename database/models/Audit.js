const mongoose = require('mongoose');

/**
 * Audit Schema
 * Logs all important actions for compliance and debugging
 */
const auditSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
  },
  action: {
    type: String,
    required: true,
    index: true,
  },
  data: mongoose.Schema.Types.Mixed,
  ip: String,
  userAgent: String,
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

// TTL index - keep audit logs for 2 years
auditSchema.index({ timestamp: 1 }, { expireAfterSeconds: 63072000 });

module.exports = mongoose.model('Audit', auditSchema);
