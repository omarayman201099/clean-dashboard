/**
 * Order Routes
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/authenticate');
const { authorize } = require('../middlewares/authorize');
const { orderLimiter } = require('../middlewares/rateLimiter');
const orderService = require('../services/orderService');
const ApiResponse = require('../utils/ApiResponse');

// Public route - create order
router.post('/', orderLimiter, async (req, res, next) => {
  try {
    const order = await orderService.createOrder(req.body, req.user?.id);
    res.status(201).json(ApiResponse.success('Order created', order));
  } catch (error) {
    next(error);
  }
});

// Get all orders (admin)
router.get('/', authenticate, authorize('view_orders'), async (req, res, next) => {
  try {
    const filters = {
      status: req.query.status,
      customerEmail: req.query.customerEmail,
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
    };
    
    const result = await orderService.getOrders(filters);
    res.json(ApiResponse.success('Orders retrieved', result));
  } catch (error) {
    next(error);
  }
});

// Get single order
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const order = await orderService.getOrderById(req.params.id);
    
    // Check if user is authorized to view this order
    if (req.user.type === 'customer' && order.customerId?.toString() !== req.user.id) {
      return res.status(403).json(ApiResponse.error('Not authorized to view this order.'));
    }
    
    res.json(ApiResponse.success('Order retrieved', order));
  } catch (error) {
    next(error);
  }
});

// Update order status (admin)
router.patch('/:id/status', authenticate, authorize('manage_orders'), async (req, res, next) => {
  try {
    const { status, note } = req.body;
    const order = await orderService.updateOrderStatus(req.params.id, status, note, req.user.id);
    res.json(ApiResponse.success('Order status updated', order));
  } catch (error) {
    next(error);
  }
});

module.exports = router;
