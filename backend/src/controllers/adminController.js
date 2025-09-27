import { Admin, AuditLog } from '../models/index.js';
import { generateAdminToken } from '../middleware/auth.js';
import { formatSuccess, formatError } from '../utils/helpers.js';
import logger from '../utils/logger.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';

/**
 * Admin login
 */
export const adminLogin = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  // Find admin with password field included
  const admin = await Admin.findActiveByEmail(email);
  
  if (!admin || !(await admin.comparePassword(password))) {
    // Log failed login attempt
    await AuditLog.logAction({
      actor: email,
      action: 'admin.login',
      details: { success: false },
      result: 'failure',
      context: {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        endpoint: req.originalUrl,
        method: req.method
      }
    });

    logger.warn(`Failed login attempt for admin: ${email}`, {
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });

    return res.status(401).json(formatError('Invalid email or password', 401));
  }

  // Update login info
  admin.lastLoginAt = new Date();
  await admin.save();

  // Generate JWT token
  const token = generateAdminToken(admin);

  // Log successful login
  await AuditLog.logAction({
    actor: admin._id,
    action: 'admin.login',
    details: { success: true },
    context: {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      endpoint: req.originalUrl,
      method: req.method
    }
  });

  logger.info(`Admin logged in: ${admin.email}`, {
    adminId: admin._id,
    role: admin.role,
    ip: req.ip
  });

  res.json(formatSuccess({
    token,
    admin: {
      id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      permissions: admin.effectivePermissions
    }
  }, 'Login successful'));
});

/**
 * Admin logout
 */
export const adminLogout = asyncHandler(async (req, res) => {
  // Log logout
  await AuditLog.logAction({
    actor: req.admin._id,
    action: 'admin.logout',
    details: {},
    context: {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    }
  });

  logger.info(`Admin logged out: ${req.admin.email}`, {
    adminId: req.admin._id
  });

  res.json(formatSuccess(null, 'Logged out successfully'));
});

/**
 * Get current admin profile
 */
export const getProfile = asyncHandler(async (req, res) => {
  const admin = await Admin.findById(req.admin._id)
    .select('-passwordHash');

  res.json(formatSuccess({
    admin: {
      id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      permissions: admin.effectivePermissions,
      lastLoginAt: admin.lastLoginAt,
      loginCount: admin.loginCount,
      createdAt: admin.createdAt,
      phone: admin.phone,
      department: admin.department
    }
  }));
});

/**
 * Update admin profile
 */
export const updateProfile = asyncHandler(async (req, res) => {
  const { name, phone, department } = req.body;
  
  const admin = await Admin.findById(req.admin._id);
  
  // Update allowed fields
  if (name) admin.name = name;
  if (phone) admin.phone = phone;
  if (department) admin.department = department;
  
  await admin.save();

  logger.info(`Admin profile updated: ${admin.email}`, {
    adminId: admin._id,
    updates: Object.keys(req.body)
  });

  res.json(formatSuccess({
    admin: {
      id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      phone: admin.phone,
      department: admin.department
    }
  }, 'Profile updated successfully'));
});

/**
 * Change admin password
 */
export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  
  const admin = await Admin.findById(req.admin._id).select('+passwordHash');
  
  // Verify current password
  if (!(await admin.comparePassword(currentPassword))) {
    return res.status(400).json(formatError('Current password is incorrect', 400));
  }
  
  // Update password
  admin.passwordHash = newPassword; // Pre-save hook will hash it
  await admin.save();

  // Log password change
  await AuditLog.logAction({
    actor: admin._id,
    action: 'admin.update',
    details: { action: 'password_change' },
    context: {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    }
  });

  logger.info(`Admin changed password: ${admin.email}`, {
    adminId: admin._id
  });

  res.json(formatSuccess(null, 'Password changed successfully'));
});

/**
 * Create new admin (superadmin only)
 */
