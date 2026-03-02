/**
 * Central Error Handler Middleware
 */

const logger = require('../utils/logger');
const ApiError = require('../utils/ApiError');
const config = require('../config');

const errorHandler = (err, req, res, next) => {
  let error = err;
  let statusCode = 500;
  let message = 'Internal server error';

  // Log error
  logger.error(`Error: ${err.message}`, {
    method: req.method,
    path: req.path,
    stack: err.stack,
  });

  // Handle Mongoose validation error
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    message = messages.join(', ');
    statusCode = 400;
    error = ApiError.badRequest(message);
  }

  // Handle Mongoose CastError (invalid ObjectId)
  if (err.name === 'CastError') {
    message = 'Invalid ID format';
    statusCode = 400;
    error = ApiError.badRequest(message);
  }

  // Handle Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    message = `Duplicate field value: ${field}`;
    statusCode = 409;
    error = ApiError.conflict(message);
  }

  // Handle JWT errors
  if (err.name === 'JsonWebTokenError') {
    message = 'Invalid token';
    statusCode = 401;
    error = ApiError.unauthorized(message);
  }

  if (err.name === 'TokenExpiredError') {
    message = 'Token expired';
    statusCode = 401;
    error = ApiError.unauthorized(message);
  }

  // Handle Multer errors
  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      message = 'File too large. Maximum size is 5 MB.';
      statusCode = 400;
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      message = 'Unexpected file field';
      statusCode = 400;
    }
    error = ApiError.badRequest(message);
  }

  // Handle custom ApiError
  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
  }

  // Send response
  const response = {
    success: false,
    statusCode,
    message,
  };

  // Add stack trace in development
  if (config.nodeEnv === 'development') {
    response.stack = err.stack;
    response.errors = err.errors || [];
  }

  res.status(statusCode).json(response);
};

module.exports = errorHandler;
