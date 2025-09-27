import { Router } from 'express';
import { csvController, adminController } from '../controllers/index.js';
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

// All admin routes require authentication
router.use(authenticateAdmin);

/**
 * @route   GET /api/admin/analytics
 * @desc    Get analytics data for admin dashboard
 * @access  Admin
 */
router.get('/analytics',
  adminLimiter,
  authorizeAdmin('analytics', 'read'),
  [
    query('period')
      .optional()
      .isIn(['7d', '30d', '90d'])
      .withMessage('Period must be one of: 7d, 30d, 90d'),
    
    handleValidationErrors
  ],
  asyncHandler(adminController.getAnalytics)
);

/**
 * @route   GET /api/admin/events
 * @desc    Get all events for admin
 * @access  Admin
 */
router.get('/events',
  adminLimiter,
  authorizeAdmin('events', 'read'),
  [
    ...validatePagination,
    query('status')
      .optional()
      .isIn(['all', 'active', 'inactive'])
      .withMessage('Status must be one of: all, active, inactive'),
    query('category')
      .optional()
      .isString()
      .withMessage('Category must be a string'),
    query('search')
      .optional()
      .isString()
      .withMessage('Search must be a string'),
    query('sortBy')
      .optional()
      .isIn(['createdAt', 'date', 'title', 'name'])
      .withMessage('SortBy must be one of: createdAt, date, title, name'),
    query('sortOrder')
      .optional()
      .isIn(['asc', 'desc'])
      .withMessage('SortOrder must be asc or desc'),
    
    handleValidationErrors
  ],
  asyncHandler(adminController.getAllEvents)
);

/**
 * @route   POST /api/admin/events
 * @desc    Create a new event
 * @access  Admin
 */
router.post('/events',
  adminLimiter,
  authorizeAdmin('events', 'create'),
  [
    body('name')
      .notEmpty()
      .withMessage('Event name is required')
      .isLength({ max: 100 })
      .withMessage('Event name must be less than 100 characters'),
    body('date')
      .notEmpty()
      .withMessage('Event date is required')
      .isISO8601()
      .withMessage('Event date must be a valid date'),
    body('location')
      .notEmpty()
      .withMessage('Event location is required')
      .isLength({ max: 200 })
      .withMessage('Location must be less than 200 characters'),
    body('capacity')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Capacity must be a positive integer'),
    body('price')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Price must be a non-negative number'),
    
    handleValidationErrors
  ],
  asyncHandler(adminController.createEvent)
);

/**
 * @route   PUT /api/admin/events/:id
 * @desc    Update an event
 * @access  Admin
 */
router.put('/events/:id',
  adminLimiter,
  authorizeAdmin('events', 'update'),
  [
    validateObjectId('id'),
    body('name')
      .optional()
      .isLength({ max: 100 })
      .withMessage('Event name must be less than 100 characters'),
    body('date')
      .optional()
      .isISO8601()
      .withMessage('Event date must be a valid date'),
    body('location')
      .optional()
      .isLength({ max: 200 })
      .withMessage('Location must be less than 200 characters'),
    body('capacity')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Capacity must be a positive integer'),
    body('price')
      .optional()
      .isFloat({ min: 0 })
      .withMessage('Price must be a non-negative number'),
    
    handleValidationErrors
  ],
  asyncHandler(adminController.updateEvent)
);

/**
 * @route   GET /api/admin/registrations
 * @desc    Get all registrations for admin
 * @access  Admin
 */
