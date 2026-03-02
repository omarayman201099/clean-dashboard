/**
 * Notification Service - Real-time notifications via WebSocket
 */

const cacheService = require('./cacheService');
const config = require('../config');

// This will be set by the Socket.IO handler
let io = null;

const setSocketIO = (socketIO) => {
  io = socketIO;
};

const getSocketIO = () => io;

// Notify admins about new order
const notifyNewOrder = async (order) => {
  if (!io) return;
  
  io.to('admins').emit('new-order', {
    type: 'NEW_ORDER',
    order: {
      id: order._id,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      totalAmount: order.totalAmount,
      status: order.status,
    },
    timestamp: new Date().toISOString(),
  });
};

// Notify about order status change
const notifyOrderStatusChange = async (order) => {
  if (!io) return;
  
  io.to('admins').emit('order-updated', {
    type: 'ORDER_STATUS_CHANGE',
    order: {
      id: order._id,
      orderNumber: order.orderNumber,
      status: order.status,
    },
    timestamp: new Date().toISOString(),
  });
  
  // Notify customer if socket connection exists
  if (order.customerId) {
    io.to(`customer:${order.customerId}`).emit('order-status', {
      type: 'ORDER_STATUS',
      orderId: order._id,
      status: order.status,
      timestamp: new Date().toISOString(),
    });
  }
};

// Notify about low stock
const notifyLowStock = async (product) => {
  if (!io) return;
  
  io.to('admins').emit('low-stock-alert', {
    type: 'LOW_STOCK',
    product: {
      id: product._id,
      name: product.name,
      stock: product.stock,
      threshold: product.lowStockThreshold,
    },
    timestamp: new Date().toISOString(),
  });
};

// Broadcast user online status
const broadcastOnlineUsers = async () => {
  if (!io) return;
  
  const onlineStats = await cacheService.getOnlineUsers();
  io.emit('online-users', onlineStats);
};

// Send notification to specific user
const notifyUser = (userId, event, data) => {
  if (!io) return;
  
  io.to(`user:${userId}`).emit(event, {
    ...data,
    timestamp: new Date().toISOString(),
  });
};

module.exports = {
  setSocketIO,
  getSocketIO,
  notifyNewOrder,
  notifyOrderStatusChange,
  notifyLowStock,
  broadcastOnlineUsers,
  notifyUser,
};
