/**
 * Product Routes
 */

const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const authenticate = require('../middlewares/authenticate');
const authorize = require('../middlewares/authorize');
const { validate } = require('../utils/validators');
const { apiLimiter } = require('../middlewares/rateLimiter');
const { productSchema, productUpdateSchema } = require('../utils/validators');

// Public routes
router.get('/', apiLimiter, productController.getProducts);
router.get('/:id', apiLimiter, productController.getProduct);

// Protected routes - Admin only
router.post('/', authenticate, authorize(['superadmin', 'admin']), validate(productSchema), productController.createProduct);
router.put('/:id', authenticate, authorize(['superadmin', 'admin']), validate(productUpdateSchema), productController.updateProduct);
router.delete('/:id', authenticate, authorize(['superadmin', 'admin']), productController.deleteProduct);

module.exports = router;
