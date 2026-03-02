/**
 * Customer Routes (Backward Compatible)
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authenticate = require('../middlewares/authenticate');
const { validate } = require('../utils/validators');
const { authLimiter } = require('../middlewares/rateLimiter');
const { customerRegisterSchema, customerLoginSchema } = require('../utils/validators');

// Public routes
router.post('/register', authLimiter, validate(customerRegisterSchema), authController.registerCustomer);
router.post('/login', authLimiter, validate(customerLoginSchema), authController.loginCustomer);

// Protected routes
router.get('/me', authenticate, authController.getCustomerProfile);

module.exports = router;
