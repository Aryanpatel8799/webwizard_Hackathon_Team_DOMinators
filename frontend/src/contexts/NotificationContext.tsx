import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { toast } from 'sonner';
import { 
  CheckCircle, 
  AlertTriangle, 
  Info
} from 'lucide-react';

// Types
export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  category: 'system' | 'event' | 'registration' | 'reminder' | 'alert';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  actionUrl?: string;
  actionLabel?: string;
  expiresAt?: Date;
  metadata?: Record<string, any>;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  preferences: NotificationPreferences;
  isConnected: boolean;
}

interface NotificationPreferences {
  enablePush: boolean;
  enableEmail: boolean;
  enableSMS: boolean;
  enableInApp: boolean;
  categories: {
    system: boolean;
    event: boolean;
    registration: boolean;
    reminder: boolean;
    alert: boolean;
  };
  schedule: {
    quietHoursStart: string;
    quietHoursEnd: string;
    timezone: string;
  };
}

type NotificationAction =
  | { type: 'ADD_NOTIFICATION'; notification: Notification }
  | { type: 'MARK_READ'; id: string }
  | { type: 'MARK_ALL_READ' }
  | { type: 'REMOVE_NOTIFICATION'; id: string }
  | { type: 'CLEAR_EXPIRED' }
  | { type: 'UPDATE_PREFERENCES'; preferences: Partial<NotificationPreferences> }
  | { type: 'SET_CONNECTION_STATUS'; connected: boolean }
  | { type: 'LOAD_NOTIFICATIONS'; notifications: Notification[] };

// Initial state
const initialState: NotificationState = {
  notifications: [],
  unreadCount: 0,
  preferences: {
    enablePush: true,
    enableEmail: true,
    enableSMS: false,
    enableInApp: true,
    categories: {
      system: true,
      event: true,
      registration: true,
      reminder: true,
      alert: true,
    },
    schedule: {
      quietHoursStart: '22:00',
      quietHoursEnd: '08:00',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  },
  isConnected: false,
};

// Reducer
const notificationReducer = (
  state: NotificationState,
  action: NotificationAction
): NotificationState => {
  switch (action.type) {
    case 'ADD_NOTIFICATION':
      const newNotifications = [action.notification, ...state.notifications];
      return {
        ...state,
        notifications: newNotifications,
        unreadCount: newNotifications.filter(n => !n.read).length,
      };

    case 'MARK_READ':
      const updatedNotifications = state.notifications.map(n =>
        n.id === action.id ? { ...n, read: true } : n
      );
      return {
        ...state,
        notifications: updatedNotifications,
        unreadCount: updatedNotifications.filter(n => !n.read).length,
      };

    case 'MARK_ALL_READ':
      const allReadNotifications = state.notifications.map(n => ({ ...n, read: true }));
      return {
        ...state,
        notifications: allReadNotifications,
        unreadCount: 0,
      };

    case 'REMOVE_NOTIFICATION':
      const filteredNotifications = state.notifications.filter(n => n.id !== action.id);
      return {
        ...state,
        notifications: filteredNotifications,
        unreadCount: filteredNotifications.filter(n => !n.read).length,
      };

    case 'CLEAR_EXPIRED':
      const now = new Date();
      const validNotifications = state.notifications.filter(
        n => !n.expiresAt || n.expiresAt > now
      );
      return {
        ...state,
        notifications: validNotifications,
        unreadCount: validNotifications.filter(n => !n.read).length,
      };

    case 'UPDATE_PREFERENCES':
      return {
        ...state,
        preferences: { ...state.preferences, ...action.preferences },
      };

    case 'SET_CONNECTION_STATUS':
      return {
        ...state,
        isConnected: action.connected,
      };

    case 'LOAD_NOTIFICATIONS':
      return {
        ...state,
        notifications: action.notifications,
        unreadCount: action.notifications.filter(n => !n.read).length,
      };

    default:
      return state;
  }
};

// Context
const NotificationContext = createContext<{
  state: NotificationState;
  dispatch: React.Dispatch<NotificationAction>;
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  updatePreferences: (preferences: Partial<NotificationPreferences>) => void;
} | null>(null);

// Hook
export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
};

