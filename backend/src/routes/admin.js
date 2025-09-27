import { Router } from 'express';
import { csvController } from '../controllers/index.js';
import { 
  validateObjectId, 
  validatePagination,
  handleValidationErrors 
} from '../middleware/validation.js';
import { authenticateAdmin, authorizeAdmin } from '../middleware/auth.js';
import { 
  csvImportLimiter, 
  adminLimiter, 
  downloadLimiter 
} from '../middleware/rateLimiter.js';
import { 
  csvUpload, 
  validateCSVFile, 
  uploadWithErrorHandler,
  getFileInfo
} from '../middleware/upload.js';
import { query, body } from 'express-validator';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

// All CSV routes require admin authentication
router.use(authenticateAdmin);

/**
 * @route   POST /api/admin/events/:id/import
 * @desc    Import registrations from CSV
 * @access  Admin
 */
router.post('/events/:id/import',
  csvImportLimiter,
  authorizeAdmin('registrations', 'create'),
  validateObjectId('id'),
  uploadWithErrorHandler(csvUpload),
  validateCSVFile,
  getFileInfo,
  [
    body('skipDuplicates')
      .optional()
      .isBoolean()
      .withMessage('skipDuplicates must be a boolean'),
    
    body('sendEmails')
      .optional()
      .isBoolean()
      .withMessage('sendEmails must be a boolean'),
    
    handleValidationErrors
  ],
  asyncHandler(csvController.importRegistrations)
);

/**
 * @route   GET /api/admin/events/:id/export
 * @desc    Export event registrations to CSV
 * @access  Admin
 */
router.get('/events/:id/export',
  adminLimiter,
  authorizeAdmin('registrations', 'read'),
  validateObjectId('id'),
  [
    query('status')
      .optional()
      .isIn(['confirmed', 'waiting', 'cancelled', 'all'])
      .withMessage('Invalid status filter'),
    
    query('includeMetadata')
      .optional()
      .isBoolean()
      .withMessage('includeMetadata must be a boolean'),
    
    handleValidationErrors
  ],
  asyncHandler(csvController.exportRegistrations)
);

/**
 * @route   GET /api/admin/csv/download/:filename
 * @desc    Download CSV file
 * @access  Admin
 */
router.get('/download/:filename',
  downloadLimiter,
  authorizeAdmin('registrations', 'read'),
  asyncHandler(csvController.downloadCSV)
);

/**
 * @route   GET /api/admin/csv/template
 * @desc    Download CSV import template
 * @access  Admin
 */
router.get('/template',
  downloadLimiter,
  authorizeAdmin('registrations', 'read'),
  asyncHandler(csvController.getImportTemplate)
);

/**
 * @route   GET /api/admin/analytics
 * @desc    Get system analytics
 * @access  Admin
 */
router.get('/analytics',
  adminLimiter,
  authorizeAdmin('events', 'read'),
  [
    query('period')
      .optional()
      .isIn(['7d', '30d', '90d', '1y'])
      .withMessage('Invalid period. Must be 7d, 30d, 90d, or 1y'),
    
    handleValidationErrors
  ],
  asyncHandler(csvController.getAnalytics)
);

/**
 * @route   GET /api/admin/audit
 * @desc    Get audit logs
 * @access  Admin
 */
router.get('/audit',
  adminLimiter,
  authorizeAdmin('admin', 'read'),
  validatePagination,
  [
    query('action')
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Action filter cannot exceed 100 characters'),
    
    query('result')
      .optional()
      .isIn(['success', 'failure', 'partial'])
      .withMessage('Invalid result filter'),
    
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('Start date must be a valid ISO 8601 date'),
    
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('End date must be a valid ISO 8601 date'),
    
    handleValidationErrors
  ],
  asyncHandler(csvController.getAuditLogs)
);

/**
 * @route   GET /api/admin/audit/summary
 * @desc    Get audit summary
 * @access  Admin
 */
router.get('/audit/summary',
  adminLimiter,
  authorizeAdmin('admin', 'read'),
  [
    query('days')
      .optional()
      .isInt({ min: 1, max: 365 })
      .withMessage('Days must be between 1 and 365'),
    
    handleValidationErrors
  ],
  asyncHandler(csvController.getAuditSummary)
);

export default router;
