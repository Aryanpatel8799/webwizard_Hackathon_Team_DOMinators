import { Router } from 'express';
import { eventController } from '../controllers/index.js';
import { validateEvent, validateObjectId, validateEventFilters } from '../middleware/validation.js';
import { authenticateAdmin, authorizeAdmin } from '../middleware/auth.js';
import { adminLimiter } from '../middleware/rateLimiter.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

// Public routes
/**
 * @route   GET /api/events
 * @desc    Get all events with registration statistics
 * @access  Public
 */
router.get('/', 
  validateEventFilters,
  asyncHandler(eventController.getEvents)
);

/**
 * @route   GET /api/events/:id
 * @desc    Get single event by ID with detailed statistics
 * @access  Public
 */
router.get('/:id',
  validateObjectId('id'),
  asyncHandler(eventController.getEventById)
);

// Admin routes (require authentication and authorization)
/**
 * @route   POST /api/events
 * @desc    Create new event
 * @access  Admin
 */
router.post('/',
  adminLimiter,
  authenticateAdmin,
  authorizeAdmin('events', 'create'),
  validateEvent,
  asyncHandler(eventController.createEvent)
);

/**
 * @route   PUT /api/events/:id
 * @desc    Update event
 * @access  Admin
 */
router.put('/:id',
  adminLimiter,
  authenticateAdmin,
  authorizeAdmin('events', 'update'),
  validateObjectId('id'),
  validateEvent,
  asyncHandler(eventController.updateEvent)
);

/**
 * @route   DELETE /api/events/:id
 * @desc    Delete event (soft delete)
 * @access  Admin
 */
router.delete('/:id',
  adminLimiter,
  authenticateAdmin,
  authorizeAdmin('events', 'delete'),
  validateObjectId('id'),
  asyncHandler(eventController.deleteEvent)
);

/**
 * @route   GET /api/events/:id/analytics
 * @desc    Get event analytics
 * @access  Admin
 */
router.get('/:id/analytics',
  adminLimiter,
  authenticateAdmin,
  authorizeAdmin('events', 'read'),
  validateObjectId('id'),
  asyncHandler(eventController.getEventAnalytics)
);

export default router;
