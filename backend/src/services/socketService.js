import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import { Admin } from '../models/index.js';
import config from '../config/index.js';
import logger from '../utils/logger.js';

/**
 * Initialize Socket.IO server
 * @param {Object} httpServer - HTTP server instance
 * @returns {Object} - Socket.IO server instance
 */
export const initializeSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true
    },
    transports: ['websocket', 'polling']
  });

  // Middleware for authentication (optional)
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token || socket.handshake.query.token;
      
      if (token) {
        // Verify admin token
        const decoded = jwt.verify(token, config.jwt.secret);
        const admin = await Admin.findById(decoded.id);
        
        if (admin && admin.isActive) {
          socket.admin = admin;
          logger.debug(`Admin connected via WebSocket: ${admin.email}`, {
            socketId: socket.id,
            adminId: admin._id
          });
        }
      }
      
      // Allow connection even without authentication
      next();
    } catch (error) {
      logger.warn('WebSocket authentication failed:', error.message);
      // Continue without admin context
      next();
    }
  });

  // Connection handling
  io.on('connection', (socket) => {
    logger.info('Client connected', {
      socketId: socket.id,
      isAdmin: !!socket.admin,
      adminEmail: socket.admin?.email
    });

    // Join event-specific rooms
    socket.on('join:event', (eventId) => {
      if (eventId && typeof eventId === 'string') {
        socket.join(`event:${eventId}`);
        logger.debug(`Socket joined event room: ${eventId}`, {
          socketId: socket.id
        });
        
        socket.emit('joined:event', { eventId, status: 'success' });
      } else {
        socket.emit('error', { message: 'Invalid event ID' });
      }
    });

    // Leave event room
    socket.on('leave:event', (eventId) => {
      if (eventId && typeof eventId === 'string') {
        socket.leave(`event:${eventId}`);
        logger.debug(`Socket left event room: ${eventId}`, {
          socketId: socket.id
        });
        
        socket.emit('left:event', { eventId, status: 'success' });
      }
    });

    // Admin-only events
    if (socket.admin) {
      // Join admin room for admin-specific notifications
      socket.join('admin');
      
      // Get real-time event statistics
      socket.on('get:event:stats', async (eventId) => {
        try {
          if (!eventId) {
            socket.emit('error', { message: 'Event ID is required' });
            return;
          }

          const { Event, Registration } = await import('../models/index.js');
          
          const [event, stats] = await Promise.all([
            Event.findById(eventId),
            Registration.getEventStats(eventId)
          ]);

          if (!event) {
            socket.emit('error', { message: 'Event not found' });
            return;
          }

          socket.emit('event:stats', {
            eventId,
            capacity: event.capacity,
            attendeesCount: event.attendeesCount,
            availableSeats: event.capacity - event.attendeesCount,
            registrationStats: stats
          });
        } catch (error) {
          logger.error('Error getting event stats via WebSocket:', error);
          socket.emit('error', { message: 'Failed to get event statistics' });
        }
      });

      // Get waiting list updates
      socket.on('get:waiting:list', async (eventId) => {
        try {
          if (!eventId) {
            socket.emit('error', { message: 'Event ID is required' });
            return;
          }

          const { Registration } = await import('../models/index.js');
          
          const waitingList = await Registration.find({
            event: eventId,
            status: 'waiting'
          })
          .select('name email createdAt registrationNumber')
          .sort({ createdAt: 1 })
          .limit(10);

          // Add positions
          const waitingListWithPositions = waitingList.map((reg, index) => ({
            ...reg.toObject(),
            position: index + 1
          }));

          socket.emit('waiting:list', {
            eventId,
            waitingList: waitingListWithPositions,
            totalWaiting: waitingList.length
          });
        } catch (error) {
          logger.error('Error getting waiting list via WebSocket:', error);
          socket.emit('error', { message: 'Failed to get waiting list' });
        }
      });
    }

    // Handle ping for connection health
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      logger.info('Client disconnected', {
        socketId: socket.id,
        reason,
        isAdmin: !!socket.admin,
        adminEmail: socket.admin?.email
      });
    });

    // Handle connection errors
    socket.on('error', (error) => {
      logger.error('Socket error:', error, {
        socketId: socket.id,
        isAdmin: !!socket.admin
      });
    });
  });

  return io;
};

