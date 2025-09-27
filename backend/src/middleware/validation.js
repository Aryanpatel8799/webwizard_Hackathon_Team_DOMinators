import { body, param, query, validationResult } from 'express-validator';
import mongoose from 'mongoose';
import { formatError } from '../utils/helpers.js';

/**
 * Handle validation errors
 */
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(error => ({
      field: error.path || error.param,
      message: error.msg,
      value: error.value
    }));
    
    return res.status(400).json(formatError(
      'Validation failed',
      400,
      formattedErrors
    ));
  }
  
  next();
};

/**
 * Event validation rules
 */
export const validateEvent = [
  body('title')
    .trim()
    .notEmpty()
    .withMessage('Event title is required')
    .isLength({ max: 200 })
    .withMessage('Title cannot exceed 200 characters'),
    
  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description cannot exceed 2000 characters'),
    
  body('capacity')
    .isInt({ min: 1, max: 10000 })
    .withMessage('Capacity must be between 1 and 10,000'),
    
  body('date')
    .isISO8601()
    .withMessage('Date must be a valid ISO 8601 date')
    .custom((value) => {
      if (new Date(value) <= new Date()) {
        throw new Error('Event date must be in the future');
      }
      return true;
    }),
    
  body('venue')
    .trim()
    .notEmpty()
    .withMessage('Venue is required')
    .isLength({ max: 300 })
    .withMessage('Venue cannot exceed 300 characters'),
    
  body('category')
    .optional()
    .isIn(['hackathon', 'workshop', 'seminar', 'conference', 'networking', 'other'])
    .withMessage('Invalid event category'),
    
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
    
  body('tags.*')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Each tag cannot exceed 50 characters'),
    
  body('registrationDeadline')
    .optional()
    .isISO8601()
    .withMessage('Registration deadline must be a valid ISO 8601 date')
    .custom((value, { req }) => {
      if (value && new Date(value) > new Date(req.body.date)) {
        throw new Error('Registration deadline cannot be after event date');
      }
      return true;
    }),
    
  body('organizer.name')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Organizer name cannot exceed 100 characters'),
    
  body('organizer.email')
    .optional()
    .isEmail()
    .withMessage('Invalid organizer email'),
    
  body('organizer.phone')
    .optional()
    .trim()
    .matches(/^[\+]?[1-9][\d\s\-\(\)]{0,15}$/)
    .withMessage('Invalid organizer phone number'),
    
  handleValidationErrors
];

/**
 * Registration validation rules
 */
export const validateRegistration = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ max: 100 })
    .withMessage('Name cannot exceed 100 characters'),
    
  body('email')
    .trim()
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
    
  body('phone')
    .optional()
    .trim()
    .matches(/^[\+]?[1-9][\d\s\-\(\)]{0,15}$/)
    .withMessage('Invalid phone number format'),
    
  body('college')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('College name cannot exceed 200 characters'),
    
  handleValidationErrors
];

/**
 * Admin login validation rules
 */
export const validateAdminLogin = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
    
  body('password')
    .notEmpty()
    .withMessage('Password is required')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
    
  handleValidationErrors
];

/**
 * Admin creation validation rules
 */
export const validateAdminCreation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ max: 100 })
    .withMessage('Name cannot exceed 100 characters'),
    
  body('email')
    .trim()
    .isEmail()
    .withMessage('Valid email is required')
    .normalizeEmail(),
    
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
    
  body('role')
    .optional()
    .isIn(['admin', 'superadmin', 'moderator'])
    .withMessage('Invalid role'),
    
  body('phone')
    .optional()
    .trim()
    .matches(/^[\+]?[1-9][\d\s\-\(\)]{0,15}$/)
    .withMessage('Invalid phone number format'),
    
  body('department')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Department cannot exceed 100 characters'),
    
  handleValidationErrors
];

/**
 * MongoDB ObjectId validation
 */
export const validateObjectId = (paramName = 'id') => [
  param(paramName)
    .custom((value) => {
      if (!mongoose.Types.ObjectId.isValid(value)) {
        throw new Error(`Invalid ${paramName}`);
      }
      return true;
    }),
    
  handleValidationErrors
];

/**
 * Pagination validation
 */
export const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
    
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
    
  query('search')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Search query cannot exceed 200 characters'),
    
  handleValidationErrors
];

/**
 * Registration status validation
 */
export const validateRegistrationStatus = [
  body('status')
    .isIn(['confirmed', 'waiting', 'cancelled'])
    .withMessage('Status must be confirmed, waiting, or cancelled'),
    
  body('reason')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Reason cannot exceed 500 characters'),
    
  handleValidationErrors
];

/**
 * Query filters validation
 */
export const validateEventFilters = [
  query('status')
    .optional()
    .isIn(['confirmed', 'waiting', 'cancelled'])
    .withMessage('Invalid status filter'),
    
  query('category')
    .optional()
    .isIn(['hackathon', 'workshop', 'seminar', 'conference', 'networking', 'other'])
    .withMessage('Invalid category filter'),
    
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
    
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date'),
    
  handleValidationErrors
];

/**
 * File upload validation
 */
export const validateFileUpload = [
  body('importType')
    .optional()
    .isIn(['replace', 'append'])
    .withMessage('Import type must be replace or append'),
    
  body('sendEmails')
    .optional()
    .isBoolean()
    .withMessage('Send emails must be a boolean'),
    
  handleValidationErrors
];

/**
 * Custom sanitizer for HTML content
 */
export const sanitizeHtml = (field) => {
  return body(field)
    .customSanitizer((value) => {
      if (typeof value === 'string') {
        // Remove script tags and other potentially dangerous content
        return value
          .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
          .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
          .replace(/javascript:/gi, '')
          .trim();
      }
      return value;
    });
};

/**
 * Rate limiting validation
 */
export const validateRateLimit = [
  query('windowMs')
    .optional()
    .isInt({ min: 1000, max: 3600000 })
    .withMessage('Window must be between 1 second and 1 hour'),
    
  query('max')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Max requests must be between 1 and 1000'),
    
  handleValidationErrors
];

export default {
  handleValidationErrors,
  validateEvent,
  validateRegistration,
  validateAdminLogin,
  validateAdminCreation,
  validateObjectId,
  validatePagination,
  validateRegistrationStatus,
  validateEventFilters,
  validateFileUpload,
  sanitizeHtml,
  validateRateLimit
};
