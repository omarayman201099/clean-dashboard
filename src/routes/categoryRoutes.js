/**
 * Category Routes
 */

const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/categoryController');
const authenticate = require('../middlewares/authenticate');
const authorize = require('../middlewares/authorize');
const { validate } = require('../utils/validators');
const { apiLimiter } = require('../middlewares/rateLimiter');
const { categorySchema, categoryUpdateSchema } = require('../utils/validators');

// Public routes
router.get('/', apiLimiter, categoryController.getCategories);
router.get('/:id', apiLimiter, categoryController.getCategory);

// Protected routes - Admin only
router.post('/', authenticate, authorize(['superadmin', 'admin']), validate(categorySchema), categoryController.createCategory);
router.put('/:id', authenticate, authorize(['superadmin', 'admin']), validate(categoryUpdateSchema), categoryController.updateCategory);
router.delete('/:id', authenticate, authorize(['superadmin', 'admin']), categoryController.deleteCategory);

module.exports = router;
