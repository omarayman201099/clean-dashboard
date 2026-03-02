/**
 * Authentication Service
 * Handles JWT tokens with refresh token support
 */

const jwt = require('jsonwebtoken');
const config = require('../config');
const { Admin } = require('../models/Admin');
const Customer = require('../models/Customer');
const ApiError = require('../utils/ApiError');
const { getRedisClient, isRedisConnected } = require('../config/redis');

class AuthService {
  // Generate access and refresh tokens
  generateTokens(user, type) {
    const payload = {
      id: user._id,
      type,
      role: user.role || 'customer',
    };

    const accessToken = jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
    });

    const refreshToken = jwt.sign(payload, config.jwt.refreshSecret, {
      expiresIn: config.jwt.refreshExpiresIn,
    });

    return { accessToken, refreshToken };
  }

  // Verify refresh token
  verifyRefreshToken(token) {
    try {
      return jwt.verify(token, config.jwt.refreshSecret);
    } catch (error) {
      throw ApiError.unauthorized('Invalid or expired refresh token.');
    }
  }

  // Admin registration
  async registerAdmin(data) {
    const { username, email, password, phone } = data;

    // Check if admin exists
    const existingAdmin = await Admin.findOne({
      $or: [{ email }, { username }],
    });

    if (existingAdmin) {
      throw ApiError.conflict('Username or email already exists.');
    }

    // First admin becomes superadmin
    const count = await Admin.countDocuments();
    const role = count === 0 ? 'superadmin' : 'admin';

    const admin = await Admin.create({
      username,
      email,
      password,
      phone,
      role,
    });

    const tokens = this.generateTokens(admin, 'admin');
    admin.refreshToken = tokens.refreshToken;
    await admin.save();

    return {
      admin: {
        id: admin._id,
        username: admin.username,
        email: admin.email,
        role: admin.role,
      },
      ...tokens,
    };
  }

  // Admin login
  async loginAdmin(username, password) {
    const admin = await Admin.findOne({ username }).select('+password');

    if (!admin) {
      throw ApiError.unauthorized('Invalid credentials.');
    }

    if (!admin.isActive) {
      throw ApiError.forbidden('Account is disabled.');
    }

    const isValidPassword = await admin.comparePassword(password);
    if (!isValidPassword) {
      throw ApiError.unauthorized('Invalid credentials.');
    }

    // Update last login
    admin.lastLogin = new Date();
    
    // Generate tokens
    const tokens = this.generateTokens(admin, 'admin');
    admin.refreshToken = tokens.refreshToken;
    await admin.save();

    return {
      admin: {
        id: admin._id,
        username: admin.username,
        email: admin.email,
        role: admin.role,
      },
      ...tokens,
    };
  }

  // Customer registration
  async registerCustomer(data) {
    const { username, email, password, phone } = data;

    const existingCustomer = await Customer.findOne({ email });
    if (existingCustomer) {
      throw ApiError.conflict('Email already registered.');
    }

    const customer = await Customer.create({
      username,
      email,
      password,
      phone,
    });

    const tokens = this.generateTokens(customer, 'customer');
    customer.refreshToken = tokens.refreshToken;
    await customer.save();

    return {
      customer: {
        id: customer._id,
        username: customer.username,
        email: customer.email,
      },
      ...tokens,
    };
  }

  // Customer login
  async loginCustomer(email, password) {
    const customer = await Customer.findOne({ email }).select('+password');

    if (!customer) {
      throw ApiError.unauthorized('Invalid credentials.');
    }

    if (!customer.isActive) {
      throw ApiError.forbidden('Account is disabled.');
    }

    const isValidPassword = await customer.comparePassword(password);
    if (!isValidPassword) {
      throw ApiError.unauthorized('Invalid credentials.');
    }

    customer.lastLogin = new Date();
    
    const tokens = this.generateTokens(customer, 'customer');
    customer.refreshToken = tokens.refreshToken;
    await customer.save();

    return {
      customer: {
        id: customer._id,
        username: customer.username,
        email: customer.email,
      },
      ...tokens,
    };
  }

  // Refresh token
  async refreshToken(refreshToken) {
    const decoded = this.verifyRefreshToken(refreshToken);

    let user;
    if (decoded.type === 'admin') {
      user = await Admin.findById(decoded.id).select('+refreshToken');
    } else {
      user = await Customer.findById(decoded.id).select('+refreshToken');
    }

    if (!user || user.refreshToken !== refreshToken) {
      throw ApiError.unauthorized('Invalid refresh token.');
    }

    const tokens = this.generateTokens(user, decoded.type);
    user.refreshToken = tokens.refreshToken;
    await user.save();

    return tokens;
  }

  // Logout
  async logout(userId, userType) {
    let user;
    if (userType === 'admin') {
      user = await Admin.findById(userId);
    } else {
      user = await Customer.findById(userId);
    }

    if (user) {
      user.refreshToken = null;
      await user.save();
    }

    // Also remove from Redis session if connected
    if (isRedisConnected()) {
      const redis = getRedisClient();
      await redis.del(`session:${userId}`);
    }

    return true;
  }

  // Get current user profile
  async getProfile(userId, userType) {
    let user;
    if (userType === 'admin') {
      user = await Admin.findById(userId);
    } else {
      user = await Customer.findById(userId);
    }

    if (!user) {
      throw ApiError.notFound('User not found.');
    }

    return user;
  }
}

module.exports = new AuthService();
