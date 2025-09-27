import { Event, Registration, AuditLog } from '../models/index.js';
import { csvService } from '../services/index.js';
import { formatSuccess, formatError, getPaginationParams, formatPaginatedResponse } from '../utils/helpers.js';
import logger from '../utils/logger.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';

/**
 * Import registrations from CSV (admin only)
 */
export const importRegistrations = asyncHandler(async (req, res) => {
  const { id: eventId } = req.params;
  
  if (!req.file) {
    return res.status(400).json(formatError('CSV file is required', 400));
  }

  // Validate event exists
  const event = await Event.findById(eventId);
  if (!event) {
    return res.status(404).json(formatError('Event not found', 404));
  }

  const options = {
    skipDuplicates: req.body.skipDuplicates !== 'false',
    sendEmails: req.body.sendEmails !== 'false',
    defaultSource: 'csv_import'
  };

  try {
    // Import registrations
    const summary = await csvService.importRegistrations(
      req.file.path,
      eventId,
      options
    );

    // Log audit trail
    await AuditLog.logAction({
      actor: req.admin._id,
      action: 'registration.import',
      target: eventId,
      targetType: 'Event',
      details: {
        filename: req.file.originalname,
        summary,
        options
      },
      context: {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    logger.info(`CSV import completed for event: ${event.title}`, {
      eventId,
      adminId: req.admin._id,
      filename: req.file.originalname,
      summary
    });

    // Send summary email to admin
    try {
      const { emailService } = await import('../services/index.js');
      await emailService.sendBulkImportSummary(
        req.admin.email,
        event.title,
        summary
      );
    } catch (emailError) {
      logger.error('Failed to send import summary email:', emailError);
    }

    res.json(formatSuccess({
      summary,
      event: {
        id: event._id,
        title: event.title
      }
    }, 'CSV import completed successfully'));

  } catch (error) {
    logger.error('CSV import failed:', error);
    
    // Log failed import
    await AuditLog.logAction({
      actor: req.admin._id,
      action: 'registration.import',
      target: eventId,
      targetType: 'Event',
      result: 'failure',
      errorMessage: error.message,
      details: {
        filename: req.file.originalname
      },
      context: {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    throw error;
  }
});

/**
 * Export event registrations to CSV (admin only)
 */
export const exportRegistrations = asyncHandler(async (req, res) => {
  const { id: eventId } = req.params;
  const { status, includeMetadata = 'false' } = req.query;

  // Validate event exists
  const event = await Event.findById(eventId);
  if (!event) {
    return res.status(404).json(formatError('Event not found', 404));
  }

  try {
    const options = {
      status: status && status !== 'all' ? status : null,
      includeMetadata: includeMetadata === 'true'
    };

    // Export registrations
    const exportResult = await csvService.exportRegistrations(eventId, options);

    // Log audit trail
    await AuditLog.logAction({
      actor: req.admin._id,
      action: 'event.export',
      target: eventId,
      targetType: 'Event',
      details: {
        filename: exportResult.filename,
        recordCount: exportResult.recordCount,
        status: options.status,
        includeMetadata: options.includeMetadata
      },
      context: {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    logger.info(`CSV export completed for event: ${event.title}`, {
      eventId,
      adminId: req.admin._id,
      filename: exportResult.filename,
      recordCount: exportResult.recordCount
    });

    // Return download information
    res.json(formatSuccess({
      downloadUrl: `/api/admin/csv/download/${exportResult.filename}`,
      filename: exportResult.filename,
      recordCount: exportResult.recordCount,
      event: exportResult.event
    }, 'Export completed successfully'));

  } catch (error) {
    logger.error('CSV export failed:', error);
    
    // Log failed export
    await AuditLog.logAction({
      actor: req.admin._id,
      action: 'event.export',
      target: eventId,
      targetType: 'Event',
      result: 'failure',
      errorMessage: error.message,
      context: {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      }
    });

    throw error;
  }
});

/**
 * Download CSV file (admin only)
 */
export const downloadCSV = asyncHandler(async (req, res) => {
  const { filename } = req.params;

  try {
    const fileInfo = csvService.getCSVFile(filename);
    
    res.setHeader('Content-Type', fileInfo.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileInfo.filename}"`);
    res.setHeader('Content-Length', fileInfo.size);

    // Stream file to response
    const fs = await import('fs');
    const stream = fs.createReadStream(fileInfo.filePath);
    
    stream.on('error', (error) => {
      logger.error('Error streaming CSV file:', error);
      if (!res.headersSent) {
        res.status(500).json(formatError('Error downloading file', 500));
      }
    });

    stream.pipe(res);

    logger.info(`CSV file downloaded: ${filename}`, {
      adminId: req.admin._id,
      fileSize: fileInfo.size
    });

  } catch (error) {
    if (error.message.includes('not found')) {
      return res.status(404).json(formatError('CSV file not found or expired', 404));
    }
    throw error;
  }
});

/**
 * Get CSV import template (admin only)
 */
export const getImportTemplate = asyncHandler(async (req, res) => {
  try {
    const template = await csvService.generateImportTemplate();
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${template.filename}"`);

    const fs = await import('fs');
    const stream = fs.createReadStream(template.filePath);
    stream.pipe(res);

    logger.info('CSV import template downloaded', {
      adminId: req.admin._id
    });

  } catch (error) {
    logger.error('Failed to generate CSV template:', error);
    throw error;
  }
});

/**
 * Get analytics data (admin only)
 */
export const getAnalytics = asyncHandler(async (req, res) => {
  const { period = '30d' } = req.query;

  // Calculate date range
  const endDate = new Date();
  const startDate = new Date();
  
  switch (period) {
    case '7d':
      startDate.setDate(startDate.getDate() - 7);
      break;
    case '30d':
      startDate.setDate(startDate.getDate() - 30);
      break;
    case '90d':
      startDate.setDate(startDate.getDate() - 90);
      break;
    case '1y':
      startDate.setFullYear(startDate.getFullYear() - 1);
      break;
    default:
      startDate.setDate(startDate.getDate() - 30);
  }

  try {
    // Get overall statistics
    const [
      totalEvents,
      totalRegistrations,
      totalConfirmed,
      totalWaiting,
      totalCancelled,
      recentEvents,
      registrationTrends
    ] = await Promise.all([
      // Total events
      Event.countDocuments({ isActive: true }),
      
      // Total registrations
      Registration.countDocuments({}),
      
      // Confirmed registrations
      Registration.countDocuments({ status: 'confirmed' }),
      
      // Waiting registrations
      Registration.countDocuments({ status: 'waiting' }),
      
      // Cancelled registrations
      Registration.countDocuments({ status: 'cancelled' }),
      
      // Recent events with stats
      Event.aggregate([
        { $match: { isActive: true, date: { $gte: startDate } } },
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
            }
          }
        },
        {
          $project: {
            registrations: 0
          }
        },
        { $sort: { date: 1 } },
        { $limit: 10 }
      ]),
      
      // Registration trends over time
      Registration.aggregate([
        {
          $match: {
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
      ])
    ]);

    // Calculate additional metrics
    const upcomingEvents = recentEvents.filter(event => new Date(event.date) > new Date());
    const pastEvents = recentEvents.filter(event => new Date(event.date) <= new Date());
    
    const averageCapacityUtilization = recentEvents.length > 0
      ? recentEvents.reduce((sum, event) => sum + (event.confirmedCount / event.capacity * 100), 0) / recentEvents.length
      : 0;

    // Event categories breakdown
    const categoryBreakdown = await Event.aggregate([
      { $match: { isActive: true } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalCapacity: { $sum: '$capacity' },
          totalRegistered: { $sum: '$attendeesCount' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    const analytics = {
      period: {
        start: startDate,
        end: endDate,
        duration: period
      },
      overview: {
        totalEvents,
        totalRegistrations,
        totalConfirmed,
        totalWaiting,
        totalCancelled,
        upcomingEventsCount: upcomingEvents.length,
        pastEventsCount: pastEvents.length,
        averageCapacityUtilization: Math.round(averageCapacityUtilization * 100) / 100
      },
      trends: {
        daily: registrationTrends
      },
      events: {
        recent: recentEvents,
        upcoming: upcomingEvents,
        past: pastEvents
      },
      categories: categoryBreakdown
    };

    logger.info('Analytics data retrieved', {
      adminId: req.admin._id,
      period,
      totalEvents,
      totalRegistrations
    });

    res.json(formatSuccess(analytics));

  } catch (error) {
    logger.error('Failed to generate analytics:', error);
    throw error;
  }
});

/**
 * Get audit logs (admin only)
 */
export const getAuditLogs = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPaginationParams(req.query);
  const { action, startDate, endDate, result } = req.query;

  try {
    const filters = {};
    
    if (action) filters.action = action;
    if (result) filters.result = result;
    if (startDate || endDate) {
      filters.startDate = startDate;
      filters.endDate = endDate;
    }

    const auditData = await AuditLog.getAuditLogs({
      ...filters,
      page,
      limit
    });

    logger.info('Audit logs retrieved', {
      adminId: req.admin._id,
      total: auditData.pagination.total,
      filters
    });

    res.json(formatPaginatedResponse(auditData.logs, auditData.pagination));

  } catch (error) {
    logger.error('Failed to retrieve audit logs:', error);
    throw error;
  }
});

/**
 * Get audit summary (admin only)
 */
export const getAuditSummary = asyncHandler(async (req, res) => {
  const { days = 30 } = req.query;

  try {
    const summary = await AuditLog.getAuditSummary(parseInt(days));

    res.json(formatSuccess({
      period: `${days} days`,
      summary
    }));

  } catch (error) {
    logger.error('Failed to generate audit summary:', error);
    throw error;
  }
});

export default {
  importRegistrations,
  exportRegistrations,
  downloadCSV,
  getImportTemplate,
  getAnalytics,
  getAuditLogs,
  getAuditSummary
};
