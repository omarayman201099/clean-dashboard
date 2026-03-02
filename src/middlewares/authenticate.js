/**
 * Authentication Middleware
 */

const jwt = require('jsonwebtoken');
const config = require('../config');
const { Admin } = require('../models/Admin');
const Customer = require('../models/Customer');
const ApiError = require('../utils/ApiError');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw ApiError.unauthorized('Access denied. No token provided.');
    }

    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = jwt.verify(token, config.jwt.secret);
      
      let user;
      if (decoded.type === 'admin') {
        user = await Admin.findById(decoded.id);
        if (!user || !user.isActive) {
          throw ApiError.unauthorized('Admin not found or inactive.');
        }
      } else if (decoded.type === 'customer') {
        user = await Customer.findById(decoded.id);
        if (!user || !user.isActive) {
          throw ApiError.unauthorized('Customer not found or inactive.');
        }
      } else {
        throw ApiError.unauthorized('Invalid token type.');
      }

      req.user = {
        id: user._id,
        type: decoded.type,
        role: user.role || 'customer',
        permissions: user.permissions || [],
      };
      
      next();
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        throw ApiError.unauthorized('Token expired.');
      }
      if (jwtError.name === 'JsonWebTokenError') {
        throw ApiError.unauthorized('Invalid token.');
      }
      throw jwtError;
    }
  } catch (error) {
    next(error);
  }
};

module.exports = authenticate;
