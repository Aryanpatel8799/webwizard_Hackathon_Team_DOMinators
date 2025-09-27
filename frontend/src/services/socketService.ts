import { io, Socket } from 'socket.io-client';
import { toast } from 'sonner';

class SocketService {
  private socket: Socket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;

  connect(token?: string): void {
    if (this.socket?.connected) {
      return;
    }

    const serverUrl = process.env.REACT_APP_API_URL || 'http://localhost:5000';
    
    this.socket = io(serverUrl, {
      auth: {
        token: token || localStorage.getItem('token')
      },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay
    });

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    this.socket.on('connect', () => {
      console.log('✅ Socket connected:', this.socket?.id);
      this.reconnectAttempts = 0;
      toast.success('Connected to live updates');
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason);
      toast.error('Lost connection to live updates');
    });

    this.socket.on('connect_error', (error) => {
      console.error('🚫 Socket connection error:', error);
      this.reconnectAttempts++;
      
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        toast.error('Unable to connect to live updates');
      }
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('🔄 Socket reconnected after', attemptNumber, 'attempts');
      toast.success('Reconnected to live updates');
    });

    // Real-time event updates
    this.socket.on('event:created', (event) => {
      toast.success(`New event created: ${event.title}`);
      // Trigger re-fetch of events
      window.dispatchEvent(new CustomEvent('refresh:events', { detail: event }));
    });

    this.socket.on('event:updated', (event) => {
      toast.info(`Event updated: ${event.title}`);
      window.dispatchEvent(new CustomEvent('refresh:events', { detail: event }));
    });

    this.socket.on('event:deleted', (eventId) => {
      toast.info('Event deleted');
      window.dispatchEvent(new CustomEvent('refresh:events', { detail: { _id: eventId } }));
    });

    // Real-time registration updates
    this.socket.on('registration:created', (registration) => {
      toast.success(`New registration: ${registration.name}`);
      window.dispatchEvent(new CustomEvent('refresh:registrations', { detail: registration }));
    });

    this.socket.on('registration:approved', (registration) => {
      toast.success(`Registration approved: ${registration.name}`);
      window.dispatchEvent(new CustomEvent('refresh:registrations', { detail: registration }));
    });

    this.socket.on('registration:cancelled', (registration) => {
      toast.info(`Registration cancelled: ${registration.name}`);
      window.dispatchEvent(new CustomEvent('refresh:registrations', { detail: registration }));
    });

    // Seat availability updates
    this.socket.on('seats:updated', (data) => {
      window.dispatchEvent(new CustomEvent('refresh:seats', { detail: data }));
    });

    // System notifications
    this.socket.on('notification', (notification) => {
      switch (notification.type) {
        case 'success':
          toast.success(notification.message);
          break;
        case 'error':
          toast.error(notification.message);
          break;
        case 'warning':
          toast.warning(notification.message);
          break;
        default:
          toast.info(notification.message);
      }
    });

    // Admin-specific notifications
    this.socket.on('admin:notification', (notification) => {
      toast.info(`Admin: ${notification.message}`, {
        duration: 5000,
        action: {
          label: 'View',
          onClick: () => window.location.href = '/admin/dashboard'
        }
      });
    });
  }

  // Join specific rooms for targeted updates
  joinRoom(roomName: string): void {
    this.socket?.emit('join:room', roomName);
  }

  leaveRoom(roomName: string): void {
    this.socket?.emit('leave:room', roomName);
  }

  // Join event-specific room for real-time updates
  joinEventRoom(eventId: string): void {
    this.joinRoom(`event:${eventId}`);
  }

  leaveEventRoom(eventId: string): void {
    this.leaveRoom(`event:${eventId}`);
  }

  // Join admin room for admin-specific updates
  joinAdminRoom(): void {
    this.joinRoom('admin');
  }

  leaveAdminRoom(): void {
    this.leaveRoom('admin');
  }

  // Send custom events
  emit(event: string, data: any): void {
    this.socket?.emit(event, data);
  }

  // Listen for custom events
  on(event: string, callback: (data: any) => void): void {
    this.socket?.on(event, callback);
  }

  off(event: string, callback?: (data: any) => void): void {
    this.socket?.off(event, callback);
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      console.log('🔌 Socket disconnected manually');
    }
  }

  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  getSocketId(): string | undefined {
    return this.socket?.id;
  }
}

// Create singleton instance
export const socketService = new SocketService();

// Export types for TypeScript
export interface SocketNotification {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  data?: any;
}

export interface EventUpdate {
  type: 'created' | 'updated' | 'deleted';
  event: any;
  timestamp: string;
}

export interface RegistrationUpdate {
  type: 'created' | 'approved' | 'cancelled' | 'waitlisted';
  registration: any;
  timestamp: string;
}

export interface SeatsUpdate {
  eventId: string;
  available: number;
  total: number;
  waitlist: number;
}
