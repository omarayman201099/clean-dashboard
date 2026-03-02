/**
 * Auth Routes
 */

const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate } = require('../middlewares/authenticate');
const { authorize } = require('../middlewares/authorize');
const { validate } = require('../middlewares/validate');
const { authLimiter, apiLimiter } = require('../middlewares/rateLimiter');
const { adminRegisterSchema, adminLoginSchema, customerRegisterSchema, customerLoginSchema } = require('../utils/validators');

// Public routes
router.post('/register', authLimiter, validate(adminRegisterSchema), authController.registerAdmin);
router.post('/login', authLimiter, validate(adminLoginSchema), authController.loginAdmin);
router.post('/refresh-token', authLimiter, authController.refreshToken);

// Customer routes
router.post('/customers/register', authLimiter, validate(customerRegisterSchema), authController.registerCustomer);
router.post('/customers/login', authLimiter, validate(customerLoginSchema), authController.loginCustomer);

// Protected routes
router.get('/me', authenticate, authController.getProfile);
router.post('/logout', authenticate, authController.logout);

module.exports = router;
