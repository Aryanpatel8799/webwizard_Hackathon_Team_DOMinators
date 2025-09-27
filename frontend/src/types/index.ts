// Shared TypeScript interfaces and types

export interface Event {
  _id: string;
  id: string;
  name: string; // Changed from title to name
  title: string;
  description: string;
  date: string;
  location: string; // Changed from venue to location
  venue: string;
  price?: number; // Added price field
  capacity: number;
  totalSeats: number; // Added alias for capacity
  attendeesCount: number;
  registeredCount: number; // Added alias for attendeesCount
  availableSeats: number;
  category: string;
  tags: string[];
  isActive: boolean;
  isRegistrationOpen: boolean;
  registrationDeadline?: string;
  organizer: {
    name: string;
    email: string;
    phone?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Registration {
  _id: string;
  id: string;
  registrationNumber: string;
  name: string;
  email: string;
  phone?: string;
  college?: string;
  organization?: string;
  role?: string;
  status: 'confirmed' | 'waiting' | 'cancelled';
  event: Event | string;
  ticketQR?: string;
  createdAt: string;
  updatedAt: string;
  position?: number; // For waiting list
}

export interface RegisterRequest {
  name: string;
  email: string;
  phone?: string;
  college?: string;
  organization?: string;
  role?: string;
}

export interface RegisterResponse {
  success: boolean;
  data: {
    registration: Registration;
    message: string;
  };
  message: string;
}

export interface Admin {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'superadmin' | 'moderator';
  permissions: {
    events: {
      create: boolean;
      read: boolean;
      update: boolean;
      delete: boolean;
    };
    registrations: {
      read: boolean;
      update: boolean;
      delete: boolean;
    };
    admin: {
      read: boolean;
      create: boolean;
      update: boolean;
      delete: boolean;
    };
  };
  lastLoginAt?: string;
  createdAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  success: boolean;
  data: {
    token: string;
    admin: Admin;
  };
  message: string;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message: string;
  error?: {
    message: string;
    statusCode: number;
    details?: any;
  };
}

export interface PaginatedResponse<T = any> {
  success: boolean;
  data: T[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface EventStats {
  event: {
    id: string;
    title: string;
    capacity: number;
    date: string;
  };
  period: {
    start: string;
    end: string;
    duration: string;
  };
  dailyRegistrations: Array<{
    _id: string;
    confirmed: number;
    waiting: number;
    cancelled: number;
  }>;
  overallStats: {
    confirmed: number;
    waiting: number;
    cancelled: number;
  };
  availableSeats: number;
  registrationRate: string;
}

export interface SocketEvents {
  // Client -> Server
  join_event_room: { eventId: string };
  join_admin_room: {};
  
  // Server -> Client
  'update:event': { 
    eventId: string; 
    confirmedCount: number; 
    waitingCount: number; 
    availableSeats: number;
  };
  'registration:created': Registration;
  'registration:updated': Registration;
  'admin:notification': {
    type: 'info' | 'success' | 'warning' | 'error';
    message: string;
    data?: any;
  };
}

export type ThemeMode = 'light' | 'dark' | 'system';

export type EventStatus = 'upcoming' | 'live' | 'full' | 'ended';

export interface FormError {
  field: string;
  message: string;
}

export interface RegistrationData {
  name: string;
  email: string;
  phone: string;
  eventId: string;
}

export interface AdminStats {
  totalEvents: number;
  totalRegistrations: number;
  totalRevenue: number;
  activeEvents: number;
  eventsGrowth?: number;
  registrationsGrowth?: number;
  revenueGrowth?: number;
}
