import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { socketService, SocketNotification } from '../services/socketService';
import { useAuth } from './AuthContext';

interface RealTimeContextType {
  isConnected: boolean;
  joinEventRoom: (eventId: string) => void;
  leaveEventRoom: (eventId: string) => void;
  joinAdminRoom: () => void;
  leaveAdminRoom: () => void;
  sendNotification: (notification: SocketNotification) => void;
  onEventUpdate: (callback: (data: any) => void) => void;
  onRegistrationUpdate: (callback: (data: any) => void) => void;
  onSeatsUpdate: (callback: (data: any) => void) => void;
}

const RealTimeContext = createContext<RealTimeContextType | undefined>(undefined);

interface RealTimeProviderProps {
  children: React.ReactNode;
}

export const RealTimeProvider: React.FC<RealTimeProviderProps> = ({ children }) => {
  const { isAuthenticated, admin } = useAuth();
  const [isConnected, setIsConnected] = useState(false);

  // Connect socket when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const token = localStorage.getItem('token') || localStorage.getItem('admin_token');
      socketService.connect(token || undefined);
      
      // Listen for connection status
      const checkConnection = () => {
        setIsConnected(socketService.isConnected());
      };
      
      const interval = setInterval(checkConnection, 1000);
      checkConnection();
      
      return () => clearInterval(interval);
    } else {
      socketService.disconnect();
      setIsConnected(false);
    }
  }, [isAuthenticated]);

  // Join admin room for admin users
  useEffect(() => {
    if (isAuthenticated && admin && isConnected) {
      socketService.joinAdminRoom();
      
      return () => {
        socketService.leaveAdminRoom();
      };
    }
  }, [isAuthenticated, admin, isConnected]);

  // Event handlers for real-time updates
  const joinEventRoom = useCallback((eventId: string) => {
    socketService.joinEventRoom(eventId);
  }, []);

  const leaveEventRoom = useCallback((eventId: string) => {
    socketService.leaveEventRoom(eventId);
  }, []);

  const joinAdminRoom = useCallback(() => {
    socketService.joinAdminRoom();
  }, []);

  const leaveAdminRoom = useCallback(() => {
    socketService.leaveAdminRoom();
  }, []);

  const sendNotification = useCallback((notification: SocketNotification) => {
    socketService.emit('notification', notification);
  }, []);

  const onEventUpdate = useCallback((callback: (data: any) => void) => {
    const handleEvent = (event: Event) => {
      const customEvent = event as CustomEvent;
      callback(customEvent.detail);
    };

    window.addEventListener('refresh:events', handleEvent as EventListener);
    return () => window.removeEventListener('refresh:events', handleEvent as EventListener);
  }, []);

  const onRegistrationUpdate = useCallback((callback: (data: any) => void) => {
    const handleEvent = (event: Event) => {
      const customEvent = event as CustomEvent;
      callback(customEvent.detail);
    };

    window.addEventListener('refresh:registrations', handleEvent as EventListener);
    return () => window.removeEventListener('refresh:registrations', handleEvent as EventListener);
  }, []);

  const onSeatsUpdate = useCallback((callback: (data: any) => void) => {
    const handleEvent = (event: Event) => {
      const customEvent = event as CustomEvent;
      callback(customEvent.detail);
    };

    window.addEventListener('refresh:seats', handleEvent as EventListener);
    return () => window.removeEventListener('refresh:seats', handleEvent as EventListener);
  }, []);

  const contextValue: RealTimeContextType = {
    isConnected,
    joinEventRoom,
    leaveEventRoom,
    joinAdminRoom,
    leaveAdminRoom,
    sendNotification,
    onEventUpdate,
    onRegistrationUpdate,
    onSeatsUpdate
  };

  return (
    <RealTimeContext.Provider value={contextValue}>
      {children}
    </RealTimeContext.Provider>
  );
};

export const useRealTime = (): RealTimeContextType => {
  const context = useContext(RealTimeContext);
  if (context === undefined) {
    throw new Error('useRealTime must be used within a RealTimeProvider');
  }
  return context;
};
