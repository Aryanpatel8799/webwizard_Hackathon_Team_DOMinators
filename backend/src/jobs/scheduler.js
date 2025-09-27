import cron from 'node-cron';
import mongoose from 'mongoose';
import { Event, Registration, AuditLog } from '../models/index.js';
import { emailService, csvService, seatHoldService } from '../services/index.js';
import logger from '../utils/logger.js';

/**
 * Background job manager
 */
class JobManager {
  constructor() {
    this.jobs = new Map();
    this.isRunning = false;
  }

  /**
   * Start all background jobs
   */
  start() {
    if (this.isRunning) {
      logger.warn('Job manager is already running');
      return;
    }

    logger.info('Starting background job manager...');

    // Auto-promote from waiting list (every 5 minutes)
    this.scheduleJob('auto-promote', '*/5 * * * *', this.autoPromoteWaitingList);

    // Clean up expired seat holds (every minute)
    this.scheduleJob('cleanup-seat-holds', '* * * * *', this.cleanupExpiredSeatHolds);

    // Clean up old CSV files (daily at 2 AM)
    this.scheduleJob('cleanup-csv-files', '0 2 * * *', this.cleanupOldCSVFiles);

    // Send reminder emails (daily at 9 AM)
    this.scheduleJob('event-reminders', '0 9 * * *', this.sendEventReminders);

    // Update event statuses (every hour)
    this.scheduleJob('update-event-status', '0 * * * *', this.updateEventStatuses);

    // Clean up old audit logs (weekly on Sunday at 3 AM)
    this.scheduleJob('cleanup-audit-logs', '0 3 * * 0', this.cleanupOldAuditLogs);

    // Generate daily reports (daily at midnight)
    this.scheduleJob('daily-reports', '0 0 * * *', this.generateDailyReports);

    this.isRunning = true;
    logger.info('Background job manager started successfully');
  }

  /**
   * Stop all background jobs
   */
  stop() {
    if (!this.isRunning) {
      return;
    }

    logger.info('Stopping background job manager...');

    for (const [name, job] of this.jobs) {
      job.stop();
      logger.debug(`Stopped job: ${name}`);
    }

    this.jobs.clear();
    this.isRunning = false;
    logger.info('Background job manager stopped');
  }

  /**
   * Schedule a job
   */
  scheduleJob(name, schedule, handler) {
    try {
      const job = cron.schedule(schedule, async () => {
        const startTime = Date.now();
        logger.debug(`Starting job: ${name}`);

        try {
          await handler.call(this);
          const duration = Date.now() - startTime;
          logger.info(`Job completed: ${name} (${duration}ms)`);
        } catch (error) {
          logger.error(`Job failed: ${name}`, error);
          
          // Log job failure to audit log
          await AuditLog.logAction({
            actor: 'system',
            action: 'system.job_failure',
            details: {
              jobName: name,
              error: error.message,
              duration: Date.now() - startTime
            },
            result: 'failure',
            errorMessage: error.message
          });
        }
      }, {
        scheduled: false
      });

      this.jobs.set(name, job);
      job.start();
      
      logger.debug(`Scheduled job: ${name} with cron: ${schedule}`);
    } catch (error) {
      logger.error(`Failed to schedule job: ${name}`, error);
    }
  }

  /**
   * Auto-promote registrations from waiting list
   */
  async autoPromoteWaitingList() {
    const events = await Event.find({
      isActive: true,
      date: { $gt: new Date() }, // Only future events
      $expr: { $lt: ['$attendeesCount', '$capacity'] } // Events with available capacity
    });

    let totalPromotions = 0;

    for (const event of events) {
      try {
        const availableSeats = event.capacity - event.attendeesCount;
        
        if (availableSeats <= 0) continue;

        // Get waiting registrations in chronological order
        const waitingRegistrations = await Registration.find({
          event: event._id,
          status: 'waiting'
        }).sort({ createdAt: 1 }).limit(availableSeats);

        for (const registration of waitingRegistrations) {
          // Check if we still have capacity
          const currentEvent = await Event.findById(event._id);
          if (currentEvent.attendeesCount >= currentEvent.capacity) {
            break;
          }

          // Promote registration atomically
          const session = await mongoose.startSession();
          try {
            await session.withTransaction(async () => {
              // Update registration status
              registration.status = 'confirmed';
              registration._statusChangeReason = 'Auto-promoted due to available capacity';
              await registration.save({ session });

              // Update event capacity
              await Event.findByIdAndUpdate(
                event._id,
                { $inc: { attendeesCount: 1 } },
                { session }
              );

              // Generate ticket
              try {
                const { generateTicket } = await import('../utils/qr.js');
                const ticket = await generateTicket(registration, event);
                registration.ticketQR = ticket.qrCode;
                await registration.save({ session });

                // Send promotion email
                await emailService.sendPromotionNotification(registration, event, ticket.qrCode);
              } catch (ticketError) {
                logger.error('Failed to generate ticket during auto-promotion:', ticketError);
              }

              // Log auto-promotion
              await AuditLog.logAction({
                actor: 'system',
                action: 'system.auto_promote',
                target: registration._id,
                targetType: 'Registration',
                details: {
                  eventId: event._id,
                  eventTitle: event.title,
                  registrationEmail: registration.email,
                  reason: 'Available capacity detected'
                }
              });

              totalPromotions++;
              logger.debug(`Auto-promoted registration: ${registration.email} for event: ${event.title}`);
            });
          } finally {
            await session.endSession();
          }
        }
      } catch (error) {
        logger.error(`Error auto-promoting for event ${event.title}:`, error);
      }
    }

    if (totalPromotions > 0) {
      logger.info(`Auto-promoted ${totalPromotions} registrations from waiting lists`);
    }
  }

