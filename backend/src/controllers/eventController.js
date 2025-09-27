import mongoose from 'mongoose';
import { Event, Registration, AuditLog } from '../models/index.js';
import { formatSuccess, formatError, getPaginationParams, formatPaginatedResponse } from '../utils/helpers.js';
import logger from '../utils/logger.js';
import { asyncHandler } from '../middleware/errorHandler.js';

/**
 * Get all events with registration statistics
 */
export const getEvents = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPaginationParams(req.query);
  const { category, search, startDate, endDate } = req.query;

  // Build query
  const query = { isActive: true };

  if (category) {
    query.category = category;
  }

  if (search) {
    query.$or = [
      { title: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } },
      { venue: { $regex: search, $options: 'i' } }
    ];
  }

  if (startDate || endDate) {
    query.date = {};
    if (startDate) query.date.$gte = new Date(startDate);
    if (endDate) query.date.$lte = new Date(endDate);
  }

  // Get events with registration counts
  const pipeline = [
    { $match: query },
    {
      $lookup: {
        from: 'registrations',
        localField: '_id',
        foreignField: 'event',
        as: 'registrations'
      }
    },
    {
      $addFields: {
        confirmedCount: {
          $size: {
            $filter: {
              input: '$registrations',
              cond: { $eq: ['$$this.status', 'confirmed'] }
            }
          }
        },
        waitingCount: {
          $size: {
            $filter: {
              input: '$registrations',
              cond: { $eq: ['$$this.status', 'waiting'] }
            }
          }
        },
        availableSeats: {
          $subtract: ['$capacity', '$attendeesCount']
        }
      }
    },
    {
      $project: {
        registrations: 0 // Don't return full registrations array
      }
    },
    { $sort: { date: 1 } },
    { $skip: skip },
    { $limit: limit }
  ];

  const [events, total] = await Promise.all([
    Event.aggregate(pipeline),
    Event.countDocuments(query)
  ]);

  logger.info(`Retrieved ${events.length} events`, {
    total,
    page,
    filters: { category, search, startDate, endDate }
  });

  res.json(formatPaginatedResponse(events, { page, limit, total }));
});

/**
 * Get single event by ID with detailed statistics
 */
export const getEventById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const pipeline = [
    { $match: { _id: new mongoose.Types.ObjectId(id), isActive: true } },
    {
      $lookup: {
        from: 'registrations',
        localField: '_id',
        foreignField: 'event',
        as: 'registrations'
      }
    },
    {
      $addFields: {
        confirmedCount: {
          $size: {
            $filter: {
              input: '$registrations',
              cond: { $eq: ['$$this.status', 'confirmed'] }
            }
          }
        },
        waitingCount: {
          $size: {
            $filter: {
              input: '$registrations',
              cond: { $eq: ['$$this.status', 'waiting'] }
            }
          }
        },
        cancelledCount: {
          $size: {
            $filter: {
              input: '$registrations',
              cond: { $eq: ['$$this.status', 'cancelled'] }
            }
          }
        },
        availableSeats: {
          $subtract: ['$capacity', '$attendeesCount']
        },
        isRegistrationOpen: {
          $and: [
            { $eq: ['$isActive', true] },
            { $lt: [new Date(), '$date'] },
            { $lt: ['$attendeesCount', '$capacity'] }
          ]
        }
      }
    },
    {
      $project: {
        registrations: 0
      }
    }
  ];

  const events = await Event.aggregate(pipeline);
  const event = events[0];

  if (!event) {
    return res.status(404).json(formatError('Event not found', 404));
  }

  logger.info(`Retrieved event details for: ${event.title}`, {
    eventId: id,
    confirmedCount: event.confirmedCount,
    waitingCount: event.waitingCount
  });

  res.json(formatSuccess(event));
});

/**
 * Create new event (admin only)
 */
export const createEvent = asyncHandler(async (req, res) => {
  const eventData = {
    ...req.body,
    // Set registration deadline if not provided
    registrationDeadline: req.body.registrationDeadline || req.body.date
  };

  const event = new Event(eventData);
  await event.save();

  // Log audit trail
  await AuditLog.logAction({
    actor: req.admin._id,
    action: 'event.create',
    target: event._id,
    targetType: 'Event',
    details: {
      title: event.title,
      capacity: event.capacity,
      date: event.date
    },
    context: {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      endpoint: req.originalUrl,
      method: req.method
    }
  });

  logger.info(`Event created: ${event.title}`, {
    eventId: event._id,
    adminId: req.admin._id,
    capacity: event.capacity
  });

  res.status(201).json(formatSuccess(event, 'Event created successfully'));
});

