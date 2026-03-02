/**
 * Audit Log Model - Tracks admin actions
 */

const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true,
  },
  action: {
    type: String,
    required: true,
    enum: [
      'LOGIN',
      'LOGOUT',
      'CREATE',
      'UPDATE',
      'DELETE',
      'VIEW',
      'EXPORT',
      'APPROVE',
      'REJECT',
      'CANCEL',
      'REFUND',
    ],
  },
  resource: {
    type: String,
    required: true,
    enum: [
      'PRODUCT',
      'CATEGORY',
      'ORDER',
      'CUSTOMER',
      'COUPON',
      'ADMIN',
      'SETTINGS',
      'SYSTEM',
    ],
  },
  resourceId: {
    type: mongoose.Schema.Types.ObjectId,
  },
  description: {
    type: String,
    maxlength: 1000,
  },
  oldValue: {
    type: mongoose.Schema.Types.Mixed,
  },
  newValue: {
    type: mongoose.Schema.Types.Mixed,
  },
  ipAddress: {
    type: String,
  },
  userAgent: {
    type: String,
  },
  status: {
    type: String,
    enum: ['SUCCESS', 'FAILED'],
    default: 'SUCCESS',
  },
  errorMessage: {
    type: String,
  },
}, {
  timestamps: true,
});

// Indexes - removed duplicates, keep compound indexes
auditLogSchema.index({ adminId: 1, createdAt: -1 });
auditLogSchema.index({ resource: 1, resourceId: 1 });
auditLogSchema.index({ createdAt: -1 });

// Static method to log action
auditLogSchema.statics.log = async function(data) {
  try {
    return await this.create(data);
  } catch (error) {
    console.error('Failed to create audit log:', error);
  }
};

// Static method to get recent logs
auditLogSchema.statics.getRecentLogs = async function(options = {}) {
  const { limit = 50, page = 1, adminId, action, resource } = options;
  const skip = (page - 1) * limit;
  
  const query = {};
  if (adminId) query.adminId = adminId;
  if (action) query.action = action;
  if (resource) query.resource = resource;
  
  const logs = await this.find(query)
    .populate('adminId', 'username email role')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
    
  const total = await this.countDocuments(query);
  
  return {
    logs,
    pagination: {
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
    },
  };
};

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = AuditLog;
