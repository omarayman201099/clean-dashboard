/**
 * Category Routes
 */

const express = require('express');
const router = express.Router();
const { authenticate } = require('../middlewares/authenticate');
const { authorize } = require('../middlewares/authorize');
const { handleUpload } = require('../middlewares/upload');
const Category = require('../models/Category');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');

// Get all categories (public - active only)
router.get('/', async (req, res, next) => {
  try {
    const { all } = req.query;
    let filter = { deletedAt: null };
    
    // Admin can view all categories including inactive
    if (all === 'true') {
      // Don't filter by isActive
    } else {
      filter.isActive = true;
    }
    
    const categories = await Category.find(filter).sort({ name: 1 });
    res.json(ApiResponse.success('Categories retrieved', categories));
  } catch (error) {
    next(error);
  }
});

// Get all categories (admin - includes inactive)
router.get('/all', authenticate, authorize('manage_products'), async (req, res, next) => {
  try {
    const categories = await Category.find({ deletedAt: null })
      .sort({ name: 1 });
    res.json(ApiResponse.success('All categories retrieved', categories));
  } catch (error) {
    next(error);
  }
});

// Get single category
router.get('/:id', async (req, res, next) => {
  try {
    const category = await Category.findOne({ 
      _id: req.params.id, 
      isActive: true, 
      deletedAt: null 
    });
    
    if (!category) {
      throw ApiError.notFound('Category not found.');
    }
    
    res.json(ApiResponse.success('Category retrieved', category));
  } catch (error) {
    next(error);
  }
});

// Create category
router.post('/', authenticate, authorize('manage_products'), async (req, res, next) => {
  try {
    const { name, description } = req.body;
    
    const existing = await Category.findOne({ name, deletedAt: null });
    if (existing) {
      throw ApiError.conflict('Category already exists.');
    }
    
    const category = await Category.create({ name, description });
    res.status(201).json(ApiResponse.success('Category created', category));
  } catch (error) {
    next(error);
  }
});

// Update category
router.put('/:id', authenticate, authorize('manage_products'), async (req, res, next) => {
  try {
    const { name, description } = req.body;
    
    const category = await Category.findById(req.params.id);
    if (!category) {
      throw ApiError.notFound('Category not found.');
    }
    
    category.name = name || category.name;
    category.description = description || category.description;
    await category.save();
    
    res.json(ApiResponse.success('Category updated', category));
  } catch (error) {
    next(error);
  }
});

// Delete category
router.delete('/:id', authenticate, authorize('manage_products'), async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      throw ApiError.notFound('Category not found.');
    }
    
    await category.softDelete();
    res.json(ApiResponse.success('Category deleted'));
  } catch (error) {
    next(error);
  }
});

module.exports = router;
