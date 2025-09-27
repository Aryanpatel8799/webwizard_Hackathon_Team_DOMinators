import { Admin, AuditLog, Event, Registration } from '../models/index.js';
import { generateAdminToken } from '../middleware/auth.js';
import { formatSuccess, formatError } from '../utils/helpers.js';
import logger from '../utils/logger.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';
import mongoose from 'mongoose';
import { emailService } from '../services/index.js';

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

/**
 * Get analytics data for admin dashboard
 */
export const getAnalytics = asyncHandler(async (req, res) => {
  const { period = '30d' } = req.query;
  
  // Calculate date range
  const now = new Date();
  let startDate;
  
  switch (period) {
    case '7d':
      startDate = new Date(now.getTime() - (7 * 24 * 60 * 60 * 1000));
      break;
    case '30d':
      startDate = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
      break;
    case '90d':
      startDate = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000));
      break;
    default:
      startDate = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));
  }

  // Aggregate data
  const [eventsData, registrationsData] = await Promise.all([
    Event.aggregate([
      {
        $facet: {
          totalEvents: [{ $count: "count" }],
          activeEvents: [
            { $match: { isActive: true } },
            { $count: "count" }
          ],
          eventsByDate: [
            {
              $match: {
                createdAt: { $gte: startDate }
              }
            },
            {
              $group: {
                _id: {
                  $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
                },
                count: { $sum: 1 }
              }
            },
            { $sort: { "_id": 1 } }
          ],
          eventsByCategory: [
            {
              $group: {
                _id: "$category",
                count: { $sum: 1 },
                avgPrice: { $avg: "$price" }
              }
            }
          ]
        }
      }
    ]),
    Registration.aggregate([
      {
        $facet: {
          totalRegistrations: [{ $count: "count" }],
          registrationsByDate: [
            {
              $match: {
                createdAt: { $gte: startDate }
              }
            },
            {
              $group: {
                _id: {
                  $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
                },
                count: { $sum: 1 }
              }
            },
            { $sort: { "_id": 1 } }
          ],
          registrationsByStatus: [
            {
              $group: {
                _id: "$status",
                count: { $sum: 1 }
              }
            }
          ],
          revenueData: [
            {
              $lookup: {
                from: 'events',
                localField: 'eventId',
                foreignField: '_id',
                as: 'event'
              }
            },
            {
              $unwind: { path: '$event', preserveNullAndEmptyArrays: true }
            },
            {
              $match: {
                status: 'confirmed',
                'event.price': { $exists: true, $ne: null }
              }
            },
            {
              $group: {
                _id: null,
                totalRevenue: { $sum: '$event.price' },
                avgTicketPrice: { $avg: '$event.price' }
              }
            }
          ]
        }
      }
    ])
  ]);

  const events = eventsData[0];
  const registrations = registrationsData[0];

  const analytics = {
    totalEvents: events.totalEvents[0]?.count || 0,
    activeEvents: events.activeEvents[0]?.count || 0,
    totalRegistrations: registrations.totalRegistrations[0]?.count || 0,
    totalRevenue: registrations.revenueData[0]?.totalRevenue || 0,
    avgTicketPrice: registrations.revenueData[0]?.avgTicketPrice || 0,
    eventsByDate: events.eventsByDate || [],
    registrationsByDate: registrations.registrationsByDate || [],
    eventsByCategory: events.eventsByCategory || [],
    registrationsByStatus: registrations.registrationsByStatus || [],
    period,
    generatedAt: now
  };

  // Log analytics access
  logger.info('Analytics data retrieved', {
    adminId: req.admin._id,
    period,
    totalEvents: analytics.totalEvents,
    totalRegistrations: analytics.totalRegistrations
  });

  res.json(formatSuccess(analytics, 'Analytics data retrieved successfully'));
});

/**
 * Get all events for admin
 */
