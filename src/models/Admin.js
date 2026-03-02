/**
 * Admin Model with RBAC Support
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const config = require('../config');

// Permission constants
const PERMISSIONS = {
  // Product permissions
  PRODUCTS_VIEW: 'products:view',
  PRODUCTS_CREATE: 'products:create',
  PRODUCTS_UPDATE: 'products:update',
  PRODUCTS_DELETE: 'products:delete',
  
  // Category permissions
  CATEGORIES_VIEW: 'categories:view',
  CATEGORIES_CREATE: 'categories:create',
  CATEGORIES_UPDATE: 'categories:update',
  CATEGORIES_DELETE: 'categories:delete',
  
  // Order permissions
  ORDERS_VIEW: 'orders:view',
  ORDERS_UPDATE: 'orders:update',
  ORDERS_DELETE: 'orders:delete',
  
  // Customer permissions
  CUSTOMERS_VIEW: 'customers:view',
  CUSTOMERS_UPDATE: 'customers:update',
  CUSTOMERS_DELETE: 'customers:delete',
  
  // Coupon permissions
  COUPONS_VIEW: 'coupons:view',
  COUPONS_CREATE: 'coupons:create',
  COUPONS_UPDATE: 'coupons:update',
  COUPONS_DELETE: 'coupons:delete',
  
  // Stats permissions
  STATS_VIEW: 'stats:view',
  
  // Admin management
  ADMINS_VIEW: 'admins:view',
  ADMINS_CREATE: 'admins:create',
  ADMINS_UPDATE: 'admins:update',
  ADMINS_DELETE: 'admins:delete',
  
  // Audit logs
  AUDIT_LOGS_VIEW: 'audit_logs:view',
  
  // Settings
  SETTINGS_UPDATE: 'settings:update',
};

// Role-based permission mappings
const ROLE_PERMISSIONS = {
  superadmin: Object.values(PERMISSIONS),
  admin: [
    PERMISSIONS.PRODUCTS_VIEW,
    PERMISSIONS.PRODUCTS_CREATE,
    PERMISSIONS.PRODUCTS_UPDATE,
    PERMISSIONS.PRODUCTS_DELETE,
    PERMISSIONS.CATEGORIES_VIEW,
    PERMISSIONS.CATEGORIES_CREATE,
    PERMISSIONS.CATEGORIES_UPDATE,
    PERMISSIONS.CATEGORIES_DELETE,
    PERMISSIONS.ORDERS_VIEW,
    PERMISSIONS.ORDERS_UPDATE,
    PERMISSIONS.CUSTOMERS_VIEW,
    PERMISSIONS.CUSTOMERS_UPDATE,
    PERMISSIONS.COUPONS_VIEW,
    PERMISSIONS.COUPONS_CREATE,
    PERMISSIONS.COUPONS_UPDATE,
    PERMISSIONS.COUPONS_DELETE,
    PERMISSIONS.STATS_VIEW,
  ],
  manager: [
    PERMISSIONS.PRODUCTS_VIEW,
    PERMISSIONS.PRODUCTS_CREATE,
    PERMISSIONS.PRODUCTS_UPDATE,
    PERMISSIONS.CATEGORIES_VIEW,
    PERMISSIONS.CATEGORIES_CREATE,
    PERMISSIONS.CATEGORIES_UPDATE,
    PERMISSIONS.ORDERS_VIEW,
    PERMISSIONS.ORDERS_UPDATE,
    PERMISSIONS.CUSTOMERS_VIEW,
    PERMISSIONS.COUPONS_VIEW,
    PERMISSIONS.COUPONS_CREATE,
    PERMISSIONS.COUPONS_UPDATE,
    PERMISSIONS.STATS_VIEW,
  ],
  staff: [
    PERMISSIONS.PRODUCTS_VIEW,
    PERMISSIONS.CATEGORIES_VIEW,
    PERMISSIONS.ORDERS_VIEW,
    PERMISSIONS.ORDERS_UPDATE,
    PERMISSIONS.CUSTOMERS_VIEW,
    PERMISSIONS.STATS_VIEW,
  ],
};

const adminSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [30, 'Username cannot exceed 30 characters'],
    lowercase: true,
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false,
  },
  phone: {
    type: String,
    trim: true,
  },
  role: {
    type: String,
    enum: ['superadmin', 'admin', 'manager', 'staff'],
    default: 'admin',
  },
  permissions: {
    type: [String],
    default: function() {
      return ROLE_PERMISSIONS[this.role] || [];
    },
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  lastLogin: {
    type: Date,
  },
  passwordChangedAt: {
    type: Date,
  },
  refreshToken: {
    type: String,
    select: false,
  },
  deletedAt: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes - removed duplicates since unique: true already creates indexes
adminSchema.index({ role: 1 });
adminSchema.index({ isActive: 1 });
adminSchema.index({ deletedAt: 1 });

// Virtual for soft delete
adminSchema.virtual('isDeleted').get(function() {
  return this.deletedAt !== null;
});

// Pre-save middleware to hash password
adminSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  this.password = await bcrypt.hash(this.password, config.security.bcryptRounds);
  this.passwordChangedAt = new Date();
  next();
});

// Method to compare passwords
adminSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to check if password was changed after token issued
adminSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = Math.floor(this.passwordChangedAt.getTime() / 1000);
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

// Method to check if user has specific permission
adminSchema.methods.hasPermission = function(permission) {
  if (this.role === 'superadmin') return true;
  return this.permissions.includes(permission);
};

// Method to check if user has any of the permissions
adminSchema.methods.hasAnyPermission = function(permissions) {
  if (this.role === 'superadmin') return true;
  return permissions.some(permission => this.permissions.includes(permission));
};

// Static method to get role permissions
adminSchema.statics.getRolePermissions = function(role) {
  return ROLE_PERMISSIONS[role] || [];
};

// Soft delete
adminSchema.methods.softDelete = function() {
  this.deletedAt = new Date();
  this.isActive = false;
  return this.save();
};

// Restore soft deleted document
adminSchema.methods.restore = function() {
  this.deletedAt = null;
  this.isActive = true;
  return this.save();
};

const Admin = mongoose.model('Admin', adminSchema);

// Export constants and model
module.exports = { Admin, PERMISSIONS, ROLE_PERMISSIONS };