// Provider
export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(notificationReducer, initialState);

  // Load preferences and notifications on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load preferences from localStorage
        const savedPreferences = localStorage.getItem('notification_preferences');
        if (savedPreferences) {
          dispatch({
            type: 'UPDATE_PREFERENCES',
            preferences: JSON.parse(savedPreferences),
          });
        }

        // Load notifications from API or localStorage
        const notifications = await NotificationService.getNotifications();
        dispatch({ type: 'LOAD_NOTIFICATIONS', notifications });
      } catch (error) {
        console.error('Failed to load notification data:', error);
      }
    };

    loadData();
  }, []);

  // Auto-clear expired notifications
  useEffect(() => {
    const interval = setInterval(() => {
      dispatch({ type: 'CLEAR_EXPIRED' });
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, []);

  // Request notification permission
  useEffect(() => {
    if (state.preferences.enablePush && 'Notification' in window) {
      Notification.requestPermission();
    }
  }, [state.preferences.enablePush]);

  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp'>) => {
    const newNotification: Notification = {
      ...notification,
      id: `notification-${Date.now()}-${Math.random()}`,
      timestamp: new Date(),
    };

    // Check if category is enabled
    if (!state.preferences.categories[notification.category]) {
      return;
    }

    // Check quiet hours
    const now = new Date();
    const quietStart = new Date();
    const quietEnd = new Date();
    const [startHours, startMinutes] = state.preferences.schedule.quietHoursStart.split(':');
    const [endHours, endMinutes] = state.preferences.schedule.quietHoursEnd.split(':');
    
    quietStart.setHours(parseInt(startHours), parseInt(startMinutes), 0, 0);
    quietEnd.setHours(parseInt(endHours), parseInt(endMinutes), 0, 0);
    
    const isQuietHours = now >= quietStart || now <= quietEnd;
    
    if (isQuietHours && notification.priority !== 'urgent') {
      // Queue notification for later
      return;
    }

    dispatch({ type: 'ADD_NOTIFICATION', notification: newNotification });

    // Show toast notification
    if (state.preferences.enableInApp) {
      showToastNotification(newNotification);
    }

    // Show browser notification
    if (state.preferences.enablePush && 'Notification' in window && Notification.permission === 'granted') {
      showBrowserNotification(newNotification);
    }

    // Send to notification service for email/SMS if enabled
    if (state.preferences.enableEmail || state.preferences.enableSMS) {
      NotificationService.sendExternalNotification(newNotification, state.preferences);
    }
  };

  const markAsRead = (id: string) => {
    dispatch({ type: 'MARK_READ', id });
    NotificationService.markAsRead(id);
  };

  const markAllAsRead = () => {
    dispatch({ type: 'MARK_ALL_READ' });
    NotificationService.markAllAsRead();
  };

  const removeNotification = (id: string) => {
    dispatch({ type: 'REMOVE_NOTIFICATION', id });
    NotificationService.deleteNotification(id);
  };

  const updatePreferences = (preferences: Partial<NotificationPreferences>) => {
    const newPreferences = { ...state.preferences, ...preferences };
    dispatch({ type: 'UPDATE_PREFERENCES', preferences });
    localStorage.setItem('notification_preferences', JSON.stringify(newPreferences));
    NotificationService.updatePreferences(newPreferences);
  };

  return (
    <NotificationContext.Provider
      value={{
        state,
        dispatch,
        addNotification,
        markAsRead,
        markAllAsRead,
        removeNotification,
        updatePreferences,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

// Utility functions
const showToastNotification = (notification: Notification) => {
  toast[notification.type](notification.title, {
    description: notification.message,
    duration: notification.priority === 'urgent' ? 10000 : 5000,
    action: notification.actionUrl ? {
      label: notification.actionLabel || 'View',
      onClick: () => window.open(notification.actionUrl, '_blank'),
    } : undefined,
  });
};

const showBrowserNotification = (notification: Notification) => {
  const browserNotification = new Notification(notification.title, {
    body: notification.message,
    icon: '/favicon.ico',
    tag: notification.id,
    requireInteraction: notification.priority === 'urgent',
  });

  browserNotification.onclick = () => {
    if (notification.actionUrl) {
      window.open(notification.actionUrl, '_blank');
    }
    browserNotification.close();
  };

  // Auto-close after 10 seconds for non-urgent notifications
  if (notification.priority !== 'urgent') {
    setTimeout(() => browserNotification.close(), 10000);
  }
};

// Helper function for getting notification icons (exported for UI components)
export const getNotificationIcon = (type: Notification['type']) => {
  switch (type) {
    case 'success':
      return CheckCircle;
    case 'warning':
      return AlertTriangle;
    case 'error':
      return AlertTriangle;
    default:
      return Info;
  }
};

// Notification Service
export class NotificationService {
  static async getNotifications(): Promise<Notification[]> {
    try {
      const response = await fetch('/api/notifications', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || localStorage.getItem('admin_token')}`,
        },
      });

      const result = await response.json();
      return result.data || [];
    } catch (error) {
      console.warn('Notification service not available, using mock data:', error);
      
      // Return mock notifications for demo
      const now = new Date();
      return [
        {
          id: '1',
          type: 'info',
          title: 'New Event Created',
          message: 'Tech Conference 2024 has been created and is now open for registration',
          timestamp: new Date(now.getTime() - 30 * 60 * 1000), // 30 minutes ago
          read: false,
          category: 'event',
          priority: 'medium',
          actionUrl: '/admin/events/1',
          actionLabel: 'View Event'
        },
        {
          id: '2',
          type: 'success',
          title: '50 New Registrations',
          message: 'Your event has received 50 new registrations in the last hour',
          timestamp: new Date(now.getTime() - 60 * 60 * 1000), // 1 hour ago
          read: false,
          category: 'registration',
          priority: 'low'
        },
        {
          id: '3',
          type: 'warning',
          title: 'Event Capacity Warning',
          message: 'Tech Conference 2024 is at 90% capacity. Consider opening waitlist.',
          timestamp: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
          read: true,
          category: 'alert',
          priority: 'high',
          actionUrl: '/admin/events/1/settings',
          actionLabel: 'Manage Capacity'
        }
      ];
    }
  }

  static async markAsRead(id: string): Promise<void> {
    try {
      await fetch(`/api/notifications/${id}/read`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || localStorage.getItem('admin_token')}`,
        },
      });
    } catch (error) {
      console.warn('Failed to mark notification as read:', error);
    }
  }

  static async markAllAsRead(): Promise<void> {
    try {
      await fetch('/api/notifications/read-all', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || localStorage.getItem('admin_token')}`,
        },
      });
    } catch (error) {
      console.warn('Failed to mark all notifications as read:', error);
    }
  }

  static async deleteNotification(id: string): Promise<void> {
    try {
      await fetch(`/api/notifications/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || localStorage.getItem('admin_token')}`,
        },
      });
    } catch (error) {
      console.warn('Failed to delete notification:', error);
    }
  }

  static async updatePreferences(preferences: NotificationPreferences): Promise<void> {
    try {
      await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || localStorage.getItem('admin_token')}`,
        },
        body: JSON.stringify(preferences),
      });
    } catch (error) {
      console.warn('Failed to update notification preferences:', error);
    }
  }

  static async sendExternalNotification(
    notification: Notification,
    preferences: NotificationPreferences
  ): Promise<void> {
    try {
      await fetch('/api/notifications/external', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || localStorage.getItem('admin_token')}`,
        },
        body: JSON.stringify({
          notification,
          preferences: {
            enableEmail: preferences.enableEmail,
            enableSMS: preferences.enableSMS,
          },
        }),
      });
    } catch (error) {
      console.warn('Failed to send external notification:', error);
    }
  }

  // Predefined notification templates
  static createEventNotification(eventName: string, eventId: string): Omit<Notification, 'id' | 'timestamp'> {
    return {
      type: 'info',
      title: 'New Event Created',
      message: `${eventName} has been created and is now available for registration`,
      read: false,
      category: 'event',
      priority: 'medium',
      actionUrl: `/admin/events/${eventId}`,
      actionLabel: 'View Event'
    };
  }

  static createRegistrationNotification(count: number): Omit<Notification, 'id' | 'timestamp'> {
    return {
      type: 'success',
      title: `${count} New Registration${count > 1 ? 's' : ''}`,
      message: `Your events have received ${count} new registration${count > 1 ? 's' : ''} in the last hour`,
      read: false,
      category: 'registration',
      priority: count > 10 ? 'medium' : 'low'
    };
  }

  static createCapacityWarning(eventName: string, percentage: number, eventId: string): Omit<Notification, 'id' | 'timestamp'> {
    return {
      type: 'warning',
      title: 'Event Capacity Warning',
      message: `${eventName} is at ${percentage}% capacity. Consider managing waitlist or expanding capacity.`,
      read: false,
      category: 'alert',
      priority: percentage >= 95 ? 'high' : 'medium',
      actionUrl: `/admin/events/${eventId}/settings`,
      actionLabel: 'Manage Capacity'
    };
  }

  static createSystemAlert(message: string, priority: Notification['priority'] = 'medium'): Omit<Notification, 'id' | 'timestamp'> {
    return {
      type: priority === 'urgent' ? 'error' : 'warning',
      title: 'System Alert',
      message,
      read: false,
      category: 'system',
      priority
    };
  }
}

export default NotificationProvider;
