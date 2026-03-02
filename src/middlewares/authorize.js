/**
 * Authorization Middleware - RBAC
 */

const ApiError = require('../utils/ApiError');

const authorize = (roles = [], permissions = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(ApiError.unauthorized('User not authenticated.'));
    }

    if (roles.length > 0) {
      const userRoles = Array.isArray(roles) ? roles : [roles];
      if (!userRoles.includes(req.user.role)) {
        return next(ApiError.forbidden('Insufficient role privileges.'));
      }
    }

    if (permissions.length > 0) {
      const userPermissions = Array.isArray(permissions) ? permissions : [permissions];
      const hasPermission = userPermissions.some(p => req.user.permissions.includes(p));
      if (!hasPermission) {
        return next(ApiError.forbidden('Insufficient permissions.'));
      }
    }

    next();
  };
};

module.exports = authorize;
