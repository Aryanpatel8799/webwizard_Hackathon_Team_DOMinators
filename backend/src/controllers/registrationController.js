import mongoose from 'mongoose';
import { Event, Registration, AuditLog } from '../models/index.js';
import { emailService, seatHoldService } from '../services/index.js';
import { formatSuccess, formatError, getPaginationParams, formatPaginatedResponse } from '../utils/helpers.js';
import { generateTicket } from '../utils/qr.js';
import logger from '../utils/logger.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';

/**
 * Register for an event (public endpoint)
 */
export const registerForEvent = asyncHandler(async (req, res) => {
  const { id: eventId } = req.params;
  const { name, email, phone, college } = req.body;

  // Start database session for transaction
  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      // Get event with lock to prevent race conditions
      const event = await Event.findById(eventId).session(session);
      if (!event || !event.isActive) {
        throw new AppError('Event not found or inactive', 404);
      }

      // Check if registration is still open
      const now = new Date();
      const registrationDeadline = event.registrationDeadline || event.date;
      
      if (now > registrationDeadline) {
        throw new AppError('Registration deadline has passed', 400);
      }

      // Check for existing registration
      const existingRegistration = await Registration.findOne({
        event: eventId,
        email: email.toLowerCase()
      }).session(session);

      if (existingRegistration && existingRegistration.status !== 'cancelled') {
        throw new AppError('Email already registered for this event', 409);
      }

      // Check seat hold (if Redis is available)
      const hasValidHold = await seatHoldService.validateSeatHold(eventId, email);
      if (!hasValidHold) {
        // Create seat hold for this registration attempt
        await seatHoldService.createSeatHold(eventId, email);
      }

      // Determine registration status based on availability
      let status = 'waiting';
      if (event.attendeesCount < event.capacity) {
        status = 'confirmed';
        
        // Atomically increment attendees count
        const updateResult = await Event.findOneAndUpdate(
          { 
            _id: eventId, 
            attendeesCount: { $lt: event.capacity } // Double-check capacity
          },
          { $inc: { attendeesCount: 1 } },
          { session, new: true }
        );

        if (!updateResult) {
          // Race condition: capacity was reached between our check and update
          status = 'waiting';
          logger.warn(`Race condition detected for event ${eventId}, user ${email} added to waiting list`);
        }
      }

      // Create registration
      const registrationData = {
        event: eventId,
        name: name.trim(),
        email: email.toLowerCase().trim(),
        phone: phone?.trim(),
        college: college?.trim(),
        status,
        meta: {
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          source: 'web'
        }
      };

      const registration = new Registration(registrationData);
      await registration.save({ session });

      // Generate ticket for confirmed registrations
      let ticketQR = null;
      if (status === 'confirmed') {
        try {
          const ticket = await generateTicket(registration, event);
          registration.ticketQR = ticket.qrCode;
          await registration.save({ session });
          ticketQR = ticket.qrCode;
        } catch (ticketError) {
          logger.error('Failed to generate ticket:', ticketError);
          // Continue without failing the registration
        }
      }

      // Release seat hold
      await seatHoldService.releaseSeatHold(eventId, email);

      // Send confirmation email
      try {
        if (status === 'confirmed') {
          await emailService.sendRegistrationConfirmation(registration, event);
        } else {
          const position = await Registration.getWaitingPosition(eventId, registration._id);
          await emailService.sendWaitingListNotification(registration, event, position);
        }
      } catch (emailError) {
        logger.error('Failed to send confirmation email:', emailError);
        // Continue without failing the registration
      }

      // Populate registration with event details for response
      await registration.populate('event', 'title date venue capacity');

      logger.info(`Registration ${status} for event: ${event.title}`, {
        eventId,
        registrationId: registration._id,
        email,
        status,
        currentCapacity: status === 'confirmed' ? event.attendeesCount + 1 : event.attendeesCount
      });

      res.status(201).json(formatSuccess({
        registration: {
          id: registration._id,
          registrationNumber: registration.registrationNumber,
          name: registration.name,
          email: registration.email,
          status: registration.status,
          event: registration.event,
          ticketQR,
          createdAt: registration.createdAt
        },
        message: status === 'confirmed' 
          ? 'Registration confirmed! You will receive a confirmation email shortly.' 
          : 'You have been added to the waiting list. We will notify you if a spot becomes available.'
      }, 'Registration submitted successfully'));
    });
  } catch (error) {
    // Release seat hold on error
    await seatHoldService.releaseSeatHold(eventId, email);
    throw error;
  } finally {
    await session.endSession();
  }
});

/**
 * Get event registrations (admin only)
 */