export const getAllEvents = asyncHandler(async (req, res) => {
  const { 
    page = 1, 
    limit = 10, 
    status = 'all', 
    search = '',
    category = 'all',
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = req.query;

  const pageNumber = Math.max(1, parseInt(page));
  const limitNumber = Math.min(100, Math.max(1, parseInt(limit)));
  const skip = (pageNumber - 1) * limitNumber;

  // Build filter
  let filter = {};
  
  if (status !== 'all') {
    if (status === 'active') {
      filter.isActive = true;
    } else if (status === 'inactive') {
      filter.isActive = false;
    }
  }

  if (category !== 'all') {
    filter.category = category;
  }

  if (search) {
    filter.$or = [
      { title: { $regex: search, $options: 'i' } },
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }

  // Build sort
  const sortOptions = {};
  sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

  const [events, totalCount] = await Promise.all([
    Event.find(filter)
      .sort(sortOptions)
      .skip(skip)
      .limit(limitNumber)
      .lean(),
    Event.countDocuments(filter)
  ]);

  // Get registration counts for events
  const eventIds = events.map(event => event._id);
  const registrationStats = await Registration.aggregate([
    { $match: { eventId: { $in: eventIds } } },
    { 
      $group: { 
        _id: '$eventId', 
        registeredCount: { $sum: 1 },
        approvedCount: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, 1, 0] } }
      } 
    }
  ]);

  // Add registration stats to events
  const eventsWithStats = events.map(event => {
    const stats = registrationStats.find(stat => stat._id.toString() === event._id.toString());
    return {
      ...event,
      registeredCount: stats?.registeredCount || 0,
      approvedCount: stats?.approvedCount || 0
    };
  });

  res.json(formatSuccess({
    events: eventsWithStats,
    pagination: {
      page: pageNumber,
      limit: limitNumber,
      total: totalCount,
      pages: Math.ceil(totalCount / limitNumber)
    },
    filters: { status, category, search, sortBy, sortOrder }
  }));
});

/**
 * Create a new event
 */
export const createEvent = asyncHandler(async (req, res) => {
  try {
    const { name, description, date, location, capacity, price, category } = req.body;

    // Map frontend fields to backend model fields
    const title = name;
    const venue = location;

    // Check if event already exists with same title and date
    const existingEvent = await Event.findOne({
      title: { $regex: new RegExp(`^${title}$`, 'i') },
      date: new Date(date)
    });

    if (existingEvent) {
      return res.status(400).json(formatError(
        'An event with this name already exists on the same date',
        400
      ));
    }

    const newEvent = new Event({
      title,
      description: description || '',
      date: new Date(date),
      venue,
      capacity: capacity || 100,
      price: price || 0,
      category: category || 'general',
      isActive: true,
      createdBy: req.admin.id
    });

    await newEvent.save();

    // Log the action
    await AuditLog.create({
      actor: req.admin.id,
      action: 'event.create',
      target: newEvent._id,
      targetType: 'Event',
      details: { title: newEvent.title, date: newEvent.date }
    });

    logger.info('Event created successfully', {
      eventId: newEvent._id,
      adminId: req.admin.id,
      eventTitle: newEvent.title
    });

    res.status(201).json(formatSuccess(newEvent, 'Event created successfully'));
  } catch (error) {
    logger.error('Error creating event:', error);
    throw error;
  }
});

/**
 * Update an event
 */
export const updateEvent = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const event = await Event.findById(id);
    if (!event) {
      return res.status(404).json(formatError('Event not found', 404));
    }

    // Map frontend fields to backend model fields and update only provided fields
    Object.keys(updateData).forEach(key => {
      if (updateData[key] !== undefined) {
        if (key === 'date') {
          event[key] = new Date(updateData[key]);
        } else if (key === 'name') {
          event.title = updateData[key];
        } else if (key === 'location') {
          event.venue = updateData[key];
        } else {
          event[key] = updateData[key];
        }
      }
    });

    await event.save();

    // Log the action
    await AuditLog.create({
      actor: req.admin.id,
      action: 'event.update',
      target: event._id,
      targetType: 'Event',
      details: { updatedFields: Object.keys(updateData) }
    });

    logger.info('Event updated successfully', {
      eventId: event._id,
      adminId: req.admin.id,
      updatedFields: Object.keys(updateData)
    });

    res.json(formatSuccess(event, 'Event updated successfully'));
  } catch (error) {
    logger.error('Error updating event:', error);
    throw error;
  }
});

/**
 * Get all registrations for admin
 */
