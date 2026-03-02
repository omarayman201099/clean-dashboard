/**
 * Category Controller
 */

const Category = require('../models/Category');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const cacheService = require('../services/cacheService');

const categoryController = {
  // Get all categories
  getCategories: async (req, res, next) => {
    try {
      // Try cache first
      const cached = await cacheService.get('categories:all');
      if (cached) {
        return res.json(ApiResponse.success('Categories retrieved from cache', cached));
      }

      const categories = await Category.find({ isDeleted: false }).sort({ name: 1 });
      
      // Cache for 30 minutes
      await cacheService.set('categories:all', categories, 1800);
      
      res.json(ApiResponse.success('Categories retrieved', categories));
    } catch (error) {
      next(error);
    }
  },

  // Get single category
  getCategory: async (req, res, next) => {
    try {
      const { id } = req.params;
      
      const category = await Category.findOne({ _id: id, isDeleted: false });
      
      if (!category) {
        throw ApiError.notFound('Category not found');
      }
      
      res.json(ApiResponse.success('Category retrieved', category));
    } catch (error) {
      next(error);
    }
  },

  // Create category
  createCategory: async (req, res, next) => {
    try {
      const { name, description, image } = req.body;
      
      // Check if category exists
      const existing = await Category.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
      if (existing) {
        throw ApiError.badRequest('Category with this name already exists');
      }

      const category = await Category.create({ name, description, image });
      
      // Invalidate cache
      await cacheService.delete('categories:all');
      
      res.status(201).json(ApiResponse.success('Category created', category));
    } catch (error) {
      next(error);
    }
  },

  // Update category
  updateCategory: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { name, description, image } = req.body;
      
      const category = await Category.findOneAndUpdate(
        { _id: id, isDeleted: false },
        { name, description, image },
        { new: true, runValidators: true }
      );
      
      if (!category) {
        throw ApiError.notFound('Category not found');
      }
      
      // Invalidate cache
      await cacheService.delete('categories:all');
      await cacheService.delete(`category:${id}`);
      
      res.json(ApiResponse.success('Category updated', category));
    } catch (error) {
      next(error);
    }
  },

  // Delete category
  deleteCategory: async (req, res, next) => {
    try {
      const { id } = req.params;
      
      const category = await Category.findOneAndUpdate(
        { _id: id, isDeleted: false },
        { isDeleted: true, deletedAt: new Date() },
        { new: true }
      );
      
      if (!category) {
        throw ApiError.notFound('Category not found');
      }
      
      // Invalidate cache
      await cacheService.delete('categories:all');
      
      res.json(ApiResponse.success('Category deleted', category));
    } catch (error) {
      next(error);
    }
  },
};

module.exports = categoryController;
