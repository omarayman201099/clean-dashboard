/**
 * Product Routes
 */

const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { authenticate } = require('../middlewares/authenticate');
const { authorize } = require('../middlewares/authorize');
const { handleUpload } = require('../middlewares/upload');

// Public routes
router.get('/', productController.getProducts);
router.get('/low-stock', authenticate, authorize('manage_products'), productController.getLowStockProducts);
router.get('/:id', productController.getProduct);

// Protected routes (admin only)
router.post('/', authenticate, authorize('manage_products'), handleUpload, productController.createProduct);
router.put('/:id', authenticate, authorize('manage_products'), handleUpload, productController.updateProduct);
router.delete('/:id', authenticate, authorize('manage_products'), productController.deleteProduct);
router.patch('/:id/stock', authenticate, authorize('manage_inventory'), productController.updateStock);

module.exports = router;
