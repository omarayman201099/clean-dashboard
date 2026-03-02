/**
 * Redis Configuration & Connection Management
 * Handles caching, sessions, and real-time features
 */

const { createClient } = require('redis');
const config = require('./index');

let redisClient = null;
let isConnected = false;

/**
 * Initialize Redis client and connect
 */
const connectRedis = async () => {
  try {
    redisClient = createClient({
      url: config.redis.url,
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 10) {
            return new Error('Redis reconnection failed');
          }
          return Math.min(retries * 100, 3000);
        },
      },
    });

    redisClient.on('error', (err) => {
      console.error('Redis Client Error:', err.message);
      isConnected = false;
    });

    redisClient.on('connect', () => {
      console.log('Redis connected successfully');
      isConnected = true;
    });

    await redisClient.connect();
    return redisClient;
  } catch (error) {
    console.error('Redis connection failed:', error.message);
    isConnected = false;
    return null;
  }
};

const getRedisClient = () => redisClient;
const isRedisConnected = () => isConnected;

const disconnectRedis = async () => {
  if (redisClient) {
    await redisClient.quit();
    isConnected = false;
  }
};

process.on('SIGTERM', () => disconnectRedis());
process.on('SIGINT', () => disconnectRedis());

module.exports = {
  connectRedis,
  getRedisClient,
  isRedisConnected,
  disconnectRedis
};