  /**
   * Clean up expired seat holds
   */
  async cleanupExpiredSeatHolds() {
    try {
      const cleanedUp = await seatHoldService.cleanupExpiredHolds();
      if (cleanedUp > 0) {
        logger.info(`Cleaned up ${cleanedUp} expired seat holds`);
      }
    } catch (error) {
      logger.error('Error cleaning up seat holds:', error);
    }
  }

  /**
   * Clean up old CSV files
   */
  async cleanupOldCSVFiles() {
    try {
      const cleanedUp = await csvService.cleanupOldFiles(24); // 24 hours
      if (cleanedUp > 0) {
        logger.info(`Cleaned up ${cleanedUp} old CSV files`);
      }
    } catch (error) {
      logger.error('Error cleaning up CSV files:', error);
    }
  }

  /**
   * Send event reminder emails
   */
  async sendEventReminders() {
    // Find events that start in 24 hours
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

    try {
      const upcomingEvents = await Event.find({
        isActive: true,
        date: { $gte: tomorrow, $lt: dayAfterTomorrow }
      });

      let remindersSent = 0;

      for (const event of upcomingEvents) {
        // Get confirmed registrations
        const confirmedRegistrations = await Registration.find({
          event: event._id,
          status: 'confirmed'
        });

        // Send reminder emails (implement reminder template)
        for (const registration of confirmedRegistrations) {
          try {
            // You would implement a reminder email template here
            logger.debug(`Would send reminder email to ${registration.email} for event: ${event.title}`);
            remindersSent++;
          } catch (emailError) {
            logger.error(`Failed to send reminder to ${registration.email}:`, emailError);
          }
        }
      }

      if (remindersSent > 0) {
        logger.info(`Sent ${remindersSent} event reminder emails`);
      }
    } catch (error) {
      logger.error('Error sending event reminders:', error);
    }
  }

  /**
   * Update event statuses (mark past events as inactive)
   */
  async updateEventStatuses() {
    try {
      const now = new Date();
      
      // Find events that have passed but are still active
      const result = await Event.updateMany(
        {
          isActive: true,
          date: { $lt: now }
        },
        {
          isActive: false
        }
      );

      if (result.modifiedCount > 0) {
        logger.info(`Marked ${result.modifiedCount} past events as inactive`);
      }
    } catch (error) {
      logger.error('Error updating event statuses:', error);
    }
  }

  /**
   * Clean up old audit logs (keep only 6 months)
   */
  async cleanupOldAuditLogs() {
    try {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const result = await AuditLog.deleteMany({
        createdAt: { $lt: sixMonthsAgo }
      });

      if (result.deletedCount > 0) {
        logger.info(`Cleaned up ${result.deletedCount} old audit log entries`);
      }
    } catch (error) {
      logger.error('Error cleaning up audit logs:', error);
    }
  }

  /**
   * Generate daily reports
   */
  async generateDailyReports() {
    try {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);

      const endOfYesterday = new Date(yesterday);
      endOfYesterday.setHours(23, 59, 59, 999);

      // Get daily statistics
      const [
        newRegistrations,
        newEvents,
        promotions,
        cancellations
      ] = await Promise.all([
        Registration.countDocuments({
          createdAt: { $gte: yesterday, $lte: endOfYesterday }
        }),
        Event.countDocuments({
          createdAt: { $gte: yesterday, $lte: endOfYesterday }
        }),
        AuditLog.countDocuments({
          action: 'registration.promote',
          createdAt: { $gte: yesterday, $lte: endOfYesterday }
        }),
        AuditLog.countDocuments({
          action: 'registration.cancel',
          createdAt: { $gte: yesterday, $lte: endOfYesterday }
        })
      ]);

      const dailyReport = {
        date: yesterday.toISOString().split('T')[0],
        newRegistrations,
        newEvents,
        promotions,
        cancellations
      };

      // Log daily statistics
      await AuditLog.logAction({
        actor: 'system',
        action: 'system.daily_report',
        details: dailyReport
      });

      logger.info('Generated daily report', dailyReport);
    } catch (error) {
      logger.error('Error generating daily reports:', error);
    }
  }

  /**
   * Get job status
   */
  getJobStatus() {
    const status = {
      isRunning: this.isRunning,
      jobCount: this.jobs.size,
      jobs: []
    };

    for (const [name, job] of this.jobs) {
      status.jobs.push({
        name,
        isRunning: job.running
      });
    }

    return status;
  }
}

// Create singleton instance
const jobManager = new JobManager();

export default jobManager;