export const getAllRegistrations = asyncHandler(async (req, res) => {
  try {
    logger.info('getAllRegistrations called', { 
      query: req.query, 
      adminId: req.admin?.id,
      permissions: req.admin?.effectivePermissions 
    });

    const { 
      page = 1, 
      limit = 10, 
      status = 'all', 
      search = '',
      eventId = 'all',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const pageNumber = Math.max(1, parseInt(page));
    const limitNumber = Math.min(100, Math.max(1, parseInt(limit)));
    const skip = (pageNumber - 1) * limitNumber;

    // Build filter
    let filter = {};
    
    if (status !== 'all') {
      filter.status = status;
    }

    if (eventId !== 'all' && mongoose.Types.ObjectId.isValid(eventId)) {
      filter.event = eventId;
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Build sort
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

    const [registrations, totalCount] = await Promise.all([
      Registration.find(filter)
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNumber)
        .populate('event', 'title name date venue location')
        .lean(),
      Registration.countDocuments(filter)
    ]);

    res.json(formatSuccess({
      registrations,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total: totalCount,
        pages: Math.ceil(totalCount / limitNumber)
      },
      filters: { status, eventId, search, sortBy, sortOrder }
    }));
  } catch (error) {
    logger.error('Error in getAllRegistrations:', error);
    throw error;
  }
});

/**
 * Approve a registration
 */
export const approveRegistration = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const registration = await Registration.findById(id);
  if (!registration) {
    throw new AppError('Registration not found', 404);
  }

  registration.status = 'confirmed';
  registration.approvedAt = new Date();
  registration.approvedBy = req.admin._id;
  await registration.save();

  // Log action
  await AuditLog.logAction({
    actor: req.admin._id,
    action: 'registration.approve',
    resourceType: 'registration',
    resourceId: id,
    details: {
      registrationId: id,
      participantEmail: registration.email
    }
  });

  logger.info(`Registration approved: ${id}`, {
    adminId: req.admin._id,
    registrationId: id
  });

  res.json(formatSuccess(registration, 'Registration approved successfully'));
});

/**
 * Delete/Cancel a registration
 */
export const deleteRegistration = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const registration = await Registration.findById(id);
  if (!registration) {
    throw new AppError('Registration not found', 404);
  }

  // Soft delete by updating status
  registration.status = 'cancelled';
  registration.cancelledAt = new Date();
  registration.cancelledBy = req.admin._id;
  await registration.save();

  // Log action
  await AuditLog.logAction({
    actor: req.admin._id,
    action: 'registration.cancel',
    resourceType: 'registration',
    resourceId: id,
    details: {
      registrationId: id,
      participantEmail: registration.email,
      reason: 'Admin cancellation'
    }
  });

  logger.info(`Registration cancelled: ${id}`, {
    adminId: req.admin._id,
    registrationId: id
  });

  res.json(formatSuccess(null, 'Registration cancelled successfully'));
});

/**
 * Delete an event
 */
export const deleteEvent = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const event = await Event.findById(id);
  if (!event) {
    throw new AppError('Event not found', 404);
  }

  // Check if event has registrations
  const registrationCount = await Registration.countDocuments({ 
    eventId: id, 
    status: { $ne: 'cancelled' } 
  });

  if (registrationCount > 0) {
    throw new AppError('Cannot delete event with active registrations', 400);
  }

  await Event.findByIdAndDelete(id);

  // Log action
  await AuditLog.logAction({
    actor: req.admin._id,
    action: 'event.delete',
    resourceType: 'event',
    resourceId: id,
    details: {
      eventTitle: event.title || event.name,
      eventDate: event.date
    }
  });

  logger.info(`Event deleted: ${id}`, {
    adminId: req.admin._id,
    eventId: id
  });

  res.json(formatSuccess(null, 'Event deleted successfully'));
});

/**
 * Send bulk email to event participants
 */
