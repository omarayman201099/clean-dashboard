/**
 * Coupon Routes
 */

const express = require('express');
const router = express.Router();
const couponController = require('../controllers/couponController');
const authenticate = require('../middlewares/authenticate');
const authorize = require('../middlewares/authorize');
const { validate } = require('../utils/validators');
const { apiLimiter } = require('../middlewares/rateLimiter');
const { couponSchema, couponUpdateSchema, couponValidateSchema } = require('../utils/validators');

// Public routes
router.get('/validate/:code', apiLimiter, validate(couponValidateSchema), couponController.validateCoupon);

// Admin routes
router.get('/', authenticate, authorize(['superadmin', 'admin']), couponController.getCoupons);
router.post('/', authenticate, authorize(['superadmin', 'admin']), validate(couponSchema), couponController.createCoupon);
router.put('/:id', authenticate, authorize(['superadmin', 'admin']), validate(couponUpdateSchema), couponController.updateCoupon);
router.delete('/:id', authenticate, authorize(['superadmin', 'admin']), couponController.deleteCoupon);

module.exports = router;
