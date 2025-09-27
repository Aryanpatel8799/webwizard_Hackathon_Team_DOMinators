import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { getRedisClient } from '../config/redis.js';
import config from '../config/index.js';
import logger from '../utils/logger.js';
import { formatError } from '../utils/helpers.js';

/**
 * Create rate limiter with Redis store (falls back to memory store)
 * @param {Object} options - Rate limit options
 * @returns {Function} - Express middleware
 */
const createRateLimiter = (options = {}) => {
  const defaults = {
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    message: formatError('Too many requests, please try again later.', 429),
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn(`Rate limit exceeded for IP: ${req.ip}, User-Agent: ${req.get('User-Agent')}`);
      res.status(429).json(options.message || defaults.message);
    }
  };

  const rateLimitOptions = { ...defaults, ...options };

  // Try to use Redis store if available
  const redisClient = getRedisClient();
  if (redisClient) {
    try {
      rateLimitOptions.store = new RedisStore({
        sendCommand: (...args) => redisClient.sendCommand(args),
        prefix: 'rl:',
      });
      logger.info('Rate limiter using Redis store');
    } catch (error) {
      logger.warn('Failed to initialize Redis store for rate limiting, using memory store:', error);
    }
  } else {
    logger.info('Rate limiter using memory store');
  }

  return rateLimit(rateLimitOptions);
};

/**
 * General API rate limiter
 */
export const apiLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: formatError('Too many API requests, please try again in 15 minutes.', 429)
});

/**
 * Registration endpoint rate limiter (stricter)
 */
export const registrationLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 3, // Limit each IP to 3 registration attempts per minute
  message: formatError('Too many registration attempts, please try again in a minute.', 429),
  skipSuccessfulRequests: true // Don't count successful requests
});

/**
 * Authentication rate limiter
 */
export const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit each IP to 5 login attempts per windowMs
  message: formatError('Too many login attempts, please try again in 15 minutes.', 429),
  skipSuccessfulRequests: true
});

/**
 * Admin API rate limiter
 */
export const adminLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Higher limit for admin operations
  message: formatError('Too many admin API requests, please try again in 15 minutes.', 429)
});

/**
 * CSV import rate limiter
 */
export const csvImportLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 CSV imports per hour
  message: formatError('Too many CSV import attempts, please try again in an hour.', 429)
});

/**
 * Email sending rate limiter
 */
export const emailLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Limit email operations
  message: formatError('Too many email operations, please try again in a minute.', 429)
});

/**
 * File download rate limiter
 */
export const downloadLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // Limit downloads
  message: formatError('Too many download requests, please try again in a minute.', 429)
});

/**
 * Create custom rate limiter for specific use cases
 * @param {string} prefix - Redis key prefix
 * @param {Object} options - Rate limit options
 */
export const createCustomLimiter = (prefix, options) => {
  return createRateLimiter({
    ...options,
    keyGenerator: (req) => `${prefix}:${req.ip}`,
  });
};

/**
 * Skip rate limiting for trusted IPs (localhost, etc.)
 */
export const skipTrustedIPs = (req) => {
  const trustedIPs = ['127.0.0.1', '::1', '::ffff:127.0.0.1'];
  return config.nodeEnv === 'development' && trustedIPs.includes(req.ip);
};

/**
 * Create rate limiter that skips for authenticated admins
 */
export const createAdminSkipLimiter = (options) => {
  return createRateLimiter({
    ...options,
    skip: (req) => {
      // Skip rate limiting for authenticated admins
      return req.admin && req.admin.role === 'superadmin';
    }
  });
};

/**
 * Dynamic rate limiter based on user type
 */
export const dynamicLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: (req) => {
    if (req.admin) {
      // Higher limits for admins
      return req.admin.role === 'superadmin' ? 1000 : 500;
    }
    // Standard limit for regular users
    return 100;
  },
  keyGenerator: (req) => {
    // Use admin ID for authenticated requests, IP for others
    return req.admin ? `admin:${req.admin._id}` : `ip:${req.ip}`;
  }
});

/**
 * Rate limiter for WebSocket connections
 */
export const websocketLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 connection attempts per minute
  message: formatError('Too many WebSocket connection attempts.', 429)
});

/**
 * Global rate limiter with different limits for different endpoints
 */
export const smartLimiter = (req, res, next) => {
  let limiter;

  if (req.path.includes('/auth/')) {
    limiter = authLimiter;
  } else if (req.path.includes('/register')) {
    limiter = registrationLimiter;
  } else if (req.path.includes('/admin/')) {
    limiter = adminLimiter;
  } else if (req.path.includes('/import')) {
    limiter = csvImportLimiter;
  } else if (req.path.includes('/export') || req.path.includes('/download')) {
    limiter = downloadLimiter;
  } else {
    limiter = apiLimiter;
  }

  limiter(req, res, next);
};

export default {
  apiLimiter,
  registrationLimiter,
  authLimiter,
  adminLimiter,
  csvImportLimiter,
  emailLimiter,
  downloadLimiter,
  createCustomLimiter,
  skipTrustedIPs,
  createAdminSkipLimiter,
  dynamicLimiter,
  websocketLimiter,
  smartLimiter
};
