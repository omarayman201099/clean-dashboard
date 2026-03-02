/**
 * Validation Middleware
 */

const Joi = require('joi');
const ApiError = require('../utils/ApiError');

const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errorMessage = error.details
        .map((detail) => detail.message)
        .join(', ');

      return next(ApiError.badRequest(errorMessage));
    }

    req.body = value;
    next();
  };
};

module.exports = { validate };