/**
 * Socket event emitters for application events
 */
export class SocketEmitters {
  constructor(io) {
    this.io = io;
  }

  /**
   * Emit event update to all connected clients in event room
   */
  emitEventUpdate(eventId, data) {
    this.io.to(`event:${eventId}`).emit('event:updated', {
      eventId,
      ...data,
      timestamp: Date.now()
    });

    logger.debug(`Emitted event update for event: ${eventId}`, data);
  }

  /**
   * Emit registration confirmation
   */
  emitRegistrationConfirmed(eventId, registrationData) {
    this.io.to(`event:${eventId}`).emit('registration:confirmed', {
      eventId,
      registration: registrationData,
      timestamp: Date.now()
    });

    logger.debug(`Emitted registration confirmation for event: ${eventId}`);
  }

  /**
   * Emit registration promoted from waiting list
   */
  emitRegistrationPromoted(eventId, registrationData) {
    this.io.to(`event:${eventId}`).emit('registration:promoted', {
      eventId,
      registration: registrationData,
      timestamp: Date.now()
    });

    // Also notify admins
    this.io.to('admin').emit('admin:registration:promoted', {
      eventId,
      registration: registrationData,
      timestamp: Date.now()
    });

    logger.debug(`Emitted registration promotion for event: ${eventId}`);
  }

  /**
   * Emit registration cancelled
   */
  emitRegistrationCancelled(eventId, registrationData) {
    this.io.to(`event:${eventId}`).emit('registration:cancelled', {
      eventId,
      registration: registrationData,
      timestamp: Date.now()
    });

    logger.debug(`Emitted registration cancellation for event: ${eventId}`);
  }

  /**
   * Emit capacity update
   */
  emitCapacityUpdate(eventId, capacityData) {
    this.io.to(`event:${eventId}`).emit('capacity:updated', {
      eventId,
      ...capacityData,
      timestamp: Date.now()
    });

    logger.debug(`Emitted capacity update for event: ${eventId}`, capacityData);
  }

  /**
   * Emit waiting list update
   */
  emitWaitingListUpdate(eventId, waitingListData) {
    this.io.to(`event:${eventId}`).emit('waiting:updated', {
      eventId,
      ...waitingListData,
      timestamp: Date.now()
    });

    logger.debug(`Emitted waiting list update for event: ${eventId}`);
  }

  /**
   * Send admin notification
   */
  emitAdminNotification(notification) {
    this.io.to('admin').emit('admin:notification', {
      ...notification,
      timestamp: Date.now()
    });

    logger.debug('Emitted admin notification', notification);
  }

  /**
   * Emit system status update
   */
  emitSystemStatus(status) {
    this.io.emit('system:status', {
      ...status,
      timestamp: Date.now()
    });

    logger.debug('Emitted system status update', status);
  }

  /**
   * Get connected clients count for an event
   */
  getEventClientsCount(eventId) {
    const room = this.io.sockets.adapter.rooms.get(`event:${eventId}`);
    return room ? room.size : 0;
  }

  /**
   * Get all connected admins count
   */
  getAdminClientsCount() {
    const room = this.io.sockets.adapter.rooms.get('admin');
    return room ? room.size : 0;
  }

  /**
   * Broadcast to specific socket by ID
   */
  emitToSocket(socketId, event, data) {
    this.io.to(socketId).emit(event, {
      ...data,
      timestamp: Date.now()
    });
  }
}

export default { initializeSocket, SocketEmitters };
