/**
 * Inventory Movement Model - Tracks stock changes
 */

const mongoose = require('mongoose');

const inventoryMovementSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  type: {
    type: String,
    enum: ['IN', 'OUT', 'ADJUSTMENT', 'RETURN', 'DAMAGED', 'EXPIRED'],
    required: true,
    index: true,
  },
  quantity: {
    type: Number,
    required: true,
  },
  previousStock: {
    type: Number,
    required: true,
  },
  newStock: {
    type: Number,
    required: true,
  },
  reason: {
    type: String,
    enum: ['PURCHASE', 'SALE', 'RETURN', 'ADJUSTMENT', 'DAMAGE', 'EXPIRY', 'INITIAL_STOCK', 'TRANSFER'],
  },
  reference: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'referenceType',
  },
  referenceType: {
    type: String,
    enum: ['Order', 'Purchase', null],
  },
  notes: {
    type: String,
    maxlength: 500,
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
  },
}, {
  timestamps: true,
});

// Indexes - removed duplicates, keep compound index
inventoryMovementSchema.index({ productId: 1, createdAt: -1 });

const InventoryMovement = mongoose.model('InventoryMovement', inventoryMovementSchema);

module.exports = InventoryMovement;
