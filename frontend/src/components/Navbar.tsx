import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Calendar, Moon, Sun, User } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui';
import { cn } from '../utils/cn';

const Navbar: React.FC = () => {
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();
  const { isAuthenticated, logout, admin } = useAuth();

  const isHomePage = location.pathname === '/';
  const isAdminPage = location.pathname.startsWith('/admin');

  // Don't show navbar on admin login page
  if (location.pathname === '/admin/login') {
    return null;
  }

  const handleLogout = () => {
    logout();
  };

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
        isHomePage
          ? 'bg-transparent backdrop-blur-md border-b border-white/10'
          : 'bg-gray-900/95 backdrop-blur-md border-b border-gray-800'
      )}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-white group-hover:text-cyan-400 transition-colors">
              EventHub
            </span>
          </Link>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center gap-6">
            {!isAdminPage && (
              <Link
                to="/"
                className={cn(
                  'text-gray-300 hover:text-white transition-colors',
                  isHomePage && 'text-cyan-400'
                )}
              >
                Events
              </Link>
            )}

            {isAdminPage && isAuthenticated && (
              <Link
                to="/admin/dashboard"
                className={cn(
                  'text-gray-300 hover:text-white transition-colors',
                  location.pathname === '/admin/dashboard' && 'text-cyan-400'
                )}
              >
                Dashboard
              </Link>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`}
            >
              {theme === 'dark' ? (
                <Sun className="w-5 h-5 text-gray-300" />
              ) : (
                <Moon className="w-5 h-5 text-gray-300" />
              )}
            </button>

            {/* Admin Actions */}
            {isAdminPage ? (
              isAuthenticated ? (
                <div className="flex items-center gap-3">
                  <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-white/10 rounded-lg">
                    <User className="w-4 h-4 text-cyan-400" />
                    <span className="text-sm text-gray-300">
                      {admin?.name || 'Admin'}
                    </span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleLogout}
                  >
                    Logout
                  </Button>
                </div>
              ) : null
            ) : (
              <Link to="/admin/login">
                <Button variant="secondary" size="sm">
                  Admin Login
                </Button>
              </Link>
            )}
          </div>
        </div>
      </div>
    </motion.nav>
  );
};

export default Navbar;
