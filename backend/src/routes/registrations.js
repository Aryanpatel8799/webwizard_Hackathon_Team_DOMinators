import { Router } from 'express';
import { registrationController } from '../controllers/index.js';
import { 
  validateRegistration, 
  validateObjectId, 
  validateRegistrationStatus,
  validatePagination 
} from '../middleware/validation.js';
import { authenticateAdmin, authorizeAdmin } from '../middleware/auth.js';
import { registrationLimiter, adminLimiter } from '../middleware/rateLimiter.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

// Public routes
/**
 * @route   POST /api/events/:id/register
 * @desc    Register for an event
 * @access  Public
 */
router.post('/:id/register',
  registrationLimiter,
  validateObjectId('id'),
  validateRegistration,
  asyncHandler(registrationController.registerForEvent)
);

// Admin routes for managing registrations
/**
 * @route   GET /api/events/:id/registrations
 * @desc    Get event registrations with filters
 * @access  Admin
 */
router.get('/:id/registrations',
  adminLimiter,
  authenticateAdmin,
  authorizeAdmin('registrations', 'read'),
  validateObjectId('id'),
  validatePagination,
  asyncHandler(registrationController.getEventRegistrations)
);

/**
 * @route   GET /api/registrations/:id
 * @desc    Get registration by ID with ticket
 * @access  Admin
 */
router.get('/registrations/:id',
  adminLimiter,
  authenticateAdmin,
  authorizeAdmin('registrations', 'read'),
  validateObjectId('id'),
  asyncHandler(registrationController.getRegistrationById)
);

/**
 * @route   GET /api/registrations/:id/ticket
 * @desc    Get registration ticket (QR or PDF)
 * @access  Admin/Owner
 */
router.get('/registrations/:id/ticket',
  validateObjectId('id'),
  asyncHandler(registrationController.getRegistrationTicket)
);

/**
 * @route   POST /api/registrations/:id/promote
 * @desc    Promote registration from waiting to confirmed
 * @access  Admin
 */
router.post('/registrations/:id/promote',
  adminLimiter,
  authenticateAdmin,
  authorizeAdmin('registrations', 'update'),
  validateObjectId('id'),
  validateRegistrationStatus,
  asyncHandler(registrationController.promoteRegistration)
);

/**
 * @route   POST /api/registrations/:id/cancel
 * @desc    Cancel registration
 * @access  Admin
 */
router.post('/registrations/:id/cancel',
  adminLimiter,
  authenticateAdmin,
  authorizeAdmin('registrations', 'update'),
  validateObjectId('id'),
  validateRegistrationStatus,
  asyncHandler(registrationController.cancelRegistration)
);

/**
 * @route   PUT /api/registrations/:id
 * @desc    Update registration details
 * @access  Admin
 */
router.put('/registrations/:id',
  adminLimiter,
  authenticateAdmin,
  authorizeAdmin('registrations', 'update'),
  validateObjectId('id'),
  validateRegistration,
  asyncHandler(registrationController.updateRegistration)
);

export default router;
