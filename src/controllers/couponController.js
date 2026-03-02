/**
 * Coupon Controller
 */

const Coupon = require('../models/Coupon');
const Order = require('../models/Order');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const cacheService = require('../services/cacheService');
const couponService = require('../services/couponService');

const couponController = {
  // Get all coupons (admin)
  getCoupons: async (req, res, next) => {
    try {
      const { page = 1, limit = 20 } = req.query;
      
      const coupons = await Coupon.find({ isDeleted: false })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

      const total = await Coupon.countDocuments({ isDeleted: false });

      res.json(ApiResponse.success('Coupons retrieved', {
        coupons,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      }));
    } catch (error) {
      next(error);
    }
  },

  // Validate coupon (public)
  validateCoupon: async (req, res, next) => {
    try {
      const { code } = req.params;
      const { orderTotal } = req.body;
      const customerId = req.user?.id;

      const result = await couponService.validateCoupon(code, customerId, orderTotal);
      
      if (!result.valid) {
        throw ApiError.badRequest(result.message);
      }

      res.json(ApiResponse.success('Coupon is valid', {
        valid: true,
        discount: result.discount,
        type: result.coupon.type,
        description: result.coupon.description,
      }));
    } catch (error) {
      next(error);
    }
  },

  // Create coupon (admin)
  createCoupon: async (req, res, next) => {
    try {
      const { code, type, value, minOrderAmount, maxDiscount, expiresAt, usageLimit, description, isActive } = req.body;

      // Check if coupon exists
      const existing = await Coupon.findOne({ code: { $regex: new RegExp(`^${code}$`, 'i') }, isDeleted: false });
      if (existing) {
        throw ApiError.badRequest('Coupon with this code already exists');
      }

      const coupon = await Coupon.create({
        code,
        type,
        value,
        minOrderAmount,
        maxDiscount,
        expiresAt,
        usageLimit,
        description,
        isActive,
      });

      // Invalidate cache
      await cacheService.delete('coupons:active');

      res.status(201).json(ApiResponse.success('Coupon created', coupon));
    } catch (error) {
      next(error);
    }
  },

  // Update coupon (admin)
  updateCoupon: async (req, res, next) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const coupon = await Coupon.findOneAndUpdate(
        { _id: id, isDeleted: false },
        updates,
        { new: true, runValidators: true }
      );

      if (!coupon) {
        throw ApiError.notFound('Coupon not found');
      }

      // Invalidate cache
      await cacheService.delete('coupons:active');

      res.json(ApiResponse.success('Coupon updated', coupon));
    } catch (error) {
      next(error);
    }
  },

  // Delete coupon (admin)
  deleteCoupon: async (req, res, next) => {
    try {
      const { id } = req.params;

      const coupon = await Coupon.findOneAndUpdate(
        { _id: id, isDeleted: false },
        { isDeleted: true, deletedAt: new Date() },
        { new: true }
      );

      if (!coupon) {
        throw ApiError.notFound('Coupon not found');
      }

      // Invalidate cache
      await cacheService.delete('coupons:active');

      res.json(ApiResponse.success('Coupon deleted', coupon));
    } catch (error) {
      next(error);
    }
  },
};

module.exports = couponController;