export const getEventRegistrations = asyncHandler(async (req, res) => {
  const { id: eventId } = req.params;
  const { page, limit, skip } = getPaginationParams(req.query);
  const { status, search } = req.query;

  // Verify event exists
  const event = await Event.findById(eventId);
  if (!event) {
    return res.status(404).json(formatError('Event not found', 404));
  }

  // Build query
  const query = { event: eventId };
  if (status && status !== 'all') {
    query.status = status;
  }

  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { college: { $regex: search, $options: 'i' } },
      { registrationNumber: { $regex: search, $options: 'i' } }
    ];
  }

  // Get registrations
  const [registrations, total] = await Promise.all([
    Registration.find(query)
      .populate('event', 'title date venue')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Registration.countDocuments(query)
  ]);

  // Add waiting list positions for waiting registrations
  for (let registration of registrations) {
    if (registration.status === 'waiting') {
      registration._waitingPosition = await Registration.getWaitingPosition(
        eventId, 
        registration._id
      );
    }
  }

  logger.info(`Retrieved ${registrations.length} registrations for event`, {
    eventId,
    total,
    status,
    adminId: req.admin._id
  });

  res.json(formatPaginatedResponse(registrations, { page, limit, total }));
});

/**
 * Promote registration from waiting to confirmed (admin only)
 */
export const promoteRegistration = asyncHandler(async (req, res) => {
  const { id: registrationId } = req.params;
  const { reason } = req.body;

  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      // Get registration
      const registration = await Registration.findById(registrationId)
        .populate('event')
        .session(session);

      if (!registration) {
        throw new AppError('Registration not found', 404);
      }

      if (registration.status !== 'waiting') {
        throw new AppError('Only waiting registrations can be promoted', 400);
      }

      const event = registration.event;

      // Check if event has capacity
      if (event.attendeesCount >= event.capacity) {
        throw new AppError('Event is at full capacity', 400);
      }

      // Promote registration
      registration.status = 'confirmed';
      registration._statusChangeReason = reason || 'Promoted by admin';
      await registration.save({ session });

      // Update event capacity
      await Event.findByIdAndUpdate(
        event._id,
        { $inc: { attendeesCount: 1 } },
        { session }
      );

      // Generate ticket
      let ticketQR = null;
      try {
        const ticket = await generateTicket(registration, event);
        registration.ticketQR = ticket.qrCode;
        await registration.save({ session });
        ticketQR = ticket.qrCode;
      } catch (ticketError) {
        logger.error('Failed to generate ticket:', ticketError);
      }

      // Log audit trail
      await AuditLog.logAction({
        actor: req.admin._id,
        action: 'registration.promote',
        target: registration._id,
        targetType: 'Registration',
        details: {
          eventId: event._id,
          eventTitle: event.title,
          registrationEmail: registration.email,
          reason
        },
        context: {
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        }
      });

      // Send promotion email
      try {
        await emailService.sendPromotionNotification(registration, event, ticketQR);
      } catch (emailError) {
        logger.error('Failed to send promotion email:', emailError);
      }

      logger.info(`Registration promoted: ${registration.email}`, {
        registrationId,
        eventId: event._id,
        adminId: req.admin._id,
        newCapacity: event.attendeesCount + 1
      });

      res.json(formatSuccess({
        registration: {
          id: registration._id,
          name: registration.name,
          email: registration.email,
          status: registration.status,
          ticketQR
        }
      }, 'Registration promoted successfully'));
    });
  } finally {
    await session.endSession();
  }

  // Emit Socket.IO event for real-time updates
  if (req.io) {
    const event = await Event.findById(registration.event._id);
    req.io.to(`event:${event._id}`).emit('registration:promoted', {
      eventId: event._id,
      attendeesCount: event.attendeesCount,
      availableSeats: event.capacity - event.attendeesCount
    });
  }
});

/**
 * Cancel registration (admin only)
 */
