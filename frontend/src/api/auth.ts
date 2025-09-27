import { apiClient } from './apiClient';
import { Admin, LoginRequest } from '../types';

// Mock admin for demo purposes
const mockAdmin: Admin = {
  id: 'admin1',
  name: 'Demo Admin',
  email: 'admin@demo.com',
  role: 'admin',
  permissions: {
    events: {
      create: true,
      read: true,
      update: true,
      delete: true,
    },
    registrations: {
      read: true,
      update: true,
      delete: true,
    },
    admin: {
      read: true,
      create: false,
      update: false,
      delete: false,
    },
  },
  lastLoginAt: new Date().toISOString(),
  createdAt: '2024-01-01T00:00:00Z',
};

export const authApi = {
  // Admin login
  login: async (credentials: LoginRequest): Promise<{
    admin: Admin;
    token: string;
  }> => {
    try {
      const response = await apiClient.post<{
        success: boolean;
        data: {
          admin: Admin;
          token: string;
        };
      }>('/admin/login', credentials);
      return response.data.data;
    } catch (error) {
      console.warn('Backend not available, using demo login:', error);
      // Demo login - accept any credentials for demo
      if (credentials.email === 'admin@demo.com' && credentials.password === 'password') {
        return {
          admin: mockAdmin,
          token: 'demo-jwt-token-12345'
        };
      }
      throw new Error('Invalid credentials. For demo: admin@demo.com / password');
    }
  },

  // Verify token
  verifyToken: async (): Promise<Admin> => {
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: { admin: Admin };
      }>('/admin/verify');
      return response.data.data.admin;
    } catch (error) {
      console.warn('Backend not available, using mock admin:', error);
      // For demo, return mock admin if token exists
      const token = localStorage.getItem('admin_token');
      if (token) {
        return mockAdmin;
      }
      throw new Error('No valid token');
    }
  },

  // Admin logout (clear server-side session if needed)
  logout: async (): Promise<void> => {
    try {
      await apiClient.post('/admin/logout');
    } catch (error) {
      console.warn('Backend not available for logout:', error);
      // For demo, we just clear local storage (handled by AuthContext)
    }
  },

  // Get admin profile
  getProfile: async (): Promise<Admin> => {
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: { admin: Admin };
      }>('/admin/profile');
      return response.data.data.admin;
    } catch (error) {
      console.warn('Backend not available, using mock admin:', error);
      return mockAdmin;
    }
  },

  // Update admin profile
  updateProfile: async (data: Partial<Admin>): Promise<Admin> => {
    try {
      const response = await apiClient.put<{
        success: boolean;
        data: { admin: Admin };
      }>('/admin/profile', data);
      return response.data.data.admin;
    } catch (error) {
      console.warn('Backend not available:', error);
      throw new Error('Profile update requires backend connection');
    }
  },

  // Change password
  changePassword: async (data: {
    currentPassword: string;
    newPassword: string;
  }): Promise<void> => {
    try {
      await apiClient.post('/admin/change-password', data);
    } catch (error) {
      console.warn('Backend not available:', error);
      throw new Error('Password change requires backend connection');
    }
  }
};