export const createAdmin = asyncHandler(async (req, res) => {
  const { name, email, password, role = 'admin', phone, department } = req.body;

  // Check if admin with email already exists
  const existingAdmin = await Admin.findOne({ email: email.toLowerCase() });
  if (existingAdmin) {
    return res.status(400).json(formatError('Admin with this email already exists', 400));
  }

  // Create admin
  const admin = new Admin({
    name,
    email: email.toLowerCase(),
    passwordHash: password, // Will be hashed by pre-save hook
    role,
    phone,
    department
  });

  await admin.save();

  // Log admin creation
  await AuditLog.logAction({
    actor: req.admin._id,
    action: 'admin.create',
    target: admin._id,
    targetType: 'Admin',
    details: {
      newAdminEmail: admin.email,
      role: admin.role
    },
    context: {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    }
  });

  logger.info(`New admin created: ${admin.email}`, {
    adminId: admin._id,
    role: admin.role,
    createdBy: req.admin._id
  });

  res.status(201).json(formatSuccess({
    admin: {
      id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      isActive: admin.isActive,
      createdAt: admin.createdAt
    }
  }, 'Admin created successfully'));
});

/**
 * Get all admins (superadmin only)
 */
export const getAdmins = asyncHandler(async (req, res) => {
  const admins = await Admin.find()
    .select('-passwordHash')
    .sort({ createdAt: -1 });

  res.json(formatSuccess(admins));
});

/**
 * Update admin (superadmin only)
 */
export const updateAdmin = asyncHandler(async (req, res) => {
  const { id: adminId } = req.params;
  const updates = req.body;

  // Don't allow updating password through this endpoint
  delete updates.passwordHash;
  delete updates.password;

  const admin = await Admin.findById(adminId);
  if (!admin) {
    return res.status(404).json(formatError('Admin not found', 404));
  }

  // Store original data for audit
  const originalData = {
    name: admin.name,
    email: admin.email,
    role: admin.role,
    isActive: admin.isActive
  };

  // Update admin
  Object.assign(admin, updates);
  await admin.save();

  // Log admin update
  await AuditLog.logAction({
    actor: req.admin._id,
    action: 'admin.update',
    target: admin._id,
    targetType: 'Admin',
    details: {
      originalData,
      updatedData: updates
    },
    context: {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    }
  });

  logger.info(`Admin updated: ${admin.email}`, {
    adminId: admin._id,
    updatedBy: req.admin._id,
    updates: Object.keys(updates)
  });

  res.json(formatSuccess({
    admin: {
      id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      isActive: admin.isActive,
      updatedAt: admin.updatedAt
    }
  }, 'Admin updated successfully'));
});

/**
 * Deactivate admin (superadmin only)
 */
export const deactivateAdmin = asyncHandler(async (req, res) => {
  const { id: adminId } = req.params;

  if (adminId === req.admin._id.toString()) {
    return res.status(400).json(formatError('Cannot deactivate your own account', 400));
  }

  const admin = await Admin.findById(adminId);
  if (!admin) {
    return res.status(404).json(formatError('Admin not found', 404));
  }

  admin.isActive = false;
  await admin.save();

  // Log admin deactivation
  await AuditLog.logAction({
    actor: req.admin._id,
    action: 'admin.delete',
    target: admin._id,
    targetType: 'Admin',
    details: {
      deactivatedAdminEmail: admin.email,
      action: 'deactivate'
    },
    context: {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    }
  });

  logger.info(`Admin deactivated: ${admin.email}`, {
    adminId: admin._id,
    deactivatedBy: req.admin._id
  });

  res.json(formatSuccess(null, 'Admin deactivated successfully'));
});

/**
 * Validate admin token (for token refresh)
 */
export const validateToken = asyncHandler(async (req, res) => {
  // If we reach here, token is valid (middleware already validated it)
  res.json(formatSuccess({
    valid: true,
    admin: {
      id: req.admin._id,
      email: req.admin.email,
      role: req.admin.role,
      permissions: req.admin.effectivePermissions
    }
  }));
});

export default {
  adminLogin,
  adminLogout,
  getProfile,
  updateProfile,
  changePassword,
  createAdmin,
  getAdmins,
  updateAdmin,
  deactivateAdmin,
  validateToken
};
