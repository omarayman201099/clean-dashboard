/**
 * Database Configuration & Connection Management
 * Supports MongoDB with connection pooling and retry logic
 */

const mongoose = require('mongoose');
const config = require('./index');
const logger = require('../utils/logger');

const connectDB = async () => {
  try {
    const { uri, options } = config.mongo;
    
    // Add deprecation warning handling
    options.serverApi = {
      version: '1',
      strict: true,
      deprecationErrors: true
    };

    await mongoose.connect(uri, options);
    
    logger.info('MongoDB connected successfully');
    
    // Handle connection events
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected, attempting to reconnect...');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
    });

    return mongoose.connection;
  } catch (error) {
    logger.error('MongoDB connection failed:', error.message);
    // Don't exit - continue without DB and retry in background
    logger.warn('Server will continue without MongoDB - retrying connection...');
    
    // Retry connection in background
    setTimeout(() => connectDB(), 5000);
  }
};

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received, closing MongoDB connection...`);
  try {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed');
    process.exit(0);
  } catch (error) {
    logger.error('Error during MongoDB shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = { connectDB, mongoose };
