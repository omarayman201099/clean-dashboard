/**
 * Enterprise Backend Server
 * Main entry point with Socket.IO integration
 */

require('dotenv').config();

const http = require('http');
const { Server } = require('socket.io');

const config = require('./config');
const app = require('./app');
const { connectDB } = require('./config/database');
const { connectRedis } = require('./config/redis');
const { initializeSocket } = require('./socket/socketHandler');
const logger = require('./utils/logger');

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: config.security.corsOrigins,
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: config.realtime.pingTimeout,
  pingInterval: config.realtime.pingInterval,
});

// Initialize Socket handlers
initializeSocket(io);

// Start server
const startServer = async () => {
  try {
    // Connect to MongoDB (continues even if fails - will retry in background)
    connectDB();
    logger.info('Database connection initiated');

    // Connect to Redis (optional - continues without if failed)
    try {
      await connectRedis();
      logger.info('Redis connected');
    } catch (error) {
      logger.warn('Redis connection failed, continuing without caching');
    }

    // Start listening
    server.listen(config.port, () => {
      logger.info('='.repeat(50));
      logger.info('  Cleaning Products Store - Enterprise Edition');
      logger.info(`  Server running at: http://localhost:${config.port}`);
      logger.info(`  Admin dashboard:   http://localhost:${config.port}/admin`);
      logger.info(`  Environment:       ${config.nodeEnv}`);
      logger.info('='.repeat(50));
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    // Try to start server anyway
    server.listen(config.port, () => {
      logger.info('Server started with limited functionality');
    });
  }
};

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
});

// Start the server
startServer();

module.exports = { server, io };
