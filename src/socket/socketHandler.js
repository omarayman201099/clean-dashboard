/**
 * Socket.IO Handler - Real-time functionality
 */

const jwt = require('jsonwebtoken');
const config = require('../config');
const cacheService = require('../services/cacheService');
const notificationService = require('../services/notificationService');
const logger = require('../utils/logger');

const onlineUsers = new Map(); // Track online users in memory

const initializeSocket = (io) => {
  // Set io instance for notifications
  notificationService.setSocketIO(io);

  // Authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication required'));
    }

    try {
      const decoded = jwt.verify(token, config.jwt.secret);
      socket.user = decoded;
      next();
    } catch (error) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    const { id: socketId } = socket;
    const user = socket.user;

    logger.info(`User connected: ${user.id} (${user.type})`);

    // Join user-specific room
    socket.join(`user:${user.id}`);

    // Join admin or customer room
    if (user.type === 'admin') {
      socket.join('admins');
    } else {
      socket.join('customers');
    }

    // Track online user
    const userData = {
      socketId,
      userId: user.id,
      type: user.type,
      role: user.role,
      connectedAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
    };

    onlineUsers.set(user.id, userData);

    // Store in Redis if available
    await cacheService.addOnlineUser(user.id, userData);

    // Broadcast updated online users count
    const stats = await cacheService.getOnlineUsers();
    io.emit('online-users', stats);

    // Handle ping/pong for keep-alive
    socket.on('ping', () => {
      socket.emit('pong');
      
      // Update last activity
      if (onlineUsers.has(user.id)) {
        const data = onlineUsers.get(user.id);
        data.lastActivity = new Date().toISOString();
        onlineUsers.set(user.id, data);
      }
    });

    // Handle disconnect
    socket.on('disconnect', async (reason) => {
      logger.info(`User disconnected: ${user.id} (${reason})`);
      
      onlineUsers.delete(user.id);
      await cacheService.removeOnlineUser(user.id);

      // Broadcast updated online users count
      const updatedStats = await cacheService.getOnlineUsers();
      io.emit('online-users', updatedStats);
    });

    // Handle joining specific rooms for notifications
    socket.on('join-notifications', () => {
      socket.join(`notifications:${user.id}`);
    });

    socket.on('leave-notifications', () => {
      socket.leave(`notifications:${user.id}`);
    });
  });

  // Periodic cleanup of inactive sessions
  setInterval(async () => {
    const now = new Date();
    const idleTimeout = config.realtime.idleTimeout;

    for (const [userId, data] of onlineUsers.entries()) {
      const lastActivity = new Date(data.lastActivity);
      const idleTime = now - lastActivity;

      if (idleTime > idleTimeout) {
        logger.info(`Removing idle user: ${userId}`);
        onlineUsers.delete(userId);
        await cacheService.removeOnlineUser(userId);
      }
    }

    // Broadcast current stats
    const stats = await cacheService.getOnlineUsers();
    io.emit('online-users', stats);
  }, config.realtime.sessionCleanupInterval);

  logger.info('Socket.IO initialized');
};

module.exports = { initializeSocket, onlineUsers };
