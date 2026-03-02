/**
 * Order Model with Full Lifecycle Support
 */

const mongoose = require('mongoose');

const ORDER_STATUSES = ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'];

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true,
  },
  customerName: {
    type: String,
    required: true,
  },
  customerEmail: {
    type: String,
    required: true,
  },
  customerPhone: String,
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
  },
  address: {
    type: String,
    required: true,
  },
  items: {
    type: Array,
    default: [],
  },
  subtotal: {
    type: Number,
    default: 0,
  },
  discount: {
    type: Number,
    default: 0,
  },
  discountCode: String,
  tax: {
    type: Number,
    default: 0,
  },
  shippingCost: {
    type: Number,
    default: 0,
  },
  totalAmount: {
    type: Number,
    default: 0,
  },
  status: {
    type: String,
    enum: ORDER_STATUSES,
    default: 'pending',
    index: true,
  },
  statusHistory: {
    type: Array,
    default: [],
  },
  paymentMethod: {
    type: String,
    default: 'cash',
  },
  paymentStatus: {
    type: String,
    default: 'pending',
  },
  notes: String,
  adminNotes: String,
  cancelledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
  },
  cancellationReason: String,
  deliveredAt: Date,
  deletedAt: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
});

// Indexes - removed duplicates where unique: true or index: true already exists
orderSchema.index({ status: 1, createdAt: -1 });

// Generate order number
orderSchema.pre('save', async function(next) {
  if (!this.orderNumber) {
    const count = await mongoose.model('Order').countDocuments();
    this.orderNumber = 'ORD-' + Date.now() + '-' + (count + 1).toString().padStart(4, '0');
  }
  next();
});

// Update status with history
orderSchema.methods.updateStatus = async function(newStatus, note) {
  this.status = newStatus;
  if (!this.statusHistory) this.statusHistory = [];
  this.statusHistory.push({
    status: newStatus,
    note: note || 'Status changed',
    updatedAt: new Date(),
  });
  if (newStatus === 'delivered') {
    this.deliveredAt = new Date();
  }
  return this.save();
};

const Order = mongoose.model('Order', orderSchema);

module.exports = { Order, ORDER_STATUSES };
