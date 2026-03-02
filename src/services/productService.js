/**
 * Product Service
 */

const Product = require('../models/Product');
const Category = require('../models/Category');
const ApiError = require('../utils/ApiError');
const cacheService = require('./cacheService');

class ProductService {
  // Get all products with caching
  async getProducts(filters = {}) {
    // Try cache first
    const cacheKey = `products:${JSON.stringify(filters)}`;
    const cached = await cacheService.get(cacheKey);
    if (cached) return cached;

    const query = { isActive: true, deletedAt: null };
    
    if (filters.category && filters.category !== 'all') {
      query.category = filters.category;
    }
    
    if (!filters.showOutOfStock) {
      query.stock = { $gt: 0 };
    }

    const products = await Product.find(query)
      .sort(filters.sort || { createdAt: -1 })
      .limit(filters.limit || 100);

    // Cache for 5 minutes
    await cacheService.set(cacheKey, products, 300);
    
    return products;
  }

  // Get single product
  async getProductById(id) {
    const product = await Product.findOne({
      _id: id,
      isActive: true,
      deletedAt: null,
    });

    if (!product) {
      throw ApiError.notFound('Product not found.');
    }

    return product;
  }

  // Create product
  async createProduct(data, imagePath) {
    const category = await Category.findOne({ name: data.category });
    
    const product = await Product.create({
      ...data,
      image: imagePath || '/uploads/placeholder.svg',
      categoryId: category?._id,
    });

    // Invalidate cache
    await cacheService.invalidateProducts();

    return product;
  }

  // Update product
  async updateProduct(id, data, imagePath) {
    const product = await Product.findById(id);
    
    if (!product) {
      throw ApiError.notFound('Product not found.');
    }

    if (data.category) {
      const category = await Category.findOne({ name: data.category });
      data.categoryId = category?._id;
    }

    if (imagePath) {
      data.image = imagePath;
    }

    Object.assign(product, data);
    await product.save();

    // Invalidate cache
    await cacheService.invalidateProducts();

    return product;
  }

  // Delete product (soft delete)
  async deleteProduct(id) {
    const product = await Product.findById(id);
    
    if (!product) {
      throw ApiError.notFound('Product not found.');
    }

    await product.softDelete();

    // Invalidate cache
    await cacheService.invalidateProducts();

    return true;
  }

  // Get low stock products
  async getLowStockProducts() {
    return Product.findLowStock();
  }

  // Update stock
  async updateStock(id, quantity, type, reason, performedBy) {
    const product = await Product.findById(id);
    
    if (!product) {
      throw ApiError.notFound('Product not found.');
    }

    const previousStock = product.stock;
    
    if (type === 'IN') {
      product.stock += quantity;
    } else if (type === 'OUT') {
      if (product.stock < quantity) {
        throw ApiError.badRequest('Insufficient stock.');
      }
      product.stock -= quantity;
    } else {
      product.stock = quantity;
    }

    await product.save();

    // Create inventory movement log
    const InventoryMovement = require('../models/InventoryMovement');
    await InventoryMovement.create({
      productId: product._id,
      type,
      quantity,
      previousStock,
      newStock: product.stock,
      reason,
      performedBy,
    });

    // Invalidate cache
    await cacheService.invalidateProducts();

    return product;
  }
}

module.exports = new ProductService();
