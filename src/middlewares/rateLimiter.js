/**
 * Rate Limiting Middleware
 */

const rateLimit = require('express-rate-limit');
const config = require('../config');
const ApiError = require('../utils/ApiError');

// General API rate limiter
const apiLimiter = rateLimit({
  windowMs: config.security.rateLimitWindow,
  max: config.security.rateLimitMax,
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    next(ApiError.serviceUnavailable('Too many requests, please try again later.'));
  },
});

// Stricter rate limiter for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts
  message: {
    success: false,
    message: 'Too many login attempts, please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Rate limiter for order creation
const orderLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: {
    success: false,
    message: 'Too many orders placed, please try again later.',
  },
});

module.exports = {
  apiLimiter,
  authLimiter,
  orderLimiter,
};
