/**
 * Standardized API Response Format
 */

class ApiResponse {
  constructor(statusCode, message, data = null, meta = null) {
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
    this.meta = meta;
    this.timestamp = new Date().toISOString();
    this.success = statusCode >= 200 && statusCode < 300;
  }

  static success(message, data = null, meta = null) {
    return new ApiResponse(200, message, data, meta);
  }

  static created(message, data = null, meta = null) {
    return new ApiResponse(201, message, data, meta);
  }

  static noContent(message = 'No content') {
    return new ApiResponse(204, message);
  }

  toJSON() {
    const response = {
      success: this.success,
      message: this.message,
      timestamp: this.timestamp,
    };

    if (this.data !== null) {
      response.data = this.data;
    }

    if (this.meta !== null) {
      response.meta = this.meta;
    }

    return response;
  }
}

module.exports = ApiResponse;
