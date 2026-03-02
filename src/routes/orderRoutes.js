/**
 * Order Routes
 */

const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const authenticate = require('../middlewares/authenticate');
const authorize = require('../middlewares/authorize');
const { validate } = require('../utils/validators');
const { apiLimiter } = require('../middlewares/rateLimiter');
const { orderSchema, orderStatusSchema } = require('../utils/validators');

// Public routes
router.get('/', apiLimiter, orderController.getOrders);
router.get('/:id', apiLimiter, orderController.getOrder);

// Customer orders (protected)
router.post('/', authenticate, validate(orderSchema), orderController.createOrder);

// Admin only routes
router.put('/:id/status', authenticate, authorize(['superadmin', 'admin']), validate(orderStatusSchema), orderController.updateOrderStatus);
router.delete('/:id', authenticate, authorize(['superadmin', 'admin']), orderController.deleteOrder);

module.exports = router;
