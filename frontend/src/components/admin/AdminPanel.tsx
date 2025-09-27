import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  Calendar, 
  TrendingUp, 
  Bell,
  Plus,
  Edit,
  Trash2,
  Download,
  Search,
  BarChart3,
  Activity,
  Mail,
  FileText,
  MapPin,
  Clock,
  DollarSign,
  LogOut
} from 'lucide-react';
import { Button, Card, CardContent, CardHeader } from '../ui';
import { cn } from '../../utils/cn';
import { AnalyticsDashboard } from '../analytics/AnalyticsDashboard';
import SystemMonitoringDashboard from '../monitoring/SystemMonitoringDashboard';
import FileUploadSystem from '../files/FileUploadSystem';
import { CSVExportService, CSVImportService } from '../../services/csvService';
import NotificationPanel, { NotificationBell } from '../notifications/NotificationPanel';
import { useAuth } from '../../contexts/AuthContext';

import { SeatHoldSystem } from '../events/SeatHoldSystem';

import EventFormModal from './EventFormModal';
import BulkEmailModal from './BulkEmailModal';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { adminApi } from '../../api/admin';
import { toast } from 'sonner';

interface Event {
  _id?: string;
  id?: string;
  title?: string;
  name: string;
  date: string;
  venue?: string;
  location: string;
  isActive?: boolean;
  attendeesCount?: number;
  registeredCount: number;
  capacity?: number;
  maxCapacity?: number;
  totalSeats: number;
  price?: number;
  category?: string;
}

interface Registration {
  _id?: string;
  id?: string;
  name: string;
  email: string;
  status: string;
  createdAt?: string;
  registeredAt: string;
  event?: {
    title?: string;
    name?: string;
  };
  eventName?: string;
  eventId: string;
}

interface AdminStats {
  totalEvents: number;
  totalRegistrations: number;
  totalRevenue: number;
  activeEvents: number;
  eventsGrowth?: number;
  registrationsGrowth?: number;
  revenueGrowth?: number;
}

interface AdminPanelProps {
  stats: AdminStats;
  events: Event[];
  registrations: Registration[];
  isLoading?: boolean;
}

type TabType = 'overview' | 'events' | 'registrations' | 'analytics' | 'monitoring' | 'files';

