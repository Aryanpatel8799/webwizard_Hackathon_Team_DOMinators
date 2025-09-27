import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api';
import type { Admin } from '../types';

interface AuthState {
  isAuthenticated: boolean;
  admin: Admin | null;
  token: string | null;
  isLoading: boolean;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = 'admin_token';
const ADMIN_KEY = 'admin_data';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    admin: null,
    token: null,
    isLoading: true,
  });

  const login = async (email: string, password: string) => {
    try {
      const response = await api.admin.login({ email, password });
      const { admin: backendAdmin, token } = response.data;
      
      // Map backend admin to frontend Admin type
      const admin: Admin = {
        ...backendAdmin,
        role: (backendAdmin.role as 'admin' | 'superadmin' | 'moderator') || 'admin',
        createdAt: new Date().toISOString(), // Backend doesn't return this, so use current time
        lastLoginAt: new Date().toISOString()
      };
      
      localStorage.setItem(STORAGE_KEY, token);
      localStorage.setItem(ADMIN_KEY, JSON.stringify(admin));
      setState({
        isAuthenticated: true,
        admin,
        token,
        isLoading: false,
      });
    } catch (error) {
      throw error; // Re-throw for the component to handle
    }
  };

  const logout = () => {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(ADMIN_KEY);
    setState({
      isAuthenticated: false,
      admin: null,
      token: null,
      isLoading: false,
    });
  };

  const checkAuth = () => {
    const token = localStorage.getItem(STORAGE_KEY);
    const adminData = localStorage.getItem(ADMIN_KEY);

    if (token && adminData) {
      try {
        const admin = JSON.parse(adminData) as Admin;
        
        // Check if token is expired (basic check)
        const payload = JSON.parse(atob(token.split('.')[1]));
        const isExpired = payload.exp * 1000 < Date.now();

        if (!isExpired) {
          setState({
            isAuthenticated: true,
            admin,
            token,
            isLoading: false,
          });
          return;
        }
      } catch (error) {
        console.error('Error parsing stored auth data:', error);
      }
    }

    // Clear invalid data
    logout();
    setState(prev => ({ ...prev, isLoading: false }));
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const contextValue: AuthContextType = {
    ...state,
    login,
    logout,
    checkAuth,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Higher-order component for protected routes
export function withAuth<P extends object>(Component: React.ComponentType<P>) {
  return function AuthenticatedComponent(props: P) {
    const { isAuthenticated, isLoading } = useAuth();

    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      );
    }

    if (!isAuthenticated) {
      return (
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
              Access Denied
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              Please log in to access this page.
            </p>
          </div>
        </div>
      );
    }

    return <Component {...props} />;
  };
}
