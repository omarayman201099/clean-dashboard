/**
 * Order Controller
 */

const Order = require('../models/Order');
const Product = require('../models/Product');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const cacheService = require('../services/cacheService');
const notificationService = require('../services/notificationService');
const orderService = require('../services/orderService');

const orderController = {
  // Get all orders
  getOrders: async (req, res, next) => {
    try {
      const { status, page = 1, limit = 20 } = req.query;
      
      const query = { isDeleted: false };
      if (status) {
        query.status = status;
      }

      const orders = await Order.find(query)
        .populate('customer', 'username email')
        .populate('items.product', 'name price image')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

      const total = await Order.countDocuments(query);

      res.json(ApiResponse.success('Orders retrieved', {
        orders,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      }));
    } catch (error) {
      next(error);
    }
  },

  // Get single order
  getOrder: async (req, res, next) => {
    try {
      const { id } = req.params;
      
      const order = await Order.findOne({ _id: id, isDeleted: false })
        .populate('customer', 'username email phone')
        .populate('items.product', 'name price image')
        .populate('statusHistory.updatedBy', 'username');
      
      if (!order) {
        throw ApiError.notFound('Order not found');
      }
      
      res.json(ApiResponse.success('Order retrieved', order));
    } catch (error) {
      next(error);
    }
  },

  // Create order
  createOrder: async (req, res, next) => {
    try {
      const { items, shippingAddress, paymentMethod, couponCode } = req.body;
      const customerId = req.user.id;

      // Validate items
      if (!items || items.length === 0) {
        throw ApiError.badRequest('Order must have at least one item');
      }

      // Validate and calculate prices
      let totalAmount = 0;
      const orderItems = [];

      for (const item of items) {
        const product = await Product.findOne({ _id: item.productId, isDeleted: false, isActive: true });
        
        if (!product) {
          throw ApiError.notFound(`Product not found: ${item.productId}`);
        }

        if (product.stock < item.quantity) {
          throw ApiError.badRequest(`Insufficient stock for product: ${product.name}`);
        }

        const itemTotal = product.price * item.quantity;
        totalAmount += itemTotal;

        orderItems.push({
          product: product._id,
          name: product.name,
          price: product.price,
          quantity: item.quantity,
          total: itemTotal,
        });

        // Update stock
        product.stock -= item.quantity;
        await product.save();
      }

      // Apply coupon if provided
      let discount = 0;
      if (couponCode) {
        const couponValidation = await orderService.validateCoupon(couponCode, customerId, totalAmount);
        if (couponValidation.valid) {
          discount = couponValidation.discount;
          totalAmount -= discount;
        }
      }

      // Create order
      const order = await Order.create({
        customer: customerId,
        items: orderItems,
        totalAmount,
        discount,
        shippingAddress,
        paymentMethod,
        status: 'pending',
        statusHistory: [{
          status: 'pending',
          updatedAt: new Date(),
          note: 'Order placed',
        }],
      });

      // Populate order
      await order.populate('items.product', 'name price image');

      // Send notification to admins
      await notificationService.notifyNewOrder(order);

      // Invalidate stats cache
      await cacheService.delete('stats:orders');

      res.status(201).json(ApiResponse.success('Order created', order));
    } catch (error) {
      next(error);
    }
  },

  // Update order status
  updateOrderStatus: async (req, res, next) => {
    try {
      const { id } = req.params;
      const { status, note } = req.body;
      const adminId = req.user.id;

      const order = await Order.findOne({ _id: id, isDeleted: false });
      
      if (!order) {
        throw ApiError.notFound('Order not found');
      }

      // Update status
      order.status = status;
      order.statusHistory.push({
        status,
        updatedAt: new Date(),
        updatedBy: adminId,
        note: note || `Status changed to ${status}`,
      });

      await order.save();

      // Notify customer
      await notificationService.notifyOrderStatusChange(order);

      // Invalidate stats cache
      await cacheService.delete('stats:orders');

      res.json(ApiResponse.success('Order status updated', order));
    } catch (error) {
      next(error);
    }
  },

  // Delete order (soft delete)
  deleteOrder: async (req, res, next) => {
    try {
      const { id } = req.params;

      const order = await Order.findOneAndUpdate(
        { _id: id, isDeleted: false },
        { isDeleted: true, deletedAt: new Date() },
        { new: true }
      );

      if (!order) {
        throw ApiError.notFound('Order not found');
      }

      res.json(ApiResponse.success('Order deleted', order));
    } catch (error) {
      next(error);
    }
  },
};

module.exports = orderController;