export const AdminPanel: React.FC<AdminPanelProps> = ({
  stats,
  events,
  registrations,
  isLoading = false
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'upcoming' | 'past'>('all');
  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false);
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [bulkEmailModalOpen, setBulkEmailModalOpen] = useState(false);

  const { logout } = useAuth();

  const queryClient = useQueryClient();

  // Mutations for CRUD operations
  const createEventMutation = useMutation({
    mutationFn: adminApi.admin.createEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-events'] });
      setEventModalOpen(false);
      setEditingEvent(null);
      toast.success('Event created successfully!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to create event');
    }
  });

  const updateEventMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Event> }) => 
      adminApi.admin.updateEvent(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-events'] });
      setEventModalOpen(false);
      setEditingEvent(null);
      toast.success('Event updated successfully!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update event');
    }
  });

  const deleteEventMutation = useMutation({
    mutationFn: adminApi.admin.deleteEvent,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-events'] });
      toast.success('Event deleted successfully!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete event');
    }
  });

  const approveRegistrationMutation = useMutation({
    mutationFn: adminApi.admin.approveRegistration,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-registrations'] });
      toast.success('Registration approved successfully!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to approve registration');
    }
  });

  const deleteRegistrationMutation = useMutation({
    mutationFn: adminApi.admin.deleteRegistration,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-registrations'] });
      toast.success('Registration deleted successfully!');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to delete registration');
    }
  });

  // Event handlers
  const handleCreateEvent = () => {
    setEditingEvent(null);
    setEventModalOpen(true);
  };

  const handleEditEvent = (event: Event) => {
    setEditingEvent(event);
    setEventModalOpen(true);
  };

  const handleDeleteEvent = (eventId: string) => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      deleteEventMutation.mutate(eventId);
    }
  };

  const handleEventSubmit = (eventData: Partial<Event>) => {
    if (editingEvent) {
      updateEventMutation.mutate({
        id: editingEvent._id || editingEvent.id || '',
        data: eventData
      });
    } else {
      createEventMutation.mutate(eventData);
    }
  };

  const handleCloseModal = () => {
    setEventModalOpen(false);
    setEditingEvent(null);
  };

  const handleApproveRegistration = (registrationId: string) => {
    approveRegistrationMutation.mutate(registrationId);
  };

  const handleDeleteRegistration = (registrationId: string) => {
    if (window.confirm('Are you sure you want to delete this registration?')) {
      deleteRegistrationMutation.mutate(registrationId);
    }
  };

  // Normalize event data for consistency
  const normalizedEvents = events.map(event => ({
    ...event,
    id: event._id || event.id || '',
    name: event.name || event.title || '',
    location: event.location || event.venue || '',
    totalSeats: event.totalSeats || event.capacity || event.maxCapacity || 100,
    registeredCount: event.registeredCount || event.attendeesCount || 0
  }));

  // Normalize registration data
  const normalizedRegistrations = registrations.map(reg => ({
    ...reg,
    id: reg._id || reg.id || '',
    registeredAt: reg.registeredAt || reg.createdAt || new Date().toISOString(),
    eventId: reg.eventId || '',
    status: reg.status || 'confirmed'
  }));

  const filteredEvents = normalizedEvents.filter(event => {
    const matchesSearch = event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.location.toLowerCase().includes(searchTerm.toLowerCase());
    
    const now = new Date();
    const eventDate = new Date(event.date);
    
    let matchesFilter = true;
    if (selectedFilter === 'upcoming') {
      matchesFilter = eventDate > now;
    } else if (selectedFilter === 'past') {
      matchesFilter = eventDate < now;
    }
    
    return matchesSearch && matchesFilter;
  });

  const getEventStatus = (event: Event) => {
    const now = new Date();
    const eventDate = new Date(event.date);
    const availableSeats = event.totalSeats - event.registeredCount;
    
    if (eventDate < now) return { label: 'Past', color: 'gray' };
    if (availableSeats <= 0) return { label: 'Full', color: 'red' };
    if (availableSeats <= 10) return { label: 'Almost Full', color: 'orange' };
    return { label: 'Available', color: 'green' };
  };

  const handleCSVExport = async () => {
    try {
      if (activeTab === 'events') {
        await CSVExportService.exportEvents(normalizedEvents);
        toast.success('Events exported successfully');
      } else {
        await CSVExportService.exportRegistrations(normalizedRegistrations);
        toast.success('Registrations exported successfully');
      }
    } catch (error) {
      toast.error('Export failed');
      console.error('Export error:', error);
    }
  };

  const handleCSVImport = async (files: any[]) => {
    try {
      const file = files[0];
      if (activeTab === 'events') {
        const result = await CSVImportService.importEvents(file.url);
        toast.success(`Imported ${result.imported} events`);
      } else {
        const result = await CSVImportService.importRegistrations(file.url);
        toast.success(`Imported ${result.imported} registrations`);
      }
    } catch (error) {
      toast.error('Import failed');
      console.error('Import error:', error);
    }
  };

  // Fetch participants for bulk email
  const { data: participantsData, isLoading: isLoadingParticipants, error: participantsError } = useQuery({
    queryKey: ['admin-participants'],
    queryFn: () => adminApi.admin.getAllParticipants({ limit: 100 }),
    staleTime: 1000 * 60 * 5, // 5 minutes
    onError: (error) => {
      console.error('Failed to load participants:', error);
    }
  });

  const participants = participantsData?.participants || [];

  // Debug logging
  useEffect(() => {
    console.log('Participants data:', { participantsData, participants: participants.length, error: participantsError });
  }, [participantsData, participants, participantsError]);

  const handleSendBulkEmail = async (emailData: {
    eventId?: string;
    recipients?: Array<{ email: string; name: string }>;
    subject: string;
    message: string;
    template: string;
    includeAllParticipants?: boolean;
  }) => {
    try {
      const result = await adminApi.admin.sendBulkEmail(emailData);
      toast.success(`Bulk email sent! ${result.sent} emails delivered successfully.`);
      
      if (result.failed > 0) {
        toast.warning(`${result.failed} emails failed to send.`);
      }
    } catch (error) {
      toast.error('Failed to send bulk emails');
      console.error('Email error:', error);
    }
  };

  const StatCard = ({ title, value, icon: Icon, trend, color }: {
    title: string;
    value: string | number;
    icon: any;
    trend?: number;
    color: string;
  }) => (
    <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-gray-400 text-sm font-medium">{title}</p>
            <p className="text-2xl font-bold text-white mt-1">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </p>
            {trend !== undefined && (
              <p className={cn(
                'text-xs mt-2 flex items-center gap-1',
                trend >= 0 ? 'text-green-400' : 'text-red-400'
              )}>
                <TrendingUp className="w-3 h-3" />
                {trend >= 0 ? '+' : ''}{trend}% from last month
              </p>
            )}
          </div>
          <div className={cn(
            'w-12 h-12 rounded-lg flex items-center justify-center',
            color === 'cyan' && 'bg-cyan-500/20',
            color === 'blue' && 'bg-blue-500/20',
            color === 'green' && 'bg-green-500/20',
            color === 'orange' && 'bg-orange-500/20'
          )}>
            <Icon className={cn(
              'w-6 h-6',
              color === 'cyan' && 'text-cyan-400',
              color === 'blue' && 'text-blue-400',
              color === 'green' && 'text-green-400',
              color === 'orange' && 'text-orange-400'
            )} />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  const tabs = [
    { id: 'overview', label: 'Overview', icon: TrendingUp },
    { id: 'events', label: 'Events', icon: Calendar },
    { id: 'registrations', label: 'Registrations', icon: Users },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'monitoring', label: 'Monitoring', icon: Activity },
    { id: 'files', label: 'Files', icon: FileText },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-cyan-500 mx-auto"></div>
          <p className="text-white mt-4">Loading Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
            <p className="text-gray-400 mt-1">Manage events and track registrations</p>
          </div>
          
          <div className="flex items-center gap-3">
            <NotificationBell onClick={() => setNotificationPanelOpen(true)} />
            
            <Button
              variant="secondary"
              onClick={handleCSVExport}
              className="flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Export</span>
            </Button>
            
            {activeTab === 'events' && (
              <Button
                variant="primary"
                onClick={handleCreateEvent}
                className="flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Create Event</span>
              </Button>
            )}
            
            {/* Logout Button */}
            <Button
              variant="danger"
              onClick={logout}
              className="flex items-center space-x-2"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
              <span>Logout</span>
            </Button>

            {activeTab === 'registrations' && (
              <Button
                variant="primary"
                onClick={() => setBulkEmailModalOpen(true)}
                className="flex items-center space-x-2"
              >
                <Mail className="w-4 h-4" />
                <span>Bulk Email</span>
              </Button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 bg-white/5 p-1 rounded-lg overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={cn(
                  'flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap',
                  activeTab === tab.id
                    ? 'bg-cyan-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-white/10'
                )}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <motion.div 
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="space-y-6"
        >
          {activeTab === 'overview' && (
            <>
              {/* Stats Overview */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard
                  title="Total Events"
                  value={stats.totalEvents}
                  icon={Calendar}
                  trend={stats.eventsGrowth}
                  color="cyan"
                />
                
                <StatCard
                  title="Total Registrations"
                  value={stats.totalRegistrations}
                  icon={Users}
                  trend={stats.registrationsGrowth}
                  color="blue"
                />
                
                <StatCard
                  title="Revenue"
                  value={`$${stats.totalRevenue.toLocaleString()}`}
                  icon={DollarSign}
                  trend={stats.revenueGrowth}
                  color="green"
                />
                
                <StatCard
                  title="Active Events"
                  value={stats.activeEvents}
                  icon={Bell}
                  color="orange"
                />
              </div>

              {/* Quick Actions */}
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <h3 className="text-lg font-semibold text-white">Quick Actions</h3>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Button 
                      variant="ghost" 
                      className="flex flex-col items-center space-y-2 h-auto py-4"
                      onClick={handleCreateEvent}
                    >
                      <Plus className="w-6 h-6 text-cyan-400" />
                      <span>Create Event</span>
                    </Button>
                    
                    <Button 
                      variant="ghost" 
                      className="flex flex-col items-center space-y-2 h-auto py-4"
                      onClick={handleCSVExport}
                    >
                      <Download className="w-6 h-6 text-green-400" />
                      <span>Export Data</span>
                    </Button>
                    
                    <Button 
                      variant="ghost" 
                      className="flex flex-col items-center space-y-2 h-auto py-4"
                      onClick={() => setBulkEmailModalOpen(true)}
                    >
                      <Mail className="w-6 h-6 text-blue-400" />
                      <span>Send Emails</span>
                    </Button>
                    
                    <Button 
                      variant="ghost" 
                      className="flex flex-col items-center space-y-2 h-auto py-4"
                      onClick={() => setActiveTab('analytics')}
                    >
                      <BarChart3 className="w-6 h-6 text-purple-400" />
                      <span>View Analytics</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <h3 className="text-lg font-semibold text-white">Recent Events</h3>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {normalizedEvents.slice(0, 5).map((event) => {
                      const status = getEventStatus(event);
                      return (
                        <div key={event.id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10 transition-colors">
                          <div className="flex items-center space-x-3">
                            <Calendar className="w-5 h-5 text-cyan-400" />
                            <div>
                              <p className="text-white font-medium">{event.name}</p>
                              <div className="flex items-center space-x-2 text-sm text-gray-400">
                                <MapPin className="w-3 h-3" />
                                <span>{event.location}</span>
                                <Clock className="w-3 h-3 ml-2" />
                                <span>{new Date(event.date).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-3">
                            <div className="text-right">
                              <p className="text-white font-medium">{event.registeredCount}/{event.totalSeats}</p>
                              <p className="text-xs text-gray-400">registrations</p>
                            </div>
                            <span className={cn(
                              'px-2 py-1 rounded-full text-xs font-medium',
                              status.color === 'green' && 'bg-green-500/20 text-green-400',
                              status.color === 'orange' && 'bg-orange-500/20 text-orange-400',
                              status.color === 'red' && 'bg-red-500/20 text-red-400',
                              status.color === 'gray' && 'bg-gray-500/20 text-gray-400'
                            )}>
                              {status.label}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {activeTab === 'analytics' && <AnalyticsDashboard />}
          {activeTab === 'monitoring' && <SystemMonitoringDashboard />}

          {activeTab === 'files' && (
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <h3 className="text-lg font-semibold text-white">File Management</h3>
              </CardHeader>
              <CardContent>
                <FileUploadSystem
                  acceptedTypes={['text/csv', 'image/*', '.pdf', '.doc', '.docx']}
                  maxFiles={10}
                  allowMultiple={true}
                  category="events"
                  onUpload={handleCSVImport}
                />
              </CardContent>
            </Card>
          )}

          {activeTab === 'events' && (
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <h2 className="text-xl font-semibold text-white">Events Management</h2>
                  
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search events..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                      />
                    </div>
                    
                    <select
                      value={selectedFilter}
                      onChange={(e) => setSelectedFilter(e.target.value as any)}
                      className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                    >
                      <option value="all">All Events</option>
                      <option value="upcoming">Upcoming</option>
                      <option value="past">Past Events</option>
                    </select>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left py-3 px-4 text-gray-300 font-medium">Event</th>
                        <th className="text-left py-3 px-4 text-gray-300 font-medium">Date</th>
                        <th className="text-left py-3 px-4 text-gray-300 font-medium">Location</th>
                        <th className="text-left py-3 px-4 text-gray-300 font-medium">Registrations</th>
                        <th className="text-left py-3 px-4 text-gray-300 font-medium">Status</th>
                        <th className="text-left py-3 px-4 text-gray-300 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredEvents.map((event) => {
                        const status = getEventStatus(event);
                        return (
                          <motion.tr
                            key={event.id}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="border-b border-white/5 hover:bg-white/5"
                          >
                            <td className="py-4 px-4">
                              <div>
                                <p className="text-white font-medium">{event.name}</p>
                                {event.price && (
                                  <p className="text-gray-400 text-sm">${event.price}</p>
                                )}
                              </div>
                            </td>
                            <td className="py-4 px-4 text-gray-300">
                              {new Date(event.date).toLocaleDateString()}
                            </td>
                            <td className="py-4 px-4 text-gray-300">
                              {event.location}
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-2">
                                <span className="text-white">
                                  {event.registeredCount}/{event.totalSeats}
                                </span>
                                <div className="w-16 h-2 bg-gray-700 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-cyan-500 transition-all duration-300"
                                    style={{
                                      width: `${Math.min((event.registeredCount / event.totalSeats) * 100, 100)}%`
                                    }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <span className={cn(
                                'px-2 py-1 rounded-full text-xs font-medium',
                                status.color === 'green' && 'bg-green-500/20 text-green-400',
                                status.color === 'orange' && 'bg-orange-500/20 text-orange-400',
                                status.color === 'red' && 'bg-red-500/20 text-red-400',
                                status.color === 'gray' && 'bg-gray-500/20 text-gray-400'
                              )}>
                                {status.label}
                              </span>
                            </td>
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleEditEvent(event)}
                                  className="text-cyan-400 hover:text-cyan-300"
                                  title="Edit Event"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeleteEvent(event.id)}
                                  className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                  title="Delete Event"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </motion.tr>
                        );
                      })}
                    </tbody>
                  </table>
                  
                  {filteredEvents.length === 0 && (
                    <div className="text-center py-12">
                      <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-400 text-lg mb-2">No events found</p>
                      <p className="text-gray-500 text-sm">
                        {searchTerm || selectedFilter !== 'all' 
                          ? 'Try adjusting your search or filter criteria'
                          : 'Create your first event to get started'
                        }
                      </p>
                    </div>
                  )}
                </div>

                {/* Seat Hold System for Event Management */}
                {filteredEvents.length > 0 && (
                  <div className="mt-8">
                    <h4 className="text-lg font-semibold text-white mb-4">Seat Management</h4>
                    <SeatHoldSystem 
                      eventId={filteredEvents[0].id}
                      availableSeats={filteredEvents[0].totalSeats - filteredEvents[0].registeredCount}
                      totalSeats={filteredEvents[0].totalSeats}
                      onSeatHold={(held: boolean) => {
                        if (held) {
                          toast.success('Seats held successfully');
                        } else {
                          toast.info('Seats released');
                        }
                      }}
                      onRegistrationComplete={() => {
                        toast.success('Registration completed successfully');
                      }}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === 'registrations' && (
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <h3 className="text-lg font-semibold text-white">Registrations Management</h3>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left py-3 px-4 text-gray-300 font-medium">Name</th>
                        <th className="text-left py-3 px-4 text-gray-300 font-medium">Email</th>
                        <th className="text-left py-3 px-4 text-gray-300 font-medium">Event</th>
                        <th className="text-left py-3 px-4 text-gray-300 font-medium">Status</th>
                        <th className="text-left py-3 px-4 text-gray-300 font-medium">Date</th>
                        <th className="text-left py-3 px-4 text-gray-300 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {normalizedRegistrations.map((registration) => (
                        <tr key={registration.id} className="border-b border-white/5 hover:bg-white/5">
                          <td className="py-4 px-4 text-white">{registration.name}</td>
                          <td className="py-4 px-4 text-gray-300">{registration.email}</td>
                          <td className="py-4 px-4 text-gray-300">
                            {normalizedEvents.find(e => e.id === registration.eventId)?.name || 
                             registration.event?.name || registration.event?.title || 'Unknown'}
                          </td>
                          <td className="py-4 px-4">
                            <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-medium">
                              {registration.status}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-gray-300">
                            {new Date(registration.registeredAt).toLocaleDateString()}
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              {registration.status !== 'approved' && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleApproveRegistration(registration.id)}
                                  className="text-green-400 hover:text-green-300"
                                  title="Approve Registration"
                                >
                                  ✓
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteRegistration(registration.id)}
                                className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                                title="Delete Registration"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {normalizedRegistrations.length === 0 && (
                    <div className="text-center py-12">
                      <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-400 text-lg mb-2">No registrations found</p>
                      <p className="text-gray-500 text-sm">Registrations will appear here as people sign up for events</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>

        {/* Notification Panel */}
        <NotificationPanel
          isOpen={notificationPanelOpen}
          onClose={() => setNotificationPanelOpen(false)}
          position="top-right"
        />

        {/* Event Form Modal */}
        <EventFormModal
          isOpen={eventModalOpen}
          onClose={handleCloseModal}
          event={editingEvent}
          onSubmit={handleEventSubmit}
        />

        {/* Bulk Email Modal */}
        <BulkEmailModal
          isOpen={bulkEmailModalOpen}
          onClose={() => setBulkEmailModalOpen(false)}
          events={events.map(e => ({ 
            _id: e._id || e.id || '', 
            title: e.title || e.name, 
            date: e.date, 
            venue: e.venue || e.location 
          }))}
          participants={participants}
          onSendEmail={handleSendBulkEmail}
        />
      </div>
    </div>
  );
};
