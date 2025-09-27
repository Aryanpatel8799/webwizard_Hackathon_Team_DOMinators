import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'superadmin' | 'moderator';
  requiredPermission?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole,
  requiredPermission 
}) => {
  const { isAuthenticated, admin, isLoading } = useAuth();

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-cyan-400 mx-auto mb-4" />
          <p className="text-gray-400">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated || !admin) {
    return <Navigate to="/admin/login" replace />;
  }

  // Check role-based access
  if (requiredRole && admin.role !== requiredRole) {
    // Allow superadmin to access everything
    if (admin.role !== 'superadmin') {
      return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-red-400 text-2xl">⚠</span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
            <p className="text-gray-400 mb-4">
              You don't have permission to access this page.
            </p>
            <p className="text-sm text-gray-500">
              Required role: {requiredRole} | Your role: {admin.role}
            </p>
            <button
              onClick={() => window.history.back()}
              className="mt-6 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      );
    }
  }

  // Check permission-based access
  if (requiredPermission && admin.permissions) {
    const hasPermission = checkPermission(admin.permissions, requiredPermission);
    if (!hasPermission && admin.role !== 'superadmin') {
      return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-red-400 text-2xl">⚠</span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Access Denied</h1>
            <p className="text-gray-400 mb-4">
              You don't have permission to access this feature.
            </p>
            <p className="text-sm text-gray-500">
              Required permission: {requiredPermission}
            </p>
            <button
              onClick={() => window.history.back()}
              className="mt-6 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors"
            >
              Go Back
            </button>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
};

// Helper function to check permissions
function checkPermission(permissions: any, requiredPermission: string): boolean {
  const [resource, action] = requiredPermission.split('.');
  
  if (!permissions[resource]) return false;
  if (!permissions[resource][action]) return false;
  
  return permissions[resource][action] === true;
}
