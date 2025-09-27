import axios, { AxiosInstance } from 'axios';

// Get base URL from environment variable
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

// Create axios instance
export const apiClient: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config: any) => {
    const token = localStorage.getItem('admin_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: any) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
apiClient.interceptors.response.use(
  (response: any) => {
    return response;
  },
  (error: any) => {
    if (error.response?.status === 401) {
      // Clear stored auth data on 401
      localStorage.removeItem('admin_token');
      localStorage.removeItem('admin_data');
      
      // Redirect to login if on admin page
      if (window.location.pathname.startsWith('/admin') && 
          window.location.pathname !== '/admin/login') {
        window.location.href = '/admin/login';
      }
    }

    // Transform error response to include message
    const errorMessage = error.response?.data?.message || 
                        error.response?.data?.error ||
                        error.message ||
                        'An unexpected error occurred';

    return Promise.reject(new Error(errorMessage));
  }
);

// Utility function for making requests with better error handling
export const makeRequest = async <T>(
  requestFn: () => Promise<T>
): Promise<T> => {
  try {
    return await requestFn();
  } catch (error) {
    console.error('API Request Error:', error);
    throw error;
  }
};

// Export configured instance as default
export default apiClient;
