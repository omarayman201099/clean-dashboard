/**
 * Product Controller
 */

const productService = require('../services/productService');
const ApiResponse = require('../utils/ApiResponse');
const { validateProduct, validateProductUpdate } = require('../utils/validators');

// Get all products
const getProducts = async (req, res, next) => {
  try {
    const filters = {
      category: req.query.category,
      sort: req.query.sort,
      limit: parseInt(req.query.limit) || 20,
      showOutOfStock: req.query.showOutOfStock === 'true',
    };

    const products = await productService.getProducts(filters);
    res.json(ApiResponse.success('Products retrieved', products));
  } catch (error) {
    next(error);
  }
};

// Get single product
const getProduct = async (req, res, next) => {
  try {
    const product = await productService.getProductById(req.params.id);
    res.json(ApiResponse.success('Product retrieved', product));
  } catch (error) {
    next(error);
  }
};

// Create product
const createProduct = async (req, res, next) => {
  try {
    const { error, value } = validateProduct(req.body);
    if (error) {
      return res.status(400).json(ApiResponse.error(error.details[0].message));
    }

    const imagePath = req.file ? `/uploads/${req.file.filename}` : null;
    const product = await productService.createProduct(value, imagePath);
    
    res.status(201).json(ApiResponse.success('Product created', product));
  } catch (error) {
    next(error);
  }
};

// Update product
const updateProduct = async (req, res, next) => {
  try {
    const { error, value } = validateProductUpdate(req.body);
    if (error) {
      return res.status(400).json(ApiResponse.error(error.details[0].message));
    }

    const imagePath = req.file ? `/uploads/${req.file.filename}` : null;
    const product = await productService.updateProduct(req.params.id, value, imagePath);
    
    res.json(ApiResponse.success('Product updated', product));
  } catch (error) {
    next(error);
  }
};

// Delete product (soft delete)
const deleteProduct = async (req, res, next) => {
  try {
    await productService.deleteProduct(req.params.id);
    res.json(ApiResponse.success('Product deleted'));
  } catch (error) {
    next(error);
  }
};

// Get low stock products
const getLowStockProducts = async (req, res, next) => {
  try {
    const products = await productService.getLowStockProducts();
    res.json(ApiResponse.success('Low stock products retrieved', products));
  } catch (error) {
    next(error);
  }
};

// Update stock
const updateStock = async (req, res, next) => {
  try {
    const { quantity, type, reason } = req.body;
    const product = await productService.updateStock(
      req.params.id,
      parseInt(quantity),
      type,
      reason,
      req.user.id
    );
    
    res.json(ApiResponse.success('Stock updated', product));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getLowStockProducts,
  updateStock,
};
