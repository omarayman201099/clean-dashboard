/**
 * Input Validation Schemas using Joi
 */

const Joi = require('joi');

// Common validation patterns
const objectIdPattern = /^[0-9a-fA-F]{24}$/;
const phonePattern = /^\+?[\d\s-()]{10,}$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Auth schemas
const registerSchema = Joi.object({
  username: Joi.string().min(3).max(30).trim(),
  email: Joi.string().pattern(emailPattern),
  password: Joi.string().min(6).max(128),
  phone: Joi.string().pattern(phonePattern).allow('', null),
});

const loginSchema = Joi.object({
  email: Joi.string().pattern(emailPattern),
  password: Joi.string().required(),
  username: Joi.string(),
});

// Product schemas
const productSchema = Joi.object({
  name: Joi.string().min(1).max(200).trim().required(),
  description: Joi.string().max(2000).allow(''),
  price: Joi.number().min(0).required(),
  category: Joi.string().required(),
  stock: Joi.number().integer().min(0).default(0),
});

const productUpdateSchema = Joi.object({
  name: Joi.string().min(1).max(200).trim(),
  description: Joi.string().max(2000).allow(''),
  price: Joi.number().min(0),
  category: Joi.string(),
  stock: Joi.number().integer().min(0),
}).min(1);

// Category schemas
const categorySchema = Joi.object({
  name: Joi.string().min(1).max(100).trim().required(),
  description: Joi.string().max(500).allow(''),
});

// Order schemas
const orderSchema = Joi.object({
  customerName: Joi.string().min(1).max(100).required(),
  customerEmail: Joi.string().pattern(emailPattern).required(),
  customerPhone: Joi.string().pattern(phonePattern).allow('', null),
  address: Joi.string().min(1).max(500).required(),
  items: Joi.array().items(
    Joi.object({
      id: Joi.string().pattern(objectIdPattern).required(),
      name: Joi.string().required(),
      quantity: Joi.number().integer().min(1).required(),
      price: Joi.number().min(0).required(),
    })
  ).min(1).required(),
  couponCode: Joi.string().allow('', null),
});

const orderStatusUpdateSchema = Joi.object({
  status: Joi.string().valid('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled').required(),
  note: Joi.string().max(500).allow(''),
});

// Coupon schemas
const couponSchema = Joi.object({
  code: Joi.string().min(3).max(50).uppercase().trim().required(),
  description: Joi.string().max(500).allow(''),
  discountType: Joi.string().valid('percentage', 'fixed').required(),
  discountValue: Joi.number().min(0).required(),
  minOrderAmount: Joi.number().min(0).default(0),
  maxDiscountAmount: Joi.number().min(0).allow(null),
  usageLimit: Joi.number().integer().min(1).allow(null),
  perUserLimit: Joi.number().integer().min(1).default(1),
  startDate: Joi.date().iso().required(),
  endDate: Joi.date().iso().greater(Joi.ref('startDate')).required(),
  isActive: Joi.boolean().default(true),
});

// Pagination schema
const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  sort: Joi.string().default('-createdAt'),
});

// ID parameter validation
const idParamSchema = Joi.object({
  id: Joi.string().pattern(objectIdPattern).required(),
});

// Validate middleware factory
const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false });
    
    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors,
      });
    }
    
    req.body = value;
    next();
  };
};

// Validate query params
const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, { abortEarly: false });
    
    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors,
      });
    }
    
    req.query = value;
    next();
  };
};

module.exports = {
  Joi,
  registerSchema,
  loginSchema,
  productSchema,
  productUpdateSchema,
  categorySchema,
  orderSchema,
  orderStatusUpdateSchema,
  couponSchema,
  paginationSchema,
  idParamSchema,
  validate,
  validateQuery,
  objectIdPattern,
  // Auth-specific schemas (aliases for backward compatibility)
  adminRegisterSchema: registerSchema,
  adminLoginSchema: loginSchema,
  customerRegisterSchema: registerSchema,
  customerLoginSchema: loginSchema,
};
