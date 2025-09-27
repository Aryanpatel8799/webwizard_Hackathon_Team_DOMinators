import logger from '../utils/logger.js';
import { formatError } from '../utils/helpers.js';
import config from '../config/index.js';

/**
 * Global error handler middleware
 */
export const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;

  // Log error
  logger.error('Error occurred:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    body: config.nodeEnv === 'development' ? req.body : 'hidden'
  });

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Invalid resource ID';
    error = { message, statusCode: 400 };
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    const message = `Duplicate value for field: ${field}`;
    error = { message, statusCode: 400 };
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors).map(val => ({
      field: val.path,
      message: val.message
    }));
    error = { 
      message: 'Validation failed', 
      statusCode: 400, 
      errors 
    };
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    error = { message: 'Invalid token', statusCode: 401 };
  }

  if (err.name === 'TokenExpiredError') {
    error = { message: 'Token expired', statusCode: 401 };
  }

  // Multer file upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    error = { message: 'File too large', statusCode: 400 };
  }

  if (err.code === 'LIMIT_FILE_COUNT') {
    error = { message: 'Too many files', statusCode: 400 };
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    error = { message: 'Unexpected file field', statusCode: 400 };
  }

  // Redis connection errors
  if (err.code === 'ECONNREFUSED' && err.port === 6379) {
    logger.warn('Redis connection failed, continuing without cache');
    error = { message: 'Cache service unavailable', statusCode: 503 };
  }

  // Database connection errors
  if (err.name === 'MongoNetworkError') {
    error = { message: 'Database connection error', statusCode: 503 };
  }

  if (err.name === 'MongoServerError') {
    error = { message: 'Database server error', statusCode: 503 };
  }

  // Rate limiting errors
  if (err.status === 429) {
    error = { message: 'Too many requests', statusCode: 429 };
  }

  // Default error
  const statusCode = error.statusCode || 500;
  const message = error.message || 'Internal server error';
  const errors = error.errors || null;

  // Don't expose internal errors in production
  const response = formatError(
    config.nodeEnv === 'production' && statusCode === 500 
      ? 'Internal server error' 
      : message,
    statusCode,
    errors
  );

  // Add error ID for tracking
  response.errorId = generateErrorId();

  res.status(statusCode).json(response);
};

/**
 * Handle 404 errors
 */
export const notFound = (req, res, next) => {
  const message = `Route not found: ${req.method} ${req.originalUrl}`;
  logger.warn(message, { ip: req.ip, userAgent: req.get('User-Agent') });
  
  res.status(404).json(formatError('Route not found', 404));
};

/**
 * Async error wrapper
 */
export const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Custom error class
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, errors = null) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Generate unique error ID for tracking
 */
const generateErrorId = () => {
  return `ERR_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Validation error handler
 */
export const handleValidationError = (errors) => {
  const formattedErrors = errors.map(error => ({
    field: error.path || error.param,
    message: error.msg,
    value: error.value
  }));

  throw new AppError('Validation failed', 400, formattedErrors);
};

/**
 * Database error handler
 */
export const handleDatabaseError = (error) => {
  logger.error('Database error:', error);
  
  if (error.name === 'MongoNetworkError') {
    throw new AppError('Database connection failed', 503);
  }
  
  if (error.code === 11000) {
    const field = Object.keys(error.keyValue)[0];
    throw new AppError(`Duplicate value for field: ${field}`, 400);
  }
  
  if (error.name === 'ValidationError') {
    const errors = Object.values(error.errors).map(val => ({
      field: val.path,
      message: val.message
    }));
    throw new AppError('Validation failed', 400, errors);
  }
  
  throw new AppError('Database operation failed', 500);
};

/**
 * File upload error handler
 */
export const handleFileUploadError = (error) => {
  if (error.code === 'LIMIT_FILE_SIZE') {
    throw new AppError('File size too large', 400);
  }
  
  if (error.code === 'LIMIT_FILE_COUNT') {
    throw new AppError('Too many files uploaded', 400);
  }
  
  if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    throw new AppError('Unexpected file field', 400);
  }
  
  throw new AppError('File upload failed', 400);
};

/**
 * External service error handler
 */
export const handleExternalServiceError = (serviceName, error) => {
  logger.error(`${serviceName} service error:`, error);
  
  if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
    throw new AppError(`${serviceName} service unavailable`, 503);
  }
  
  if (error.response && error.response.status >= 500) {
    throw new AppError(`${serviceName} service error`, 503);
  }
  
  throw new AppError(`${serviceName} request failed`, 400);
};

/**
 * Graceful shutdown handler
 */
export const gracefulShutdown = (server) => {
  return (signal) => {
    logger.info(`${signal} signal received: closing HTTP server`);
    
    server.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });

    // Force close server after 30secs
    setTimeout(() => {
      logger.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 30000);
  };
};

export default {
  errorHandler,
  notFound,
  asyncHandler,
  AppError,
  handleValidationError,
  handleDatabaseError,
  handleFileUploadError,
  handleExternalServiceError,
  gracefulShutdown
};
