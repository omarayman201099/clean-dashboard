/**
 * Central Configuration Management
 * Handles environment variables and app configuration
 */

require('dotenv').config();

module.exports = {
  // Server Configuration
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',

  // MongoDB Configuration
  mongo: {
    uri: process.env.MONGO_URI || 'mongodb://localhost:27017/cleaningstore',
    options: {
      maxPoolSize: 10,
      minPoolSize: 2,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 30000,
      connectTimeoutMS: 30000,
      retryWrites: true,
      retryReads: true,
    },
  },

  // Redis Configuration
  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    ttl: {
      short: 300,        // 5 minutes
      medium: 1800,      // 30 minutes
      long: 3600,       // 1 hour
      stats: 60,        // 1 minute
    },
  },

  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'cleaning-store-secret-key-2024',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'cleaning-store-refresh-secret-2024',
    expiresIn: '24h',
    refreshExpiresIn: '7d',
    cookieName: 'token',
    refreshCookieName: 'refreshToken',
  },

  // Security Configuration
  security: {
    bcryptRounds: 12,
    rateLimitWindow: 15 * 60 * 1000, // 15 minutes
    rateLimitMax: 100, // max requests per window
    bruteForceMaxWait: 30 * 60 * 1000, // 30 minutes lockout after max attempts
    bruteForceMaxAttempts: 5,
    jwtAlgorithm: 'HS256',
    corsOrigins: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : ['http://localhost:3000'],
  },

  // File Upload Configuration
  upload: {
    maxFileSize: 5 * 1024 * 1024, // 5MB
    allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
    allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
    storageDir: process.env.UPLOAD_DIR || 'uploads',
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    logDir: process.env.LOG_DIR || 'logs',
    maxFiles: '30d',
    maxSize: '20m',
  },

  // Real-time Configuration
  realtime: {
    pingTimeout: 60000,
    pingInterval: 25000,
    idleTimeout: 5 * 60 * 1000, // 5 minutes
    sessionCleanupInterval: 60 * 1000, // 1 minute
  },

  // Inventory Configuration
  inventory: {
    lowStockThreshold: parseInt(process.env.LOW_STOCK_THRESHOLD) || 10,
    alertCheckInterval: '*/5 * * * *', // Every 5 minutes
  },

  // Webhook Configuration
  webhooks: {
    enabled: process.env.WEBHOOKS_ENABLED === 'true',
    urls: process.env.WEBHOOK_URLS ? process.env.WEBHOOK_URLS.split(',') : [],
    retryAttempts: 3,
    retryDelay: 1000,
  },

  // Pagination
  pagination: {
    defaultLimit: 20,
    maxLimit: 100,
  }
};
