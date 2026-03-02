/**
 * Product Model with Inventory Support
 */

const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [200, 'Product name cannot exceed 200 characters'],
    index: true,
  },
  description: {
    type: String,
    maxlength: [5000, 'Description cannot exceed 5000 characters'],
    default: '',
  },
  price: {
    type: Number,
    required: [true, 'Price is required'],
    min: [0, 'Price cannot be negative'],
    index: true,
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    index: true,
  },
  categoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
  },
  stock: {
    type: Number,
    default: 0,
    min: [0, 'Stock cannot be negative'],
    index: true,
  },
  lowStockThreshold: {
    type: Number,
    default: 10,
    min: 0,
  },
  image: {
    type: String,
    default: '/uploads/placeholder.svg',
  },
  images: [{
    type: String,
  }],
  sku: {
    type: String,
    unique: true,
    sparse: true,
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
  isFeatured: {
    type: Boolean,
    default: false,
    index: true,
  },
  weight: {
    type: Number,
    min: 0,
  },
  dimensions: {
    length: Number,
    width: Number,
    height: Number,
  },
  tags: [{
    type: String,
    trim: true,
  }],
  deletedAt: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes - removed duplicates where field-level index: true exists
productSchema.index({ name: 'text', description: 'text', tags: 'text' });
productSchema.index({ deletedAt: 1 });

// Virtual for low stock check
productSchema.virtual('isLowStock').get(function() {
  return this.stock <= this.lowStockThreshold;
});

// Virtual for out of stock check
productSchema.virtual('isOutOfStock').get(function() {
  return this.stock === 0;
});

// Virtual for soft delete
productSchema.virtual('isDeleted').get(function() {
  return this.deletedAt !== null;
});

// Soft delete
productSchema.methods.softDelete = function() {
  this.deletedAt = new Date();
  this.isActive = false;
  return this.save();
};

// Restore soft deleted document
productSchema.methods.restore = function() {
  this.deletedAt = null;
  this.isActive = true;
  return this.save();
};

// Static method to find active products
productSchema.statics.findActive = function(options = {}) {
  const query = { isActive: true, deletedAt: null };
  if (options.category) query.category = options.category;
  return this.find(query).sort(options.sort || { createdAt: -1 });
};

// Static method to find low stock products
productSchema.statics.findLowStock = function() {
  return this.find({
    isActive: true,
    deletedAt: null,
    $expr: { $lte: ['$stock', '$lowStockThreshold'] },
  });
};

// JSON transform
productSchema.set('toJSON', {
  transform: function(doc, ret) {
    ret.id = ret._id;
    ret.isLowStock = ret.isLowStock;
    ret.isOutOfStock = ret.isOutOfStock;
    delete ret._id;
    delete ret.__v;
    delete ret.deletedAt;
    return ret;
  },
});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