router.get('/registrations',
  adminLimiter,
  authorizeAdmin('registrations', 'read'),
  [
    ...validatePagination,
    query('status')
      .optional()
      .isIn(['all', 'pending', 'confirmed', 'cancelled', 'waitlisted'])
      .withMessage('Status must be one of: all, pending, confirmed, cancelled, waitlisted'),
    query('eventId')
      .optional()
      .custom(value => value === 'all' || validateObjectId('eventId')(value))
      .withMessage('EventId must be "all" or a valid ObjectId'),
    query('search')
      .optional()
      .isString()
      .withMessage('Search must be a string'),
    query('sortBy')
      .optional()
      .isIn(['createdAt', 'name', 'email', 'status'])
      .withMessage('SortBy must be one of: createdAt, name, email, status'),
    query('sortOrder')
      .optional()
      .isIn(['asc', 'desc'])
      .withMessage('SortOrder must be asc or desc'),
    
    handleValidationErrors
  ],
  asyncHandler(adminController.getAllRegistrations)
);

/**
 * @route   PUT /api/admin/registrations/:id/approve
 * @desc    Approve a registration
 * @access  Admin
 */
router.put('/registrations/:id/approve',
  adminLimiter,
  authorizeAdmin('registrations', 'update'),
  validateObjectId('id'),
  handleValidationErrors,
  asyncHandler(adminController.approveRegistration)
);

/**
 * @route   DELETE /api/admin/registrations/:id
 * @desc    Cancel/Delete a registration
 * @access  Admin
 */
router.delete('/registrations/:id',
  adminLimiter,
  authorizeAdmin('registrations', 'delete'),
  validateObjectId('id'),
  handleValidationErrors,
  asyncHandler(adminController.deleteRegistration)
);

/**
 * @route   DELETE /api/admin/events/:id
 * @desc    Delete an event
 * @access  Admin
 */
router.delete('/events/:id',
  adminLimiter,
  authorizeAdmin('events', 'delete'),
  validateObjectId('id'),
  handleValidationErrors,
  asyncHandler(adminController.deleteEvent)
);

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

/**
 * @route   POST /api/admin/emails/bulk
 * @desc    Send bulk email to event participants
 * @access  Admin
 */
router.post('/emails/bulk',
  adminLimiter,
  authorizeAdmin('events', 'read'), // Need to read events/registrations to send emails
  [
    body('subject')
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage('Subject is required and must be less than 200 characters'),
    
    body('message')
      .trim()
      .isLength({ min: 1, max: 5000 })
      .withMessage('Message is required and must be less than 5000 characters'),
    
    body('template')
      .optional()
      .isIn(['event_update', 'event_reminder', 'general'])
      .withMessage('Template must be one of: event_update, event_reminder, general'),
    
    body('eventId')
      .optional()
      .isMongoId()
      .withMessage('Event ID must be a valid MongoDB ObjectId'),
    
    body('includeAllParticipants')
      .optional()
      .isBoolean()
      .withMessage('includeAllParticipants must be a boolean'),
    
    body('recipients')
      .optional()
      .isArray()
      .withMessage('Recipients must be an array'),
    
    body('recipients.*.email')
      .if(body('recipients').exists())
      .isEmail()
      .withMessage('Each recipient must have a valid email'),
    
    body('recipients.*.name')
      .if(body('recipients').exists())
      .trim()
      .isLength({ min: 1 })
      .withMessage('Each recipient must have a name'),
    
    handleValidationErrors
  ],
  asyncHandler(adminController.sendBulkEmail)
);

/**
 * @route   GET /api/admin/participants
 * @desc    Get all participants for bulk email
 * @access  Admin
 */
router.get('/participants',
  adminLimiter,
  authorizeAdmin('registrations', 'read'),
  [
    query('status')
      .optional()
      .isIn(['all', 'confirmed', 'waiting', 'cancelled'])
      .withMessage('Status must be one of: all, confirmed, waiting, cancelled'),
    
    query('eventId')
      .optional()
      .custom((value) => {
        if (value && value !== 'all' && !value.match(/^[0-9a-fA-F]{24}$/)) {
          throw new Error('Event ID must be a valid MongoDB ObjectId or "all"');
        }
        return true;
      }),
    
    validatePagination,
    
    handleValidationErrors
  ],
  asyncHandler(adminController.getAllParticipants)
);

export default router;