export const cancelRegistration = asyncHandler(async (req, res) => {
  const { id: registrationId } = req.params;
  const { reason } = req.body;

  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      // Get registration
      const registration = await Registration.findById(registrationId)
        .populate('event')
        .session(session);

      if (!registration) {
        throw new AppError('Registration not found', 404);
      }

      if (registration.status === 'cancelled') {
        throw new AppError('Registration is already cancelled', 400);
      }

      const event = registration.event;
      const wasConfirmed = registration.status === 'confirmed';

      // Cancel registration
      registration.status = 'cancelled';
      registration._statusChangeReason = reason || 'Cancelled by admin';
      await registration.save({ session });

      // If registration was confirmed, update capacity and auto-promote next in waiting list
      if (wasConfirmed) {
        await Event.findByIdAndUpdate(
          event._id,
          { $inc: { attendeesCount: -1 } },
          { session }
        );

        // Find next person in waiting list
        const nextInLine = await Registration.findNextInWaitingList(event._id);
        if (nextInLine) {
          // Auto-promote
          nextInLine.status = 'confirmed';
          nextInLine._statusChangeReason = 'Auto-promoted due to cancellation';
          await nextInLine.save({ session });

          // Generate ticket for auto-promoted registration
          try {
            const ticket = await generateTicket(nextInLine, event);
            nextInLine.ticketQR = ticket.qrCode;
            await nextInLine.save({ session });

            // Send promotion email
            await emailService.sendPromotionNotification(nextInLine, event, ticket.qrCode);

            // Log auto-promotion
            await AuditLog.logAction({
              actor: 'system',
              action: 'system.auto_promote',
              target: nextInLine._id,
              targetType: 'Registration',
              details: {
                triggeredBy: registrationId,
                eventId: event._id,
                eventTitle: event.title,
                promotedEmail: nextInLine.email
              }
            });

            logger.info(`Auto-promoted registration: ${nextInLine.email}`, {
              triggeredBy: registrationId,
              eventId: event._id
            });
          } catch (autoPromoteError) {
            logger.error('Failed to auto-promote registration:', autoPromoteError);
          }
        }
      }

      // Log audit trail
      await AuditLog.logAction({
        actor: req.admin._id,
        action: 'registration.cancel',
        target: registration._id,
        targetType: 'Registration',
        details: {
          eventId: event._id,
          eventTitle: event.title,
          registrationEmail: registration.email,
          wasConfirmed,
          reason
        },
        context: {
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        }
      });

      // Send cancellation email
      try {
        await emailService.sendCancellationNotification(registration, event);
      } catch (emailError) {
        logger.error('Failed to send cancellation email:', emailError);
      }

      logger.info(`Registration cancelled: ${registration.email}`, {
        registrationId,
        eventId: event._id,
        adminId: req.admin._id,
        wasConfirmed
      });

      res.json(formatSuccess(null, 'Registration cancelled successfully'));
    });
  } finally {
    await session.endSession();
  }
});

/**
 * Get registration by ID with ticket
 */
export const getRegistrationById = asyncHandler(async (req, res) => {
  const { id: registrationId } = req.params;

  const registration = await Registration.findById(registrationId)
    .populate('event', 'title date venue capacity');

  if (!registration) {
    return res.status(404).json(formatError('Registration not found', 404));
  }

  // Add waiting position if applicable
  if (registration.status === 'waiting') {
    registration._waitingPosition = await Registration.getWaitingPosition(
      registration.event._id,
      registration._id
    );
  }

  res.json(formatSuccess(registration));
});

/**
 * Get registration ticket (PDF or QR)
 */
export const getRegistrationTicket = asyncHandler(async (req, res) => {
  const { id: registrationId } = req.params;
  const { format = 'qr' } = req.query; // 'qr' or 'pdf'

  const registration = await Registration.findById(registrationId)
    .populate('event', 'title date venue');

  if (!registration) {
    return res.status(404).json(formatError('Registration not found', 404));
  }

  if (registration.status !== 'confirmed') {
    return res.status(400).json(formatError('Ticket only available for confirmed registrations', 400));
  }

  if (format === 'pdf') {
    // Generate PDF ticket
    const { generatePDFTicket } = await import('../utils/qr.js');
    const pdfBuffer = await generatePDFTicket(
      {
        registrationId: registration._id,
        registrationNumber: registration.registrationNumber,
        eventId: registration.event._id,
        eventTitle: registration.event.title,
        eventDate: registration.event.date,
        venue: registration.event.venue,
        name: registration.name,
        email: registration.email,
        college: registration.college
      },
      registration.ticketQR
    );

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="ticket-${registration.registrationNumber}.pdf"`
    });

    res.send(pdfBuffer);
  } else {
    // Return QR code data URL
    if (!registration.ticketQR) {
      return res.status(404).json(formatError('Ticket QR code not available', 404));
    }

    res.json(formatSuccess({
      qrCode: registration.ticketQR,
      registrationNumber: registration.registrationNumber,
      format: 'dataurl'
    }));
  }
});

/**
 * Update registration details (admin only)
 */
export const updateRegistration = asyncHandler(async (req, res) => {
  const { id: registrationId } = req.params;
  const updates = req.body;

  const registration = await Registration.findById(registrationId)
    .populate('event', 'title');

  if (!registration) {
    return res.status(404).json(formatError('Registration not found', 404));
  }

  // Store original data for audit
  const originalData = {
    name: registration.name,
    email: registration.email,
    phone: registration.phone,
    college: registration.college,
    status: registration.status
  };

  // Update registration
  Object.assign(registration, updates);
  await registration.save();

  // Log audit trail
  await AuditLog.logAction({
    actor: req.admin._id,
    action: 'registration.update',
    target: registration._id,
    targetType: 'Registration',
    details: {
      eventId: registration.event._id,
      eventTitle: registration.event.title,
      originalData,
      updatedData: updates
    },
    context: {
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    }
  });

  logger.info(`Registration updated: ${registration.email}`, {
    registrationId,
    adminId: req.admin._id,
    updates: Object.keys(updates)
  });

  res.json(formatSuccess(registration, 'Registration updated successfully'));
});

export default {
  registerForEvent,
  getEventRegistrations,
  promoteRegistration,
  cancelRegistration,
  getRegistrationById,
  getRegistrationTicket,
  updateRegistration
};
