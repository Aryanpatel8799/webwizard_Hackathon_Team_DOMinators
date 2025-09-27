import { apiClient } from './apiClient';
import { Event } from '../types';

// Transform backend event to frontend Event interface
const transformBackendEvent = (backendEvent: any): Event => {
  return {
    _id: backendEvent._id,
    id: backendEvent._id, // Use _id as id
    name: backendEvent.title, // Backend uses 'title', frontend uses 'name'
    title: backendEvent.title,
    description: backendEvent.description,
    date: backendEvent.date,
    location: backendEvent.venue, // Backend uses 'venue', frontend uses 'location'
    venue: backendEvent.venue,
    price: 0, // Backend doesn't have price, default to 0 or make it free
    capacity: backendEvent.capacity,
    totalSeats: backendEvent.capacity, // Alias
    attendeesCount: backendEvent.attendeesCount || 0,
    registeredCount: backendEvent.attendeesCount || 0, // Alias
    availableSeats: backendEvent.availableSeats || (backendEvent.capacity - (backendEvent.attendeesCount || 0)),
    category: backendEvent.category,
    tags: backendEvent.tags || [],
    isActive: backendEvent.isActive !== false, // Default to true if not specified
    isRegistrationOpen: new Date(backendEvent.registrationDeadline || backendEvent.date) > new Date(), // Check if registration is still open
    registrationDeadline: backendEvent.registrationDeadline,
    organizer: backendEvent.organizer || {
      name: 'Event Organizer',
      email: 'organizer@example.com'
    },
    createdAt: backendEvent.createdAt,
    updatedAt: backendEvent.updatedAt
  };
};

// Mock data for when backend is not available
const mockEvents: Event[] = [
  {
    _id: '1',
    id: '1',
    name: 'Web Development Conference 2024',
    title: 'Web Development Conference 2024',
    description: 'Join us for an exciting conference featuring the latest trends in web development, including React, TypeScript, and modern deployment strategies.',
    date: '2024-03-15T10:00:00Z',
    location: 'Tech Hub Convention Center, San Francisco',
    venue: 'Tech Hub Convention Center, San Francisco',
    price: 199,
    capacity: 500,
    totalSeats: 500,
    attendeesCount: 387,
    registeredCount: 387,
    availableSeats: 113,
    category: 'Technology',
    tags: ['React', 'TypeScript', 'Web Development'],
    isActive: true,
    isRegistrationOpen: true,
    registrationDeadline: '2024-03-10T23:59:59Z',
    organizer: {
      name: 'TechEvents Inc.',
      email: 'info@techevents.com',
      phone: '+1-555-0123'
    },
    createdAt: '2024-01-15T08:00:00Z',
    updatedAt: '2024-02-20T14:30:00Z'
  },
  {
    _id: '2',
    id: '2',
    name: 'AI & Machine Learning Summit',
    title: 'AI & Machine Learning Summit',
    description: 'Explore the cutting-edge developments in artificial intelligence and machine learning with industry experts and researchers.',
    date: '2024-04-22T09:00:00Z',
    location: 'Innovation Center, New York',
    venue: 'Innovation Center, New York',
    price: 299,
    capacity: 300,
    totalSeats: 300,
    attendeesCount: 245,
    registeredCount: 245,
    availableSeats: 55,
    category: 'Technology',
    tags: ['AI', 'Machine Learning', 'Data Science'],
    isActive: true,
    isRegistrationOpen: true,
    registrationDeadline: '2024-04-18T23:59:59Z',
    organizer: {
      name: 'AI Research Foundation',
      email: 'events@airf.org',
      phone: '+1-555-0456'
    },
    createdAt: '2024-01-20T10:00:00Z',
    updatedAt: '2024-02-25T16:45:00Z'
  },
  {
    _id: '3',
    id: '3',
    name: 'Startup Pitch Competition',
    title: 'Startup Pitch Competition',
    description: 'Present your startup ideas to a panel of investors and venture capitalists. Network with fellow entrepreneurs and industry leaders.',
    date: '2024-05-10T18:00:00Z',
    location: 'Entrepreneur Hub, Austin',
    venue: 'Entrepreneur Hub, Austin',
    price: 50,
    capacity: 200,
    totalSeats: 200,
    attendeesCount: 189,
    registeredCount: 189,
    availableSeats: 11,
    category: 'Business',
    tags: ['Startup', 'Entrepreneurship', 'Networking'],
    isActive: true,
    isRegistrationOpen: true,
    registrationDeadline: '2024-05-05T23:59:59Z',
    organizer: {
      name: 'Startup Accelerator',
      email: 'events@startupaccel.com',
      phone: '+1-555-0789'
    },
    createdAt: '2024-02-01T12:00:00Z',
    updatedAt: '2024-03-01T09:15:00Z'
  }
];

