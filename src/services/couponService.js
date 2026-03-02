/**
 * Coupon Service
 * Handles coupon validation and calculations
 */

const Coupon = require('../models/Coupon');
const Order = require('../models/Order');
const ApiError = require('../utils/ApiError');

const couponService = {
  /**
   * Validate a coupon code
   * @param {string} code - Coupon code
   * @param {string} customerId - Customer ID
   * @param {number} orderTotal - Total order amount
   * @returns {Object} Validation result
   */
  validateCoupon: async (code, customerId, orderTotal) => {
    try {
      // Find coupon (case insensitive)
      const coupon = await Coupon.findOne({
        code: { $regex: new RegExp(`^${code}$`, 'i') },
        isDeleted: false,
        isActive: true,
      });

      if (!coupon) {
        return { valid: false, message: 'Invalid coupon code' };
      }

      // Check expiry
      if (coupon.expiresAt && new Date(coupon.expiresAt) < new Date()) {
        return { valid: false, message: 'Coupon has expired' };
      }

      // Check if coupon has started
      if (coupon.startDate && new Date(coupon.startDate) > new Date()) {
        return { valid: false, message: 'Coupon is not yet active' };
      }

      // Check minimum order amount
      if (coupon.minOrderAmount && orderTotal < coupon.minOrderAmount) {
        return {
          valid: false,
          message: `Minimum order amount of ${coupon.minOrderAmount} required`,
        };
      }

      // Check usage limit
      if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
        return { valid: false, message: 'Coupon usage limit reached' };
      }

      // Check per-user limit
      if (customerId && coupon.perUserLimit) {
        const userUsage = await Order.countDocuments({
          customer: customerId,
          couponCode: { $regex: new RegExp(`^${code}$`, 'i') },
          isDeleted: false,
        });

        if (userUsage >= coupon.perUserLimit) {
          return { valid: false, message: 'You have already used this coupon' };
        }
      }

      // Calculate discount
      let discount = 0;
      if (coupon.type === 'percentage') {
        discount = (orderTotal * coupon.value) / 100;
        // Apply max discount cap if set
        if (coupon.maxDiscount && discount > coupon.maxDiscount) {
          discount = coupon.maxDiscount;
        }
      } else if (coupon.type === 'fixed') {
        discount = coupon.value;
        // Discount cannot exceed order total
        if (discount > orderTotal) {
          discount = orderTotal;
        }
      }

      return {
        valid: true,
        discount,
        coupon,
        message: 'Coupon applied successfully',
      };
    } catch (error) {
      throw ApiError.internal('Error validating coupon');
    }
  },

  /**
   * Record coupon usage after order
   * @param {string} code - Coupon code
   * @param {string} customerId - Customer ID
   */
  recordUsage: async (code, customerId) => {
    try {
      await Coupon.findOneAndUpdate(
        { code: { $regex: new RegExp(`^${code}$`, 'i') }, isDeleted: false },
        { $inc: { usedCount: 1 } }
      );
    } catch (error) {
      console.error('Error recording coupon usage:', error);
    }
  },

  /**
   * Get all active coupons
   * @returns {Array} Active coupons
   */
  getActiveCoupons: async () => {
    return Coupon.find({
      isDeleted: false,
      isActive: true,
      $or: [
        { expiresAt: { $gte: new Date() } },
        { expiresAt: null },
      ],
    });
  },

  /**
   * Check if coupons can be stacked
   * @param {Array} codes - Array of coupon codes
   * @returns {Object} Stack validation result
   */
  canStackCoupons: async (codes) => {
    if (codes.length <= 1) {
      return { canStack: true };
    }

    // Check if all coupons allow stacking
    const coupons = await Coupon.find({
      code: { $in: codes.map((c) => new RegExp(`^${c}$`, 'i')) },
      isDeleted: false,
    });

    const canStack = coupons.every((c) => c.allowStacking);
    return {
      canStack,
      message: canStack ? 'Coupons can be combined' : 'Coupons cannot be combined',
    };
  },
};

module.exports = couponService;
