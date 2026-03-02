/**
 * Category Model
 */

const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    unique: true,
    trim: true,
    maxlength: [100, 'Category name cannot exceed 100 characters'],
    index: true,
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters'],
    default: '',
  },
  image: {
    type: String,
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true,
  },
  parentCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null,
  },
  order: {
    type: Number,
    default: 0,
  },
  deletedAt: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Indexes - removed duplicates where unique: true or index: true already exists
categorySchema.index({ deletedAt: 1 });

// Virtual for soft delete
categorySchema.virtual('isDeleted').get(function() {
  return this.deletedAt !== null;
});

// Soft delete
categorySchema.methods.softDelete = function() {
  this.deletedAt = new Date();
  this.isActive = false;
  return this.save();
};

// Restore soft deleted document
categorySchema.methods.restore = function() {
  this.deletedAt = null;
  this.isActive = true;
  return this.save();
};

// JSON transform
categorySchema.set('toJSON', {
  transform: function(doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    delete ret.deletedAt;
    return ret;
  },
});

const Category = mongoose.model('Category', categorySchema);

module.exports = Category;
