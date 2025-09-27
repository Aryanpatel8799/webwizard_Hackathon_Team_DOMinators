import { apiClient } from './apiClient';

export interface AdminLoginData {
  email: string;
  password: string;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions: {
    events: { create: boolean; read: boolean; update: boolean; delete: boolean };
    registrations: { read: boolean; update: boolean; delete: boolean };
    admin: { read: boolean; create: boolean; update: boolean; delete: boolean };
  };
}

export interface AdminLoginResponse {
  success: boolean;
  data: {
    token: string;
    admin: AdminUser;
  };
  message: string;
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

export const adminApi = {
  // Authentication
  login: async (data: AdminLoginData): Promise<AdminLoginResponse> => {
    const response = await apiClient.post<AdminLoginResponse>('/auth/login', data);
    return response.data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout');
  },

  getCurrentAdmin: async (): Promise<AdminUser> => {
    const response = await apiClient.get<{ success: boolean; data: { admin: AdminUser } }>('/auth/me');
    return response.data.data.admin;
  },

  // Analytics
  getAnalytics: async (): Promise<AdminStats> => {
    try {
      const response = await apiClient.get<{ success: boolean; data: AdminStats }>('/admin/analytics');
      return response.data.data;
    } catch (error) {
      // Return mock data for demo
      return {
        totalEvents: 15,
        totalRegistrations: 342,
        totalRevenue: 12450,
        activeEvents: 8,
        eventsGrowth: 12,
        registrationsGrowth: 25,
        revenueGrowth: 18
      };
    }
  },

  // Event Management
  getAllEvents: async (): Promise<any[]> => {
    try {
      const response = await apiClient.get<{ success: boolean; data: any[] }>('/admin/events');
      return response.data.data;
    } catch (error) {
      console.warn('Admin events endpoint not available, using public events');
      const response = await apiClient.get<{ success: boolean; data: any[] }>('/events');
      return response.data.data || [];
    }
  },

  createEvent: async (eventData: any): Promise<any> => {
    const response = await apiClient.post<{ success: boolean; data: any }>('/admin/events', eventData);
    return response.data.data;
  },

  updateEvent: async (id: string, eventData: any): Promise<any> => {
    const response = await apiClient.put<{ success: boolean; data: any }>(`/admin/events/${id}`, eventData);
    return response.data.data;
  },

  deleteEvent: async (id: string): Promise<void> => {
    await apiClient.delete(`/admin/events/${id}`);
  },

  updateEventStatus: async (id: string, status: string): Promise<any> => {
    const response = await apiClient.patch<{ success: boolean; data: any }>(`/admin/events/${id}/status`, { status });
    return response.data.data;
  },

  // Registration Management
  getAllRegistrations: async (params?: any): Promise<any[]> => {
    try {
      const queryParams = new URLSearchParams(params).toString();
      const response = await apiClient.get<{ success: boolean; data: any[] }>(`/admin/registrations?${queryParams}`);
      return response.data.data;
    } catch (error) {
      console.warn('Admin registrations endpoint not available');
      return [];
    }
  },

  updateRegistration: async (id: string, data: any): Promise<any> => {
    const response = await apiClient.put<{ success: boolean; data: any }>(`/admin/registrations/${id}`, data);
    return response.data.data;
  },

  deleteRegistration: async (id: string): Promise<void> => {
    await apiClient.delete(`/admin/registrations/${id}`);
  },

  approveRegistration: async (id: string): Promise<any> => {
    const response = await apiClient.post<{ success: boolean; data: any }>(`/admin/registrations/${id}/approve`);
    return response.data.data;
  }
};
