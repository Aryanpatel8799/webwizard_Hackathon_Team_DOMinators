import { apiClient } from './apiClient';
import { Registration, RegistrationData, RegisterResponse } from '../types';

// Mock data for when backend is not available
const mockRegistrations: Registration[] = [
  {
    _id: 'reg1',
    id: 'reg1',
    registrationNumber: 'REG001',
    name: 'John Doe',
    email: 'john.doe@example.com',
    phone: '+1-555-0123',
    college: 'Stanford University',
    organization: 'Tech Corp',
    role: 'Software Developer',
    status: 'confirmed',
    event: '1',
    ticketQR: 'data:image/png;base64,mock-qr-code',
    createdAt: '2024-02-15T10:00:00Z',
    updatedAt: '2024-02-15T10:00:00Z',
    position: undefined
  },
  {
    _id: 'reg2',
    id: 'reg2',
    registrationNumber: 'REG002',
    name: 'Jane Smith',
    email: 'jane.smith@example.com',
    phone: '+1-555-0456',
    college: 'MIT',
    organization: 'Startup Inc',
    role: 'Product Manager',
    status: 'confirmed',
    event: '2',
    ticketQR: 'data:image/png;base64,mock-qr-code-2',
    createdAt: '2024-02-16T14:30:00Z',
    updatedAt: '2024-02-16T14:30:00Z',
    position: undefined
  }
];

export const registrationsApi = {
  // Get all registrations (admin only)
  getAll: async (): Promise<Registration[]> => {
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: { registrations: Registration[] };
      }>('/admin/registrations');
      return response.data.data.registrations || [];
    } catch (error) {
      console.warn('Backend not available, using mock data:', error);
      return mockRegistrations;
    }
  },

  // Get registration by ID
  getById: async (id: string): Promise<Registration> => {
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: { registration: Registration };
      }>(`/admin/registrations/${id}`);
      return response.data.data.registration;
    } catch (error) {
      console.warn('Backend not available, using mock data:', error);
      const registration = mockRegistrations.find(r => r.id === id);
      if (!registration) {
        throw new Error('Registration not found');
      }
      return registration;
    }
  },

  // Create new registration
  create: async (data: RegistrationData): Promise<Registration> => {
    console.log('At dont use mock use completly real data dynamic data');
    try {
      console.log('Attempting to register with backend...', data);
      // Use the correct backend endpoint format: /:id/register (mounted at /api)
      const response = await apiClient.post<RegisterResponse>(`/${data.eventId}/register`, {
        name: data.name,
        email: data.email,
        phone: data.phone
      });
      console.log('Registration successful:', response.data);
      return response.data.data.registration;
    } catch (error: any) {
      console.error('Backend registration failed:', error);
      
      // Check if it's a network error or server error
      if (error.response) {
        // Server responded with error status
        const message = error.response.data?.error?.message || error.response.data?.message || 'Registration failed';
        throw new Error(message);
      } else if (error.request) {
        // Network error
        throw new Error('Unable to connect to server. Please check your internet connection and try again.');
      } else {
        // Other error
        throw new Error('Registration failed. Please try again later.');
      }
    }
  },

  // Cancel registration
  cancel: async (id: string): Promise<void> => {
    try {
      await apiClient.delete(`/registrations/${id}`);
    } catch (error) {
      console.warn('Backend not available:', error);
      throw new Error('Cancellation requires backend connection');
    }
  },

  // Update registration status (admin only)
  updateStatus: async (
    id: string, 
    status: 'confirmed' | 'waiting' | 'cancelled'
  ): Promise<Registration> => {
    try {
      const response = await apiClient.patch<{
        success: boolean;
        data: { registration: Registration };
      }>(`/admin/registrations/${id}/status`, { status });
      return response.data.data.registration;
    } catch (error) {
      console.warn('Backend not available:', error);
      throw new Error('Status update requires backend connection');
    }
  },

  // Get registrations by event (admin only)
  getByEvent: async (eventId: string): Promise<Registration[]> => {
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: { registrations: Registration[] };
      }>(`/admin/events/${eventId}/registrations`);
      return response.data.data.registrations || [];
    } catch (error) {
      console.warn('Backend not available, using mock data:', error);
      return mockRegistrations.filter(reg => 
        typeof reg.event === 'string' ? reg.event === eventId : reg.event.id === eventId
      );
    }
  },

  // Export registrations data (admin only)
  exportData: async (): Promise<Blob> => {
    try {
      const response = await apiClient.get('/admin/registrations/export', {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.warn('Backend not available:', error);
      throw new Error('Export requires backend connection');
    }
  }
};