export const eventsApi = {
  // Get all events
  getAll: async (): Promise<Event[]> => {
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: any[];  // Backend events
        pagination?: any;
      }>('/events');
      const backendEvents = response.data.data || [];
      // Transform backend events to frontend Event interface
      const events = backendEvents.map(transformBackendEvent);
      return events;
    } catch (error) {
      console.warn('Backend not available, using mock data:', error);
      return mockEvents;
    }
  },

  // Get event by ID
  getById: async (id: string): Promise<Event> => {
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: any; // Backend event
      }>(`/events/${id}`);
      return transformBackendEvent(response.data.data);
    } catch (error) {
      console.warn('Backend not available, using mock data:', error);
      const event = mockEvents.find(e => e.id === id);
      if (!event) {
        throw new Error('Event not found');
      }
      return event;
    }
  },

  // Create new event (admin only)
  create: async (data: Omit<Event, 'id' | '_id' | 'createdAt' | 'updatedAt'>): Promise<Event> => {
    try {
      const response = await apiClient.post<{
        success: boolean;
        data: { event: Event };
      }>('/admin/events', data);
      return response.data.data.event;
    } catch (error) {
      console.warn('Backend not available:', error);
      throw new Error('Event creation requires backend connection');
    }
  },

  // Update event (admin only)
  update: async (id: string, data: Partial<Event>): Promise<Event> => {
    try {
      const response = await apiClient.put<{
        success: boolean;
        data: { event: Event };
      }>(`/admin/events/${id}`, data);
      return response.data.data.event;
    } catch (error) {
      console.warn('Backend not available:', error);
      throw new Error('Event update requires backend connection');
    }
  },

  // Delete event (admin only)
  delete: async (id: string): Promise<void> => {
    try {
      await apiClient.delete(`/admin/events/${id}`);
    } catch (error) {
      console.warn('Backend not available:', error);
      throw new Error('Event deletion requires backend connection');
    }
  },

  // Get events by category
  getByCategory: async (category: string): Promise<Event[]> => {
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: { events: Event[] };
      }>(`/events/category/${category}`);
      return response.data.data.events || [];
    } catch (error) {
      console.warn('Backend not available, using mock data:', error);
      return mockEvents.filter(event => event.category === category);
    }
  },

  // Search events
  search: async (query: string): Promise<Event[]> => {
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: { events: Event[] };
      }>(`/events/search?q=${encodeURIComponent(query)}`);
      return response.data.data.events || [];
    } catch (error) {
      console.warn('Backend not available, using mock data:', error);
      return mockEvents.filter(event => 
        event.name.toLowerCase().includes(query.toLowerCase()) ||
        event.description.toLowerCase().includes(query.toLowerCase())
      );
    }
  },

  // Get upcoming events
  getUpcoming: async (): Promise<Event[]> => {
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: { events: Event[] };
      }>('/events/upcoming');
      return response.data.data.events || [];
    } catch (error) {
      console.warn('Backend not available, using mock data:', error);
      const now = new Date();
      return mockEvents.filter(event => new Date(event.date) > now);
    }
  },

  // Get featured events
  getFeatured: async (): Promise<Event[]> => {
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: { events: Event[] };
      }>('/events/featured');
      return response.data.data.events || [];
    } catch (error) {
      console.warn('Backend not available, using mock data:', error);
      return mockEvents.slice(0, 2); // Return first 2 as featured
    }
  },

  // Seat hold system methods
  holdSeat: async (eventId: string, seatsToHold: number = 1): Promise<any> => {
    try {
      const response = await apiClient.post<{
        success: boolean;
        data: any;
        message?: string;
      }>(`/events/${eventId}/hold-seat`, { seatsToHold });
      return response.data;
    } catch (error: any) {
      console.warn('Seat hold not available, simulating:', error);
      // Simulate seat hold for demo
      return {
        success: true,
        data: {
          id: `hold_${Date.now()}`,
          eventId,
          userId: 'user_123',
          seatsHeld: seatsToHold,
          expiresAt: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes
          status: 'active'
        }
      };
    }
  },

  releaseSeat: async (holdId: string): Promise<any> => {
    try {
      const response = await apiClient.delete<{
        success: boolean;
        message?: string;
      }>(`/seat-holds/${holdId}`);
      return response.data;
    } catch (error: any) {
      console.warn('Seat release not available, simulating:', error);
      // Simulate for demo
      return { success: true, message: 'Seat released' };
    }
  },

  confirmSeat: async (holdId: string): Promise<any> => {
    try {
      const response = await apiClient.post<{
        success: boolean;
        data: any;
        message?: string;
      }>(`/seat-holds/${holdId}/confirm`);
      return response.data;
    } catch (error: any) {
      console.warn('Seat confirmation not available, simulating:', error);
      // Simulate for demo
      return { 
        success: true, 
        data: { status: 'confirmed' },
        message: 'Seat confirmed' 
      };
    }
  }
};
