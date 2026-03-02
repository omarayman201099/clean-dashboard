/**
 * Customer Model
 */

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const config = require('../config');

const customerSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Username is required'],
    trim: true,
    minlength: [3, 'Username must be at least 3 characters'],
    maxlength: [50, 'Username cannot exceed 50 characters'],
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
  avatar: {
    type: String,
    default: null,
  },
  addresses: [{
    label: { type: String, default: 'Home' },
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: { type: String, default: 'Egypt' },
    isDefault: { type: Boolean, default: false },
  }],
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
customerSchema.index({ username: 1 });
customerSchema.index({ isActive: 1 });
customerSchema.index({ deletedAt: 1 });

// Virtual for soft delete
customerSchema.virtual('isDeleted').get(function() {
  return this.deletedAt !== null;
});

// Pre-save middleware to hash password
customerSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  this.password = await bcrypt.hash(this.password, config.security.bcryptRounds);
  this.passwordChangedAt = new Date();
  next();
});

// Method to compare passwords
customerSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Method to check if password was changed after token issued
customerSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = Math.floor(this.passwordChangedAt.getTime() / 1000);
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

// Soft delete
customerSchema.methods.softDelete = function() {
  this.deletedAt = new Date();
  this.isActive = false;
  return this.save();
};

// Restore soft deleted document
customerSchema.methods.restore = function() {
  this.deletedAt = null;
  this.isActive = true;
  return this.save();
};

// JSON transform
customerSchema.set('toJSON', {
  transform: function(doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    delete ret.password;
    delete ret.refreshToken;
    delete ret.passwordChangedAt;
    delete ret.deletedAt;
    return ret;
  },
});

const Customer = mongoose.model('Customer', customerSchema);

module.exports = Customer;
