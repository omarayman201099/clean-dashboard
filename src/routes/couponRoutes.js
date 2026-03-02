/**
 * Coupon Routes
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/authenticate');
const { authorize } = require('../middlewares/authorize');
const Coupon = require('../models/Coupon');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');

// Get all coupons (admin)
router.get('/', authenticate, authorize('manage_coupons'), async (req, res, next) => {
  try {
    const coupons = await Coupon.find({ deletedAt: null }).sort({ createdAt: -1 });
    res.json(ApiResponse.success('Coupons retrieved', coupons));
  } catch (error) {
    next(error);
  }
});

// Get active coupons (public - for customers)
router.get('/active', async (req, res, next) => {
  try {
    const now = new Date();
    const coupons = await Coupon.find({
      deletedAt: null,
      isActive: true,
      $or: [
        { expiryDate: { $gte: now } },
        { expiryDate: null }
      ],
      $expr: { $lt: ['$usedCount', '$usageLimit'] }
    });
    res.json(ApiResponse.success('Active coupons retrieved', coupons));
  } catch (error) {
    next(error);
  }
});

// Validate coupon (public - for customers)
router.post('/validate', async (req, res, next) => {
  try {
    const { code, orderTotal } = req.body;
    
    if (!code) {
      throw ApiError.badRequest('Coupon code is required');
    }

    const coupon = await Coupon.findOne({ 
      code: code.toUpperCase(),
      deletedAt: null 
    });

    if (!coupon) {
      throw ApiError.notFound('Invalid coupon code');
    }

    // Check if active
    if (!coupon.isActive) {
      throw ApiError.badRequest('Coupon is not active');
    }

    // Check expiry
    if (coupon.expiryDate && new Date(coupon.expiryDate) < new Date()) {
      throw ApiError.badRequest('Coupon has expired');
    }

    // Check usage limit
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      throw ApiError.badRequest('Coupon usage limit reached');
    }

    // Check minimum order amount
    if (coupon.minOrderAmount && orderTotal < coupon.minOrderAmount) {
      throw ApiError.badRequest(`Minimum order amount is ${coupon.minOrderAmount}`);
    }

    // Calculate discount
    let discountAmount = 0;
    if (coupon.discountType === 'percentage') {
      discountAmount = (orderTotal * coupon.discountValue) / 100;
      // Apply max discount cap if set
      if (coupon.maxDiscountAmount && discountAmount > coupon.maxDiscountAmount) {
        discountAmount = coupon.maxDiscountAmount;
      }
    } else {
      discountAmount = coupon.discountValue;
      // Don't exceed order total
      if (discountAmount > orderTotal) {
        discountAmount = orderTotal;
      }
    }

    res.json(ApiResponse.success('Coupon is valid', {
      valid: true,
      discountType: coupon.discountType,
      discountValue: coupon.discountType === 'percentage' ? `${coupon.discountValue}%` : coupon.discountValue,
      discountAmount,
      description: coupon.description
    }));
  } catch (error) {
    next(error);
  }
});

// Create coupon (admin)
router.post('/', authenticate, authorize('manage_coupons'), async (req, res, next) => {
  try {
    const { 
      code, 
      description, 
      discountType, 
      discountValue, 
      expiryDate, 
      usageLimit,
      minOrderAmount,
      maxDiscountAmount,
      isActive 
    } = req.body;

    // Check if code exists
    const existing = await Coupon.findOne({ 
      code: code.toUpperCase(),
      deletedAt: null 
    });
    
    if (existing) {
      throw ApiError.conflict('Coupon code already exists');
    }

    const coupon = await Coupon.create({
      code: code.toUpperCase(),
      description,
      discountType,
      discountValue,
      expiryDate,
      usageLimit,
      minOrderAmount,
      maxDiscountAmount,
      isActive: isActive !== false
    });

    res.status(201).json(ApiResponse.success('Coupon created', coupon));
  } catch (error) {
    next(error);
  }
});

// Update coupon (admin)
router.put('/:id', authenticate, authorize('manage_coupons'), async (req, res, next) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    
    if (!coupon) {
      throw ApiError.notFound('Coupon not found');
    }

    const { 
      description, 
      discountType, 
      discountValue, 
      expiryDate, 
      usageLimit,
      minOrderAmount,
      maxDiscountAmount,
      isActive 
    } = req.body;

    if (description) coupon.description = description;
    if (discountType) coupon.discountType = discountType;
    if (discountValue) coupon.discountValue = discountValue;
    if (expiryDate) coupon.expiryDate = expiryDate;
    if (usageLimit) coupon.usageLimit = usageLimit;
    if (minOrderAmount !== undefined) coupon.minOrderAmount = minOrderAmount;
    if (maxDiscountAmount !== undefined) coupon.maxDiscountAmount = maxDiscountAmount;
    if (isActive !== undefined) coupon.isActive = isActive;

    await coupon.save();

    res.json(ApiResponse.success('Coupon updated', coupon));
  } catch (error) {
    next(error);
  }
});

// Delete coupon (admin - soft delete)
router.delete('/:id', authenticate, authorize('manage_coupons'), async (req, res, next) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    
    if (!coupon) {
      throw ApiError.notFound('Coupon not found');
    }

    coupon.deletedAt = new Date();
    coupon.isActive = false;
    await coupon.save();

    res.json(ApiResponse.success('Coupon deleted'));
  } catch (error) {
    next(error);
  }
});

module.exports = router;
