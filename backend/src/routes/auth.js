import { Router } from 'express';
import { adminController } from '../controllers/index.js';
import { 
  validateAdminLogin, 
  validateAdminCreation,
  validateObjectId,
  handleValidationErrors
} from '../middleware/validation.js';
import { authenticateAdmin, requireSuperAdmin } from '../middleware/auth.js';
import { authLimiter, adminLimiter } from '../middleware/rateLimiter.js';
import { body } from 'express-validator';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = Router();

// Authentication routes
/**
 * @route   POST /api/auth/admin/login
 * @desc    Admin login
 * @access  Public
 */
router.post('/login',
  authLimiter,
  validateAdminLogin,
  asyncHandler(adminController.adminLogin)
);

/**
 * @route   POST /api/auth/admin/logout
 * @desc    Admin logout
 * @access  Admin
 */
router.post('/logout',
  authenticateAdmin,
  asyncHandler(adminController.adminLogout)
);

/**
 * @route   GET /api/auth/admin/validate
 * @desc    Validate admin token
 * @access  Admin
 */
router.get('/validate',
  authenticateAdmin,
  asyncHandler(adminController.validateToken)
);

// Profile management routes
/**
 * @route   GET /api/auth/admin/profile
 * @desc    Get current admin profile
 * @access  Admin
 */
router.get('/profile',
  authenticateAdmin,
  asyncHandler(adminController.getProfile)
);

/**
 * @route   PUT /api/auth/admin/profile
 * @desc    Update admin profile
 * @access  Admin
 */
router.put('/profile',
  authenticateAdmin,
  [
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be between 2 and 100 characters'),
    
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
  ],
  asyncHandler(adminController.updateProfile)
);

/**
 * @route   POST /api/auth/admin/change-password
 * @desc    Change admin password
 * @access  Admin
 */
router.post('/change-password',
  authenticateAdmin,
  [
    body('currentPassword')
      .notEmpty()
      .withMessage('Current password is required'),
    
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('New password must be at least 8 characters')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .withMessage('New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
    
    body('confirmPassword')
      .custom((value, { req }) => {
        if (value !== req.body.newPassword) {
          throw new Error('Password confirmation does not match new password');
        }
        return true;
      }),
    
    handleValidationErrors
  ],
  asyncHandler(adminController.changePassword)
);

// Admin management routes (superadmin only)
/**
 * @route   POST /api/auth/admin
 * @desc    Create new admin
 * @access  Superadmin
 */
router.post('/',
  adminLimiter,
  authenticateAdmin,
  requireSuperAdmin,
  validateAdminCreation,
  asyncHandler(adminController.createAdmin)
);

/**
 * @route   GET /api/auth/admin
 * @desc    Get all admins
 * @access  Superadmin
 */
router.get('/',
  adminLimiter,
  authenticateAdmin,
  requireSuperAdmin,
  asyncHandler(adminController.getAdmins)
);

/**
 * @route   PUT /api/auth/admin/:id
 * @desc    Update admin
 * @access  Superadmin
 */
router.put('/:id',
  adminLimiter,
  authenticateAdmin,
  requireSuperAdmin,
  validateObjectId('id'),
  [
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage('Name must be between 2 and 100 characters'),
    
    body('email')
      .optional()
      .isEmail()
      .withMessage('Valid email is required')
      .normalizeEmail(),
    
    body('role')
      .optional()
      .isIn(['admin', 'superadmin', 'moderator'])
      .withMessage('Invalid role'),
    
    body('isActive')
      .optional()
      .isBoolean()
      .withMessage('isActive must be a boolean'),
    
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
  ],
  asyncHandler(adminController.updateAdmin)
);

/**
 * @route   DELETE /api/auth/admin/:id
 * @desc    Deactivate admin
 * @access  Superadmin
 */
router.delete('/:id',
  adminLimiter,
  authenticateAdmin,
  requireSuperAdmin,
  validateObjectId('id'),
  asyncHandler(adminController.deactivateAdmin)
);

export default router;
