import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Calendar, 
  Users, 
  DollarSign, 
  Activity,
  TrendingUp,
  TrendingDown,
  Eye,
  Edit,
  UserCheck,
  UserX,
  Plus,
  Filter,
  Search,
  Download,
  MoreVertical,
  MapPin,
  Clock,
  CheckCircle,
  XCircle,
  Loader2
} from 'lucide-react';
import { Navigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Card, CardContent, CardHeader, Input } from '../components/ui';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api/index';
import { toast } from 'sonner';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ComponentType<any>;
  color: string;
}

interface EventType {
  _id: string;
  id?: string;
  title?: string;
  name?: string;
  date: string;
  venue?: string;
  location?: string;
  isActive?: boolean;
  attendeesCount?: number;
  registeredCount?: number;
  capacity?: number;
  maxCapacity?: number;
  price?: number;
  category?: string;
}

interface RegistrationType {
  _id: string;
  id?: string;
  name: string;
  email: string;
  status?: string;
  createdAt?: string;
  event?: {
    title?: string;
    name?: string;
  };
  eventName?: string;
}

interface AnalyticsType {
  totalEvents?: number;
  totalRegistrations?: number;
  totalRevenue?: number;
  activeEvents?: number;
  eventsGrowth?: number;
  registrationsGrowth?: number;
  revenueGrowth?: number;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, change, icon: Icon, color }) => (
  <motion.div
    whileHover={{ y: -2, transition: { duration: 0.2 } }}
    className="relative"
  >
    <Card className="overflow-hidden bg-white/5 border-white/10 hover:border-white/20 transition-all duration-300">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-400">{title}</p>
            <p className="text-2xl font-bold text-white mt-1">{value}</p>
            {change !== undefined && (
              <p className={`text-sm flex items-center mt-1 ${
                change >= 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {change >= 0 ? (
                  <TrendingUp className="w-4 h-4 mr-1" />
                ) : (
                  <TrendingDown className="w-4 h-4 mr-1" />
                )}
                {Math.abs(change)}% vs last month
              </p>
            )}
          </div>
          <div className={`p-3 rounded-lg ${color}`}>
            <Icon className="w-6 h-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

export const AdminDashboardPage: React.FC = () => {
  const { admin, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'overview' | 'events' | 'registrations'>('overview');
  const [searchTerm, setSearchTerm] = useState('');

  // Redirect if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  // Fetch analytics data
  const { data: analytics, isLoading: analyticsLoading } = useQuery<AnalyticsType>({
    queryKey: ['admin-analytics'],
    queryFn: api.admin.getAnalytics
  });

  // Fetch events
  const { 
    data: events = [], 
    isLoading: eventsLoading
  } = useQuery<EventType[]>({
    queryKey: ['admin-events'],
    queryFn: api.admin.getAllEvents
  });

  // Fetch registrations
  const { 
    data: registrations = [], 
    isLoading: registrationsLoading
  } = useQuery<RegistrationType[]>({
    queryKey: ['admin-registrations'],
    queryFn: api.admin.getAllRegistrations,
    enabled: admin?.permissions?.registrations?.read !== false
  });

  // Mutations
  const approveRegistrationMutation = useMutation({
    mutationFn: (id: string) => api.admin.approveRegistration(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-registrations'] });
      toast.success('Registration approved successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to approve registration');
    }
  });

  const deleteRegistrationMutation = useMutation({
    mutationFn: (id: string) => api.admin.deleteRegistration(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-registrations'] });
      toast.success('Registration cancelled successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to cancel registration');
    }
  });

  const filteredEvents = events.filter((event: EventType) => 
    event.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    event.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredRegistrations = registrations.filter((reg: RegistrationType) => 
    reg.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    reg.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getStatusBadge = (status: string, type: 'event' | 'registration' = 'event') => {
    const statusConfig = {
      event: {
        published: { color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: CheckCircle },
        draft: { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: Clock },
        cancelled: { color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: XCircle }
      },
      registration: {
        confirmed: { color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: CheckCircle },
        pending: { color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: Clock },
        cancelled: { color: 'bg-red-500/20 text-red-400 border-red-500/30', icon: XCircle },
        waitlisted: { color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: Clock }
      }
    };

    const config = statusConfig[type][status as keyof typeof statusConfig[typeof type]];
    if (!config) return null;

    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-medium border ${config.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const handleExportData = () => {
    // Simple CSV export
    const csvContent = [
      ['Event Name', 'Date', 'Location', 'Registrations', 'Status'],
      ...events.map((event: EventType) => [
        event.title || event.name || '',
        new Date(event.date).toLocaleDateString(),
        event.venue || event.location || '',
        (event.attendeesCount || event.registeredCount || 0).toString(),
        event.isActive ? 'Active' : 'Inactive'
      ])
    ];

    const csvString = csvContent.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvString], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `events-export-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success('Data exported successfully!');
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
          >
            <div>
              <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
              <p className="text-gray-400 mt-1">
                Welcome back, {admin?.name}! Here's what's happening with your events.
              </p>
            </div>
            <div className="flex items-center space-x-3">
              <Button variant="secondary" size="sm" onClick={handleExportData}>
                <Download className="w-4 h-4 mr-2" />
                Export Data
              </Button>
              <Button variant="primary" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                New Event
              </Button>
            </div>
          </motion.div>
        </div>

        {/* Stats Cards */}
        {analyticsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {Array(4).fill(0).map((_, i) => (
              <Card key={i} className="bg-white/5 border-white/10">
                <CardContent className="p-6">
                  <div className="animate-pulse">
                    <div className="h-4 bg-white/10 rounded mb-4"></div>
                    <div className="h-8 bg-white/10 rounded mb-2"></div>
                    <div className="h-4 bg-white/10 rounded w-2/3"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard
              title="Total Events"
              value={analytics?.totalEvents || events.length}
              change={analytics?.eventsGrowth || 12}
              icon={Calendar}
              color="bg-gradient-to-br from-blue-500 to-blue-600"
            />
            <StatCard
              title="Total Registrations"
              value={analytics?.totalRegistrations || registrations.length}
              change={analytics?.registrationsGrowth || 8}
              icon={Users}
              color="bg-gradient-to-br from-green-500 to-green-600"
            />
            <StatCard
              title="Total Revenue"
              value={`$${(analytics?.totalRevenue || events.reduce((sum: number, event: EventType) => sum + (event.price || 0) * (event.attendeesCount || 0), 0)).toLocaleString()}`}
              change={analytics?.revenueGrowth || 15}
              icon={DollarSign}
              color="bg-gradient-to-br from-purple-500 to-purple-600"
            />
            <StatCard
              title="Active Events"
              value={analytics?.activeEvents || events.filter((event: EventType) => event.isActive).length}
              icon={Activity}
              color="bg-gradient-to-br from-cyan-500 to-cyan-600"
            />
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="mb-6">
          <nav className="flex space-x-8">
            {[
              { key: 'overview', label: 'Overview', icon: Activity },
              { key: 'events', label: 'Events', icon: Calendar },
              { key: 'registrations', label: 'Registrations', icon: Users }
            ].map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as typeof activeTab)}
                className={`flex items-center space-x-2 pb-3 border-b-2 transition-colors ${
                  activeTab === key
                    ? 'border-cyan-500 text-cyan-400'
                    : 'border-transparent text-gray-400 hover:text-white'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content based on active tab */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Events */}
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <h3 className="text-lg font-semibold text-white">Recent Events</h3>
              </CardHeader>
              <CardContent>
                {eventsLoading ? (
                  <div className="space-y-3">
                    {Array(3).fill(0).map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-4 bg-white/10 rounded mb-2"></div>
                        <div className="h-3 bg-white/10 rounded w-2/3"></div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {events.slice(0, 5).map((event: EventType) => (
                      <div key={event._id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                        <div>
                          <p className="font-medium text-white">{event.title || event.name}</p>
                          <p className="text-sm text-gray-400">
                            {formatDate(event.date)} • {event.attendeesCount || event.registeredCount || 0} registered
                          </p>
                        </div>
                        {getStatusBadge(event.isActive ? 'published' : 'draft')}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Registrations */}
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <h3 className="text-lg font-semibold text-white">Recent Registrations</h3>
              </CardHeader>
              <CardContent>
                {registrationsLoading ? (
                  <div className="space-y-3">
                    {Array(3).fill(0).map((_, i) => (
                      <div key={i} className="animate-pulse">
                        <div className="h-4 bg-white/10 rounded mb-2"></div>
                        <div className="h-3 bg-white/10 rounded w-2/3"></div>
                      </div>
                    ))}
                  </div>
                ) : registrations.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">No registrations found</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {registrations.slice(0, 5).map((registration: RegistrationType) => (
                      <div key={registration._id} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                        <div>
                          <p className="font-medium text-white">{registration.name}</p>
                          <p className="text-sm text-gray-400">{registration.email}</p>
                        </div>
                        {getStatusBadge(registration.status || 'pending', 'registration')}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'events' && (
          <div>
            {/* Search and filters */}
            <div className="mb-6 flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  placeholder="Search events..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="secondary" size="sm">
                <Filter className="w-4 h-4 mr-2" />
                Filter
              </Button>
            </div>

            {/* Events Table */}
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left p-4 text-gray-300 font-medium">Event</th>
                        <th className="text-left p-4 text-gray-300 font-medium">Date</th>
                        <th className="text-left p-4 text-gray-300 font-medium">Registrations</th>
                        <th className="text-left p-4 text-gray-300 font-medium">Status</th>
                        <th className="text-left p-4 text-gray-300 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {eventsLoading ? (
                        Array(5).fill(0).map((_, i) => (
                          <tr key={i} className="border-b border-white/5">
                            <td className="p-4">
                              <div className="animate-pulse">
                                <div className="h-4 bg-white/10 rounded mb-2"></div>
                                <div className="h-3 bg-white/10 rounded w-2/3"></div>
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="animate-pulse h-4 bg-white/10 rounded w-20"></div>
                            </td>
                            <td className="p-4">
                              <div className="animate-pulse h-4 bg-white/10 rounded w-16"></div>
                            </td>
                            <td className="p-4">
                              <div className="animate-pulse h-6 bg-white/10 rounded w-20"></div>
                            </td>
                            <td className="p-4">
                              <div className="animate-pulse h-8 bg-white/10 rounded w-8"></div>
                            </td>
                          </tr>
                        ))
                      ) : filteredEvents.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center">
                            <Calendar className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                            <p className="text-gray-400">
                              {searchTerm ? 'No events match your search' : 'No events found'}
                            </p>
                          </td>
                        </tr>
                      ) : (
                        filteredEvents.map((event: EventType) => (
                          <tr key={event._id} className="border-b border-white/5 hover:bg-white/2">
                            <td className="p-4">
                              <div>
                                <p className="font-medium text-white">{event.title || event.name}</p>
                                <p className="text-sm text-gray-400 flex items-center mt-1">
                                  <MapPin className="w-3 h-3 mr-1" />
                                  {event.venue || event.location}
                                </p>
                              </div>
                            </td>
                            <td className="p-4 text-gray-300">
                              {formatDate(event.date)}
                            </td>
                            <td className="p-4">
                              <span className="text-white font-medium">
                                {event.attendeesCount || event.registeredCount || 0}
                              </span>
                              <span className="text-gray-400">
                                /{event.capacity || event.maxCapacity}
                              </span>
                            </td>
                            <td className="p-4">
                              {getStatusBadge(event.isActive ? 'published' : 'draft')}
                            </td>
                            <td className="p-4">
                              <div className="flex items-center space-x-2">
                                <Button variant="ghost" size="sm">
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="sm">
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'registrations' && (
          <div>
            {/* Search */}
            <div className="mb-6 flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  placeholder="Search registrations..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="secondary" size="sm">
                <Filter className="w-4 h-4 mr-2" />
                Filter
              </Button>
            </div>

            {/* Registrations Table */}
            <Card className="bg-white/5 border-white/10">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left p-4 text-gray-300 font-medium">Attendee</th>
                        <th className="text-left p-4 text-gray-300 font-medium">Event</th>
                        <th className="text-left p-4 text-gray-300 font-medium">Date</th>
                        <th className="text-left p-4 text-gray-300 font-medium">Status</th>
                        <th className="text-left p-4 text-gray-300 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {registrationsLoading ? (
                        Array(5).fill(0).map((_, i) => (
                          <tr key={i} className="border-b border-white/5">
                            {Array(5).fill(0).map((_, j) => (
                              <td key={j} className="p-4">
                                <div className="animate-pulse h-4 bg-white/10 rounded"></div>
                              </td>
                            ))}
                          </tr>
                        ))
                      ) : filteredRegistrations.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="p-8 text-center">
                            <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                            <p className="text-gray-400">
                              {searchTerm ? 'No registrations match your search' : 'No registrations found'}
                            </p>
                          </td>
                        </tr>
                      ) : (
                        filteredRegistrations.map((registration: RegistrationType) => (
                          <tr key={registration._id} className="border-b border-white/5 hover:bg-white/2">
                            <td className="p-4">
                              <div>
                                <p className="font-medium text-white">{registration.name}</p>
                                <p className="text-sm text-gray-400">{registration.email}</p>
                              </div>
                            </td>
                            <td className="p-4 text-gray-300">
                              {registration.event?.title || registration.event?.name || registration.eventName || 'Unknown Event'}
                            </td>
                            <td className="p-4 text-gray-300">
                              {registration.createdAt ? formatDate(registration.createdAt) : 'N/A'}
                            </td>
                            <td className="p-4">
                              {getStatusBadge(registration.status || 'pending', 'registration')}
                            </td>
                            <td className="p-4">
                              <div className="flex items-center space-x-2">
                                {registration.status === 'pending' && (
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => approveRegistrationMutation.mutate(registration._id)}
                                    disabled={approveRegistrationMutation.isPending}
                                  >
                                    {approveRegistrationMutation.isPending ? (
                                      <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                      <UserCheck className="w-4 h-4 text-green-400" />
                                    )}
                                  </Button>
                                )}
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => deleteRegistrationMutation.mutate(registration._id)}
                                  disabled={deleteRegistrationMutation.isPending}
                                >
                                  {deleteRegistrationMutation.isPending ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <UserX className="w-4 h-4 text-red-400" />
                                  )}
                                </Button>
                                <Button variant="ghost" size="sm">
                                  <MoreVertical className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};
