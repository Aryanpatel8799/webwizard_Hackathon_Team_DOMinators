import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, 
  X, 
  CheckCircle, 
  AlertTriangle, 
  Info, 
  Clock,
  Settings,
  ExternalLink,
  Check
} from 'lucide-react';
import { Button, Card, CardContent } from '../ui';
import { useNotifications, Notification, getNotificationIcon } from '../../contexts/NotificationContext';
import { formatDistanceToNow } from 'date-fns';

interface NotificationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({
  isOpen,
  onClose,
  position = 'top-right'
}) => {
  const { state, markAsRead, markAllAsRead, removeNotification } = useNotifications();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const filteredNotifications = state.notifications.filter(notification => {
    const matchesReadFilter = filter === 'all' || !notification.read;
    const matchesCategoryFilter = categoryFilter === 'all' || notification.category === categoryFilter;
    return matchesReadFilter && matchesCategoryFilter;
  });

  const categories = ['all', 'system', 'event', 'registration', 'reminder', 'alert'];

  const getPositionClasses = () => {
    switch (position) {
      case 'top-left':
        return 'top-16 left-4';
      case 'bottom-right':
        return 'bottom-4 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      default:
        return 'top-16 right-4';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'system':
        return Settings;
      case 'event':
        return Clock;
      case 'registration':
        return CheckCircle;
      case 'reminder':
        return Bell;
      case 'alert':
        return AlertTriangle;
      default:
        return Info;
    }
  };

  const getPriorityColor = (priority: Notification['priority']) => {
    switch (priority) {
      case 'urgent':
        return 'border-l-red-500 bg-red-500/5';
      case 'high':
        return 'border-l-orange-500 bg-orange-500/5';
      case 'medium':
        return 'border-l-yellow-500 bg-yellow-500/5';
      default:
        return 'border-l-blue-500 bg-blue-500/5';
    }
  };

  const getTypeColor = (type: Notification['type']) => {
    switch (type) {
      case 'success':
        return 'text-green-400';
      case 'warning':
        return 'text-yellow-400';
      case 'error':
        return 'text-red-400';
      default:
        return 'text-blue-400';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            className={`fixed ${getPositionClasses()} w-96 z-50`}
          >
            <Card className="bg-gray-900/95 backdrop-blur-sm border-white/10 shadow-2xl">
              <CardContent className="p-0">
                {/* Header */}
                <div className="p-4 border-b border-white/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Bell className="w-5 h-5 text-cyan-400" />
                      <h3 className="text-lg font-semibold text-white">
                        Notifications
                      </h3>
                      {state.unreadCount > 0 && (
                        <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                          {state.unreadCount}
                        </span>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={onClose}
                      className="text-gray-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Filters */}
                  <div className="flex items-center space-x-2 mt-3">
                    <div className="flex space-x-1">
                      <Button
                        variant={filter === 'all' ? 'primary' : 'ghost'}
                        size="sm"
                        onClick={() => setFilter('all')}
                        className="text-xs"
                      >
                        All
                      </Button>
                      <Button
                        variant={filter === 'unread' ? 'primary' : 'ghost'}
                        size="sm"
                        onClick={() => setFilter('unread')}
                        className="text-xs"
                      >
                        Unread
                      </Button>
                    </div>

                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="bg-gray-800 border border-white/20 rounded px-2 py-1 text-xs text-white"
                    >
                      {categories.map(category => (
                        <option key={category} value={category}>
                          {category.charAt(0).toUpperCase() + category.slice(1)}
                        </option>
                      ))}
                    </select>

                    {state.unreadCount > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={markAllAsRead}
                        className="text-xs text-cyan-400 hover:text-cyan-300"
                      >
                        <Check className="w-3 h-3 mr-1" />
                        Mark all read
                      </Button>
                    )}
                  </div>
                </div>

                {/* Notifications List */}
                <div className="max-h-96 overflow-y-auto">
                  {filteredNotifications.length === 0 ? (
                    <div className="p-8 text-center text-gray-400">
                      <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">
                        {filter === 'unread' ? 'No unread notifications' : 'No notifications'}
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-white/5">
                      {filteredNotifications.map((notification) => {
                        const Icon = getNotificationIcon(notification.type);
                        const CategoryIcon = getCategoryIcon(notification.category);
                        
                        return (
                          <motion.div
                            key={notification.id}
                            layout
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className={`p-4 border-l-4 ${getPriorityColor(notification.priority)} ${
                              !notification.read ? 'bg-white/5' : 'hover:bg-white/5'
                            } transition-colors cursor-pointer group`}
                            onClick={() => markAsRead(notification.id)}
                          >
                            <div className="flex items-start space-x-3">
                              <div className={`flex-shrink-0 ${getTypeColor(notification.type)}`}>
                                <Icon className="w-5 h-5" />
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <p className="text-sm font-medium text-white truncate">
                                    {notification.title}
                                  </p>
                                  <div className="flex items-center space-x-1">
                                    <CategoryIcon className="w-3 h-3 text-gray-400" />
                                    {!notification.read && (
                                      <div className="w-2 h-2 bg-cyan-400 rounded-full" />
                                    )}
                                  </div>
                                </div>

                                <p className="text-sm text-gray-400 mt-1">
                                  {notification.message}
                                </p>

                                <div className="flex items-center justify-between mt-2">
                                  <div className="flex items-center space-x-2">
                                    <span className="text-xs text-gray-500">
                                      {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                                    </span>
                                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                                      notification.priority === 'urgent' ? 'bg-red-500/20 text-red-300' :
                                      notification.priority === 'high' ? 'bg-orange-500/20 text-orange-300' :
                                      notification.priority === 'medium' ? 'bg-yellow-500/20 text-yellow-300' :
                                      'bg-gray-500/20 text-gray-300'
                                    }`}>
                                      {notification.priority}
                                    </span>
                                  </div>

                                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {notification.actionUrl && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          window.open(notification.actionUrl, '_blank');
                                        }}
                                        className="text-xs text-cyan-400 hover:text-cyan-300"
                                      >
                                        <ExternalLink className="w-3 h-3 mr-1" />
                                        {notification.actionLabel || 'View'}
                                      </Button>
                                    )}
                                    
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        removeNotification(notification.id);
                                      }}
                                      className="text-gray-400 hover:text-red-400"
                                    >
                                      <X className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Footer */}
                {filteredNotifications.length > 0 && (
                  <div className="p-3 border-t border-white/10 bg-gray-800/50">
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span>{filteredNotifications.length} notification{filteredNotifications.length !== 1 ? 's' : ''}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-gray-400 hover:text-white"
                      >
                        <Settings className="w-3 h-3 mr-1" />
                        Settings
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

// Notification Bell Icon Component
export const NotificationBell: React.FC<{
  onClick: () => void;
  className?: string;
}> = ({ onClick, className = '' }) => {
  const { state } = useNotifications();

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      className={`relative ${className}`}
    >
      <Bell className="w-5 h-5" />
      {state.unreadCount > 0 && (
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full min-w-[1.25rem] h-5 flex items-center justify-center font-medium"
        >
          {state.unreadCount > 99 ? '99+' : state.unreadCount}
        </motion.span>
      )}
    </Button>
  );
};

export default NotificationPanel;