export const sendBulkEmail = asyncHandler(async (req, res) => {
  const { eventId, recipients, subject, message, template, includeAllParticipants } = req.body;

  let recipientList = [];

  try {
    if (includeAllParticipants && eventId) {
      // Get all participants of a specific event
      const registrations = await Registration.find({
        event: eventId,
        status: { $in: ['confirmed', 'waiting'] }
      }).populate('event', 'title date venue');

      if (registrations.length === 0) {
        return res.status(404).json(formatError('No participants found for this event', 404));
      }

      recipientList = registrations.map(reg => ({
        email: reg.email,
        name: reg.name,
        status: reg.status,
        event: {
          title: reg.event.title,
          date: reg.event.date,
          venue: reg.event.venue
        }
      }));
    } else if (recipients && Array.isArray(recipients)) {
      // Use provided recipient list
      recipientList = recipients;
    } else {
      return res.status(400).json(formatError('Either eventId with includeAllParticipants or recipients array is required', 400));
    }

    // Validate email addresses
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const validRecipients = recipientList.filter(recipient => 
      recipient.email && emailRegex.test(recipient.email)
    );

    if (validRecipients.length === 0) {
      return res.status(400).json(formatError('No valid email addresses found', 400));
    }

    let successCount = 0;
    let failureCount = 0;
    const errors = [];

    // Send emails
    for (const recipient of validRecipients) {
      try {
        let emailHtml;
        
        if (template) {
          // Use predefined template
          switch (template) {
            case 'event_update':
              emailHtml = emailService.getEventUpdateTemplate(recipient, message);
              break;
            case 'event_reminder':
              emailHtml = emailService.getEventReminderTemplate(recipient);
              break;
            case 'general':
            default:
              emailHtml = emailService.getGeneralTemplate(recipient.name, message);
          }
        } else {
          // Use custom message
          emailHtml = emailService.getGeneralTemplate(recipient.name, message);
        }

        await emailService.sendEmail({
          to: recipient.email,
          subject: subject || 'Important Update',
          html: emailHtml
        });

        successCount++;
      } catch (emailError) {
        failureCount++;
        errors.push(`Failed to send email to ${recipient.email}: ${emailError.message}`);
        logger.warn(`Failed to send email to ${recipient.email}:`, emailError);
      }
    }

    // Log audit trail
    await AuditLog.logAction({
      actor: req.admin._id,
      action: 'email.bulk_send',
      target: eventId || 'multiple',
      targetType: eventId ? 'Event' : 'BulkEmail',
      details: {
        subject,
        template,
        recipientsCount: validRecipients.length,
        successCount,
        failureCount,
        includeAllParticipants
      },
      context: {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    logger.info(`Bulk email sent by admin: ${req.admin._id}`, {
      eventId,
      recipients: validRecipients.length,
      success: successCount,
      failed: failureCount
    });

    res.json(formatSuccess({
      sent: successCount,
      failed: failureCount,
      total: validRecipients.length,
      errors: errors.length > 0 ? errors : undefined
    }, `Bulk email completed. ${successCount} sent, ${failureCount} failed.`));
  
  } catch (error) {
    logger.error('Bulk email sending failed:', error);
    throw new AppError('Failed to send bulk email', 500);
  }
});

/**
 * Get all participants across events for bulk email
 */
export const getAllParticipants = asyncHandler(async (req, res) => {
  const { 
    status = 'all', 
    eventId,
    page = 1, 
    limit = 100 
  } = req.query;

  const filters = {};
  
  if (eventId && eventId !== 'all') {
    filters.event = eventId;
  }
  
  if (status !== 'all') {
    filters.status = status;
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  try {
    const [participants, total] = await Promise.all([
      Registration.find(filters)
        .populate('event', 'title date venue')
        .select('name email phone college status event createdAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Registration.countDocuments(filters)
    ]);

    const formattedParticipants = participants.map(participant => ({
      _id: participant._id,
      name: participant.name,
      email: participant.email,
      phone: participant.phone,
      college: participant.college,
      status: participant.status,
      event: {
        _id: participant.event._id,
        title: participant.event.title,
        date: participant.event.date,
        venue: participant.event.venue
      },
      registeredAt: participant.createdAt
    }));

    res.json(formatSuccess({
      participants: formattedParticipants,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    }));

  } catch (error) {
    logger.error('Failed to fetch participants:', error);
    throw new AppError('Failed to fetch participants', 500);
  }
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
  validateToken,
  getAnalytics,
  getAllEvents,
  createEvent,
  updateEvent,
  getAllRegistrations,
  approveRegistration,
  deleteRegistration,
  deleteEvent,
  sendBulkEmail,
  getAllParticipants
};
