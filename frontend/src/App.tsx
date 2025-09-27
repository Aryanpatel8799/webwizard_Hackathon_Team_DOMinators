import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from 'sonner';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { RealTimeProvider } from './contexts/RealTimeContext';
// import { ThemeProvider } from './hooks/useTheme';
import { ProtectedRoute } from './components/auth/ProtectedRoute';

// Pages
import { HomePage, AdminLoginPage, AdminDashboardPage, NotFoundPage } from './pages';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <NotificationProvider>
          <RealTimeProvider>
            <Router
            future={{
              v7_startTransition: true,
              v7_relativeSplatPath: true
            }}
          >
            <div className="min-h-screen bg-gray-900">
              <main>
                <Routes>
                  {/* Public routes */}
                  <Route path="/" element={<HomePage />} />
                  <Route path="/admin/login" element={<AdminLoginPage />} />
                  
                  {/* Protected admin routes */}
                  <Route 
                    path="/admin/dashboard" 
                    element={
                      <ProtectedRoute requiredPermission="events.read">
                        <AdminDashboardPage />
                      </ProtectedRoute>
                    } 
                  />
                  <Route 
                    path="/admin" 
                    element={<Navigate to="/admin/dashboard" replace />} 
                  />
                  
                  {/* 404 route */}
                  <Route path="*" element={<NotFoundPage />} />
                </Routes>
              </main>
              
              {/* Toast notifications */}
              <Toaster 
                theme="dark"
                position="top-right"
                richColors
              />
            </div>
            </Router>
          </RealTimeProvider>
        </NotificationProvider>
      </AuthProvider>
      
      {/* React Query Devtools */}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

export default App;