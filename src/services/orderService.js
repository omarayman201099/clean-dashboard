/**
 * Order Service
 */

const { Order, ORDER_STATUSES } = require('../models/Order');
const Product = require('../models/Product');
const Coupon = require('../models/Coupon');
const InventoryMovement = require('../models/InventoryMovement');
const ApiError = require('../utils/ApiError');
const cacheService = require('./cacheService');
const notificationService = require('./notificationService');

class OrderService {
  // Get all orders
  async getOrders(filters = {}) {
    const query = { deletedAt: null };
    
    if (filters.status) {
      query.status = filters.status;
    }
    
    if (filters.customerEmail) {
      query['customer.email'] = filters.customerEmail;
    }

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .skip((filters.page - 1) * filters.limit)
      .limit(filters.limit);

    const total = await Order.countDocuments(query);

    return {
      orders,
      pagination: {
        page: filters.page || 1,
        limit: filters.limit || 20,
        total,
        pages: Math.ceil(total / (filters.limit || 20)),
      },
    };
  }

  // Get single order
  async getOrderById(id) {
    const order = await Order.findOne({ _id: id, deletedAt: null });
    
    if (!order) {
      throw ApiError.notFound('Order not found.');
    }

    return order;
  }

  // Create order
  async createOrder(data, customerId = null) {
    const { customerName, customerEmail, customerPhone, address, items, couponCode } = data;

    // Validate items and calculate total
    let subtotal = 0;
    const orderItems = [];
    const decremented = [];

    for (const item of items) {
      const product = await Product.findById(item.id);
      
      if (!product || !product.isActive) {
        throw ApiError.badRequest(`Product not found: ${item.name}`);
      }

      if (product.stock < item.quantity) {
        throw ApiError.badRequest(`Insufficient stock for: ${product.name}`);
      }

      const itemTotal = product.price * item.quantity;
      subtotal += itemTotal;

      // Decrement stock
      await Product.findByIdAndUpdate(product._id, {
        $inc: { stock: -item.quantity },
      });
      decremented.push({ id: product._id, qty: item.quantity });

      orderItems.push({
        productId: product._id,
        name: product.name,
        quantity: item.quantity,
        price: product.price,
        total: itemTotal,
        image: product.image,
      });

      // Log inventory movement
      await InventoryMovement.create({
        productId: product._id,
        type: 'OUT',
        quantity: item.quantity,
        previousStock: product.stock,
        newStock: product.stock - item.quantity,
        reason: 'SALE',
        referenceType: 'Order',
      });
    }

    // Apply coupon discount
    let discount = 0;
    let discountCode = null;
    
    if (couponCode) {
      const coupon = await Coupon.findOne({ code: couponCode.toUpperCase() });
      
      if (coupon && coupon.isValid()) {
        discount = coupon.calculateDiscount(subtotal);
        discountCode = couponCode.toUpperCase();
        
        // Mark coupon as used
        await coupon.use();
      }
    }

    const totalAmount = Math.max(0, subtotal - discount);

    // Create order
    const order = await Order.create({
      customerName,
      customerEmail,
      customerPhone,
      customerId,
      address,
      items: orderItems,
      subtotal,
      discount,
      discountCode,
      totalAmount,
      status: ORDER_STATUSES.PENDING,
    });

    // Invalidate stats cache
    await cacheService.invalidateStats();

    // Send notification
    await notificationService.notifyNewOrder(order);

    return order;
  }

  // Update order status
  async updateOrderStatus(id, newStatus, note, updatedBy) {
    const order = await Order.findById(id);
    
    if (!order) {
      throw ApiError.notFound('Order not found.');
    }

    // If cancelling, restore stock
    if (newStatus === ORDER_STATUSES.CANCELLED && order.status !== ORDER_STATUSES.CANCELLED) {
      for (const item of order.items) {
        await Product.findByIdAndUpdate(item.productId, {
          $inc: { stock: item.quantity },
        });

        await InventoryMovement.create({
          productId: item.productId,
          type: 'RETURN',
          quantity: item.quantity,
          previousStock: (await Product.findById(item.productId)).stock,
          newStock: (await Product.findById(item.productId)).stock + item.quantity,
          reason: 'RETURN',
          reference: order._id,
          referenceType: 'Order',
        });
      }
    }

    await order.updateStatus(newStatus, note);

    // Invalidate stats cache
    await cacheService.invalidateStats();

    // Send notification
    await notificationService.notifyOrderStatusChange(order);

    return order;
  }

  // Get order stats
  async getOrderStats() {
    const cached = await cacheService.getCachedStats();
    if (cached) return cached;

    const [totalOrders, salesAgg, statusAgg, lowStockProducts] = await Promise.all([
      Order.countDocuments({ deletedAt: null }),
      Order.aggregate([
        { $match: { status: { $ne: ORDER_STATUSES.CANCELLED } } },
        { $group: { _id: null, sum: { $sum: '$totalAmount' } } },
      ]),
      Order.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Product.findLowStock(),
    ]);

    const stats = {
      totalOrders,
      totalSales: salesAgg[0]?.sum || 0,
      ordersByStatus: {},
      lowStockAlerts: lowStockProducts.length,
    };

    statusAgg.forEach(s => {
      stats.ordersByStatus[s._id] = s.count;
    });

    // Cache for 1 minute
    await cacheService.cacheStats(stats, 60);

    return stats;
  }
}

module.exports = new OrderService();
