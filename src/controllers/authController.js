/**
 * Auth Controller
 */

const authService = require('../services/authService');
const ApiResponse = require('../utils/ApiResponse');

// Admin registration
const registerAdmin = async (req, res, next) => {
  try {
    const result = await authService.registerAdmin(req.body);
    res.status(201).json(ApiResponse.success('Admin registered successfully', result));
  } catch (error) {
    next(error);
  }
};

// Admin login
const loginAdmin = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    const result = await authService.loginAdmin(username, password);
    res.json(ApiResponse.success('Login successful', result));
  } catch (error) {
    next(error);
  }
};

// Customer registration
const registerCustomer = async (req, res, next) => {
  try {
    const result = await authService.registerCustomer(req.body);
    res.status(201).json(ApiResponse.success('Customer registered successfully', result));
  } catch (error) {
    next(error);
  }
};

// Customer login
const loginCustomer = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.loginCustomer(email, password);
    res.json(ApiResponse.success('Login successful', result));
  } catch (error) {
    next(error);
  }
};

// Get current user profile
const getProfile = async (req, res, next) => {
  try {
    const user = await authService.getProfile(req.user.id, req.user.type);
    res.json(ApiResponse.success('Profile retrieved', user));
  } catch (error) {
    next(error);
  }
};

// Get customer profile (backward compatible - /api/customers/me)
const getCustomerProfile = async (req, res, next) => {
  try {
    if (req.user.type !== 'customer') {
      return res.status(403).json(ApiResponse.error('Not a customer token', 403));
    }
    const user = await authService.getProfile(req.user.id, req.user.type);
    res.json(ApiResponse.success('Profile retrieved', user));
  } catch (error) {
    next(error);
  }
};

// Refresh token
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    const tokens = await authService.refreshToken(refreshToken);
    res.json(ApiResponse.success('Token refreshed', tokens));
  } catch (error) {
    next(error);
  }
};

// Logout
const logout = async (req, res, next) => {
  try {
    await authService.logout(req.user.id, req.user.type);
    res.json(ApiResponse.success('Logged out successfully'));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  registerAdmin,
  loginAdmin,
  registerCustomer,
  loginCustomer,
  getProfile,
  getCustomerProfile,
  refreshToken,
  logout,
};
