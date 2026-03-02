/**
 * Custom API Error Class
 * Standardized error handling across the application
 */

class ApiError extends Error {
  constructor(statusCode, message, errors = [], isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = isOperational;
    this.timestamp = new Date().toISOString();

    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message, errors = []) {
    return new ApiError(400, message, errors);
  }

  static unauthorized(message = 'Unauthorized') {
    return new ApiError(401, message);
  }

  static forbidden(message = 'Forbidden') {
    return new ApiError(403, message);
  }

  static notFound(message = 'Resource not found') {
    return new ApiError(404, message);
  }

  static conflict(message = 'Resource already exists') {
    return new ApiError(409, message);
  }

  static unprocessable(message = 'Unprocessable entity') {
    return new ApiError(422, message);
  }

  static internal(message = 'Internal server error') {
    return new ApiError(500, message, [], false);
  }

  static serviceUnavailable(message = 'Service unavailable') {
    return new ApiError(503, message);
  }

  toJSON() {
    return {
      statusCode: this.statusCode,
      message: this.message,
      errors: this.errors,
      timestamp: this.timestamp,
      stack: process.env.NODE_ENV === 'development' ? this.stack : undefined
    };
  }
}

module.exports = ApiError;
