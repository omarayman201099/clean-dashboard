/**
 * Stats Routes
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/authenticate');
const { authorize } = require('../middlewares/authorize');
const orderService = require('../services/orderService');
const productService = require('../services/productService');
const ApiResponse = require('../utils/ApiResponse');

// Get dashboard stats (admin)
router.get('/', authenticate, authorize('view_stats'), async (req, res, next) => {
  try {
    const stats = await orderService.getOrderStats();
    res.json(ApiResponse.success('Stats retrieved', stats));
  } catch (error) {
    next(error);
  }
});

// Get low stock alerts
router.get('/low-stock', authenticate, authorize('view_stats'), async (req, res, next) => {
  try {
    const products = await productService.getLowStockProducts();
    res.json(ApiResponse.success('Low stock products', products));
  } catch (error) {
    next(error);
  }
});

module.exports = router;
