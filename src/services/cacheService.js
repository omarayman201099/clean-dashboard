/**
 * Cache Service - Redis-based caching
 */

const config = require('../config');
const { getRedisClient, isRedisConnected } = require('../config/redis');

const CACHE_PREFIX = 'cache:';
const SESSION_PREFIX = 'session:';

class CacheService {
  // Get cached data
  async get(key) {
    if (!isRedisConnected()) return null;
    
    try {
      const redis = getRedisClient();
      const data = await redis.get(CACHE_PREFIX + key);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  // Set cached data
  async set(key, value, ttl = config.redis.ttl.medium) {
    if (!isRedisConnected()) return false;
    
    try {
      const redis = getRedisClient();
      await redis.setEx(CACHE_PREFIX + key, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Cache set error:', error);
      return false;
    }
  }

  // Delete cached data
  async del(key) {
    if (!isRedisConnected()) return false;
    
    try {
      const redis = getRedisClient();
      await redis.del(CACHE_PREFIX + key);
      return true;
    } catch (error) {
      console.error('Cache delete error:', error);
      return false;
    }
  }

  // Clear cache by pattern
  async clearPattern(pattern) {
    if (!isRedisConnected()) return false;
    
    try {
      const redis = getRedisClient();
      const keys = await redis.keys(CACHE_PREFIX + pattern);
      if (keys.length > 0) {
        await redis.del(keys);
      }
      return true;
    } catch (error) {
      console.error('Cache clear pattern error:', error);
      return false;
    }
  }

  // Cache products
  async cacheProducts(products, ttl = config.redis.ttl.long) {
    return this.set('products:all', products, ttl);
  }

  async getCachedProducts() {
    return this.get('products:all');
  }

  async invalidateProducts() {
    return this.clearPattern('products*');
  }

  // Cache categories
  async cacheCategories(categories, ttl = config.redis.ttl.long) {
    return this.set('categories:all', categories, ttl);
  }

  async getCachedCategories() {
    return this.get('categories:all');
  }

  async invalidateCategories() {
    return this.clearPattern('categories*');
  }

  // Cache stats
  async cacheStats(stats, ttl = config.redis.ttl.stats) {
    return this.set('stats:dashboard', stats, ttl);
  }

  async getCachedStats() {
    return this.get('stats:dashboard');
  }

  async invalidateStats() {
    return this.del('stats:dashboard');
  }

  // Session management
  async setSession(sessionId, data, ttl = 3600) {
    if (!isRedisConnected()) return false;
    
    try {
      const redis = getRedisClient();
      await redis.setEx(SESSION_PREFIX + sessionId, ttl, JSON.stringify(data));
      return true;
    } catch (error) {
      console.error('Session set error:', error);
      return false;
    }
  }

  async getSession(sessionId) {
    if (!isRedisConnected()) return null;
    
    try {
      const redis = getRedisClient();
      const data = await redis.get(SESSION_PREFIX + sessionId);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Session get error:', error);
      return null;
    }
  }

  async deleteSession(sessionId) {
    if (!isRedisConnected()) return false;
    
    try {
      const redis = getRedisClient();
      await redis.del(SESSION_PREFIX + sessionId);
      return true;
    } catch (error) {
      console.error('Session delete error:', error);
      return false;
    }
  }

  // Online users tracking
  async addOnlineUser(userId, userData) {
    if (!isRedisConnected()) return false;
    
    try {
      const redis = getRedisClient();
      await redis.hSet('online:users', userId, JSON.stringify({
        ...userData,
        connectedAt: new Date().toISOString(),
      }));
      return true;
    } catch (error) {
      console.error('Add online user error:', error);
      return false;
    }
  }

  async removeOnlineUser(userId) {
    if (!isRedisConnected()) return false;
    
    try {
      const redis = getRedisClient();
      await redis.hDel('online:users', userId);
      return true;
    } catch (error) {
      console.error('Remove online user error:', error);
      return false;
    }
  }

  async getOnlineUsers() {
    if (!isRedisConnected()) return { customers: 0, admins: 0, total: 0 };
    
    try {
      const redis = getRedisClient();
      const users = await redis.hGetAll('online:users');
      
      let customers = 0;
      let admins = 0;
      
      Object.values(users).forEach(user => {
        const userData = JSON.parse(user);
        if (userData.type === 'admin') admins++;
        else customers++;
      });
      
      return { customers, admins, total: customers + admins };
    } catch (error) {
      console.error('Get online users error:', error);
      return { customers: 0, admins: 0, total: 0 };
    }
  }
}

module.exports = new CacheService();
