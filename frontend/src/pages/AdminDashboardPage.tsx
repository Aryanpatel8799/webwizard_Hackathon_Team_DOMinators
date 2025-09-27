import React from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import { AdminPanel } from '../components/admin/AdminPanel';
import { adminApi } from '../api/admin';


interface AnalyticsType {
  totalEvents?: number;
  totalRegistrations?: number;
  totalRevenue?: number;
  activeEvents?: number;
  eventsGrowth?: number;
  registrationsGrowth?: number;
  revenueGrowth?: number;
}

export const AdminDashboardPage: React.FC = () => {
  const { isAuthenticated, admin } = useAuth();


  // Redirect if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  // Fetch analytics data
  const { data: analytics, isLoading: analyticsLoading } = useQuery<AnalyticsType>({
    queryKey: ['admin-analytics'],
    queryFn: adminApi.admin.getAnalytics
  });

  // Fetch events
  const { 
    data: events = [], 
    isLoading: eventsLoading
  } = useQuery({
    queryKey: ['admin-events'],
    queryFn: adminApi.admin.getAllEvents
  });

  // Fetch registrations
  const { 
    data: registrations = [], 
    isLoading: registrationsLoading
  } = useQuery({
    queryKey: ['admin-registrations'],
    queryFn: adminApi.admin.getAllRegistrations,
    enabled: admin?.permissions?.registrations?.read !== false
  });

  const normalizedRegistrations = Array.isArray(registrations) ? registrations.map((reg: any) => ({
    ...reg,
    id: reg._id || reg.id || Math.random().toString(36),
    name: reg.name || reg.userName || reg.user?.name || 'Anonymous',
    email: reg.email || reg.userEmail || reg.user?.email || 'No email',
    eventId: reg.eventId || reg.event?._id || reg.event?.id || '',
    status: reg.status || 'pending',
    registeredAt: reg.createdAt || reg.registeredAt || new Date().toISOString()
  })) : [];

    // Safely convert to arrays with fallbacks
  const safeEvents = Array.isArray(events) ? events : [];
  const safeRegistrations = Array.isArray(registrations) ? registrations : [];

  const normalizedEvents = safeEvents.map((event: any) => ({
    ...event,
    id: event._id || event.id,
    title: event.name || event.title,
    registeredCount: event.attendeesCount || event.registeredCount || 0,
    totalSeats: event.capacity || event.maxCapacity || event.totalSeats || 0
  }));

  const stats = {
    totalEvents: analytics?.totalEvents || safeEvents.length,
    totalRegistrations: analytics?.totalRegistrations || safeRegistrations.length,
    totalRevenue: analytics?.totalRevenue || safeEvents.reduce((sum: number, event: any) =>
      sum + (event.price || 0) * (event.attendeesCount || event.registeredCount || 0), 0),
    activeEvents: analytics?.activeEvents || safeEvents.filter((event: any) => event.isActive).length,
    eventsGrowth: analytics?.eventsGrowth,
    registrationsGrowth: analytics?.registrationsGrowth,
    revenueGrowth: analytics?.revenueGrowth
  };



  const isLoading = analyticsLoading || eventsLoading || registrationsLoading;

  // Use our enhanced AdminPanel component
  return (
    <AdminPanel
      stats={stats}
      events={normalizedEvents}
      registrations={normalizedRegistrations}
      isLoading={isLoading}
    />
  );
};