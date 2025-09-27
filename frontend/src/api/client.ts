// API client configuration and base HTTP client
import type { ApiResponse, PaginatedResponse } from '@/types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

interface RequestConfig {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  params?: Record<string, string | number>;
}

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private getAuthHeaders(): Record<string, string> {
    const token = localStorage.getItem('admin_token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  private buildURL(endpoint: string, params?: Record<string, string | number>): string {
    const url = new URL(endpoint, this.baseURL);
    
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
      });
    }
    
    return url.toString();
  }

  async request<T = any>(endpoint: string, config: RequestConfig = { method: 'GET' }): Promise<T> {
    const url = this.buildURL(endpoint, config.params);
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...this.getAuthHeaders(),
      ...config.headers,
    };

    const requestConfig: RequestInit = {
      method: config.method,
      headers,
    };

    // Add body for non-GET requests
    if (config.body && config.method !== 'GET') {
      requestConfig.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(url, requestConfig);
      
      // Handle different content types
      const contentType = response.headers.get('content-type');
      let data: any;
      
      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      // Handle HTTP errors
      if (!response.ok) {
        const error = {
          message: data?.error?.message || data?.message || 'An error occurred',
          statusCode: response.status,
          details: data?.error?.details || null,
        };
        
        throw new ApiError(error.message, error.statusCode, error.details);
      }

      return data;
    } catch (error) {
      // Handle network errors
      if (error instanceof ApiError) {
        throw error;
      }
      
      throw new ApiError(
        'Network error. Please check your connection.',
        0,
        { originalError: error }
      );
    }
  }

  // Convenience methods
  async get<T = any>(endpoint: string, params?: Record<string, string | number>): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET', params });
  }

  async post<T = any>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, { method: 'POST', body });
  }

  async put<T = any>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, { method: 'PUT', body });
  }

  async patch<T = any>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, { method: 'PATCH', body });
  }

  async delete<T = any>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // File upload method
  async uploadFile<T = any>(endpoint: string, file: File, additionalData?: Record<string, any>): Promise<T> {
    const formData = new FormData();
    formData.append('file', file);
    
    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, String(value));
      });
    }

    const headers = {
      ...this.getAuthHeaders(),
      // Don't set Content-Type for FormData, let browser set it with boundary
    };

    const response = await fetch(this.buildURL(endpoint), {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new ApiError(
        errorData?.error?.message || 'Upload failed',
        response.status,
        errorData?.error?.details
      );
    }

    return response.json();
  }

  // Download file method
  async downloadFile(endpoint: string, filename: string): Promise<void> {
    const response = await fetch(this.buildURL(endpoint), {
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new ApiError('Download failed', response.status);
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
}

/**
 * Custom error class for API errors
 */
export class ApiError extends Error {
  public statusCode: number;
  public details?: any;

  constructor(message: string, statusCode: number, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

/**
 * Main API client instance
 */
export const apiClient = new ApiClient(API_BASE_URL);

/**
 * Response type helpers
 */
export type { ApiResponse, PaginatedResponse };
