import jwt from 'jsonwebtoken';
import { Admin } from '../models/index.js';
import config from '../config/index.js';
import { formatError } from '../utils/helpers.js';
import logger from '../utils/logger.js';

/**
 * Middleware to authenticate admin users
 */
export const authenticateAdmin = async (req, res, next) => {
  try {
    const token = extractToken(req);
    
    if (!token) {
      return res.status(401).json(formatError('Access denied. No token provided.', 401));
    }

    // Verify token
    const decoded = jwt.verify(token, config.jwt.secret);
    
    // Find admin
    const admin = await Admin.findById(decoded.id).select('+passwordHash');
    if (!admin || !admin.isActive) {
      return res.status(401).json(formatError('Invalid token or admin account disabled.', 401));
    }

    // Check if password was changed after token was issued
    if (admin.changedPasswordAfter(decoded.iat)) {
      return res.status(401).json(formatError('Password changed recently. Please log in again.', 401));
    }

    // Attach admin to request
    req.admin = admin;
    next();
  } catch (error) {
    logger.error('Authentication error:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json(formatError('Invalid token.', 401));
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json(formatError('Token expired.', 401));
    }
    
    res.status(500).json(formatError('Authentication error.', 500));
  }
};

/**
 * Middleware to authorize admin permissions
 * @param {string} resource - Resource name (events, registrations, admin)
 * @param {string} action - Action name (create, read, update, delete)
 */
export const authorizeAdmin = (resource, action) => {
  return (req, res, next) => {
    try {
      if (!req.admin) {
        return res.status(401).json(formatError('Authentication required.', 401));
      }

      const permissions = req.admin.effectivePermissions;
      
      // Check if admin has required permission
      if (!permissions[resource] || !permissions[resource][action]) {
        logger.warn(`Admin ${req.admin.email} attempted unauthorized ${action} on ${resource}`);
        return res.status(403).json(formatError('Insufficient permissions.', 403));
      }

      next();
    } catch (error) {
      logger.error('Authorization error:', error);
      res.status(500).json(formatError('Authorization error.', 500));
    }
  };
};

/**
 * Middleware to check if admin is superadmin
 */
export const requireSuperAdmin = (req, res, next) => {
  try {
    if (!req.admin) {
      return res.status(401).json(formatError('Authentication required.', 401));
    }

    if (req.admin.role !== 'superadmin') {
      logger.warn(`Admin ${req.admin.email} attempted superadmin action`);
      return res.status(403).json(formatError('Superadmin access required.', 403));
    }

    next();
  } catch (error) {
    logger.error('Super admin check error:', error);
    res.status(500).json(formatError('Authorization error.', 500));
  }
};

/**
 * Extract token from request headers
 * @param {Object} req - Express request object
 * @returns {string|null} - JWT token or null
 */
const extractToken = (req) => {
  let token = null;

  // Check Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.substring(7);
  }
  
  // Check cookies (if needed for web interface)
  else if (req.cookies && req.cookies.adminToken) {
    token = req.cookies.adminToken;
  }
  
  // Check query parameter (for development only)
  else if (config.nodeEnv !== 'production' && req.query.token) {
    token = req.query.token;
  }

  return token;
};

/**
 * Generate JWT token for admin
 * @param {Object} admin - Admin object
 * @returns {string} - JWT token
 */
export const generateAdminToken = (admin) => {
  return jwt.sign(
    {
      id: admin._id.toString(),
      email: admin.email,
      role: admin.role
    },
    config.jwt.secret,
    {
      expiresIn: config.jwt.expiresIn,
      issuer: 'event-registration-api',
      subject: admin._id.toString()
    }
  );
};

/**
 * Middleware to optionally authenticate admin (doesn't fail if no token)
 */
export const optionalAdminAuth = async (req, res, next) => {
  try {
    const token = extractToken(req);
    
    if (!token) {
      return next();
    }

    const decoded = jwt.verify(token, config.jwt.secret);
    const admin = await Admin.findById(decoded.id);
    
    if (admin && admin.isActive && !admin.changedPasswordAfter(decoded.iat)) {
      req.admin = admin;
    }
    
    next();
  } catch (error) {
    // Don't fail, just continue without admin context
    logger.debug('Optional admin auth failed:', error.message);
    next();
  }
};

export default {
  authenticateAdmin,
  authorizeAdmin,
  requireSuperAdmin,
  generateAdminToken,
  optionalAdminAuth
};