/**
 * Update event (admin only)
 */
export const updateEvent = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const event = await Event.findById(id);
  if (!event) {
    return res.status(404).json(formatError('Event not found', 404));
  }

  // Store original data for audit
  const originalData = {
    title: event.title,
    capacity: event.capacity,
    date: event.date,
    venue: event.venue
  };

  // Update event
  Object.assign(event, updates);
  await event.save();

  // Log audit trail
  await AuditLog.logAction({
    actor: req.admin._id,
    action: 'event.update',
    target: event._id,
    targetType: 'Event',
    details: {
      originalData,
      updatedData: updates
    },
    context: {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      endpoint: req.originalUrl,
      method: req.method
    }
  });

  logger.info(`Event updated: ${event.title}`, {
    eventId: event._id,
    adminId: req.admin._id,
    updates: Object.keys(updates)
  });

  res.json(formatSuccess(event, 'Event updated successfully'));
});

/**
 * Delete event (admin only)
 */
export const deleteEvent = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const event = await Event.findById(id);
  if (!event) {
    return res.status(404).json(formatError('Event not found', 404));
  }

  // Check if event has registrations
  const registrationCount = await Registration.countDocuments({ event: id });
  if (registrationCount > 0) {
    return res.status(400).json(formatError(
      'Cannot delete event with existing registrations. Please cancel all registrations first.',
      400
    ));
  }

  // Soft delete by setting isActive to false
  event.isActive = false;
  await event.save();

  // Log audit trail
  await AuditLog.logAction({
    actor: req.admin._id,
    action: 'event.delete',
    target: event._id,
    targetType: 'Event',
    details: {
      title: event.title,
      registrationCount
    },
    context: {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      endpoint: req.originalUrl,
      method: req.method
    }
  });

  logger.info(`Event deleted: ${event.title}`, {
    eventId: event._id,
    adminId: req.admin._id
  });

  res.json(formatSuccess(null, 'Event deleted successfully'));
});

/**
 * Get event analytics
 */
export const getEventAnalytics = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { period = '7d' } = req.query;

  const event = await Event.findById(id);
  if (!event) {
    return res.status(404).json(formatError('Event not found', 404));
  }

  // Calculate date range
  const endDate = new Date();
  const startDate = new Date();
  
  switch (period) {
    case '24h':
      startDate.setDate(startDate.getDate() - 1);
      break;
    case '7d':
      startDate.setDate(startDate.getDate() - 7);
      break;
    case '30d':
      startDate.setDate(startDate.getDate() - 30);
      break;
    default:
      startDate.setDate(startDate.getDate() - 7);
  }

  // Registration statistics
  const registrationStats = await Registration.aggregate([
    {
      $match: {
        event: new mongoose.Types.ObjectId(id),
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          status: '$status'
        },
        count: { $sum: 1 }
      }
    },
    {
      $group: {
        _id: '$_id.date',
        confirmed: {
          $sum: { $cond: [{ $eq: ['$_id.status', 'confirmed'] }, '$count', 0] }
        },
        waiting: {
          $sum: { $cond: [{ $eq: ['$_id.status', 'waiting'] }, '$count', 0] }
        },
        cancelled: {
          $sum: { $cond: [{ $eq: ['$_id.status', 'cancelled'] }, '$count', 0] }
        }
      }
    },
    { $sort: { _id: 1 } }
  ]);

  // Overall statistics
  const overallStats = await Registration.aggregate([
    { $match: { event: new mongoose.Types.ObjectId(id) } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);

  const analytics = {
    event: {
      id: event._id,
      title: event.title,
      capacity: event.capacity,
      date: event.date
    },
    period: {
      start: startDate,
      end: endDate,
      duration: period
    },
    dailyRegistrations: registrationStats,
    overallStats: overallStats.reduce((acc, stat) => {
      acc[stat._id] = stat.count;
      return acc;
    }, { confirmed: 0, waiting: 0, cancelled: 0 }),
    availableSeats: Math.max(0, event.capacity - event.attendeesCount),
    registrationRate: event.capacity > 0 ? (event.attendeesCount / event.capacity * 100).toFixed(2) : 0
  };

  logger.info(`Event analytics retrieved for: ${event.title}`, {
    eventId: id,
    period,
    totalRegistrations: analytics.overallStats.confirmed + analytics.overallStats.waiting
  });

  res.json(formatSuccess(analytics));
});

export default {
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  getEventAnalytics
};
