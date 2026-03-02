/**
 * Coupon Model
 */

const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    uppercase: true,
    trim: true,
    unique: true,
  },
  description: {
    type: String,
    maxlength: 500,
    default: '',
  },
  discountType: {
    type: String,
    enum: ['percentage', 'fixed'],
    required: true,
  },
  discountValue: {
    type: Number,
    required: true,
    min: 0,
  },
  minOrderAmount: {
    type: Number,
    default: 0,
    min: 0,
  },
  maxDiscountAmount: {
    type: Number,
    min: 0,
  },
  usageLimit: {
    type: Number,
    min: 1,
  },
  usedCount: {
    type: Number,
    default: 0,
  },
  perUserLimit: {
    type: Number,
    default: 1,
    min: 1,
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  isStackable: {
    type: Boolean,
    default: false,
  },
  deletedAt: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
});

// Check if coupon is valid
couponSchema.methods.isValid = function() {
  if (!this.isActive) return false;
  const now = new Date();
  if (now < this.startDate || now > this.endDate) return false;
  if (this.usageLimit && this.usedCount >= this.usageLimit) return false;
  return true;
};

// Calculate discount amount
couponSchema.methods.calculateDiscount = function(orderAmount) {
  if (!this.isValid()) return 0;
  if (orderAmount < this.minOrderAmount) return 0;
  
  let discount = 0;
  if (this.discountType === 'percentage') {
    discount = (orderAmount * this.discountValue) / 100;
    if (this.maxDiscountAmount) {
      discount = Math.min(discount, this.maxDiscountAmount);
    }
  } else {
    discount = Math.min(this.discountValue, orderAmount);
  }
  
  return Math.floor(discount * 100) / 100;
};

// Use coupon
couponSchema.methods.use = function() {
  this.usedCount += 1;
  return this.save();
};

const Coupon = mongoose.model('Coupon', couponSchema);

module.exports = Coupon;
