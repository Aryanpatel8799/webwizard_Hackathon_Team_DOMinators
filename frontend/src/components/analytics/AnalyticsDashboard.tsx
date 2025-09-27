import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Calendar,
  DollarSign,
  Activity,
  Download,
  Filter,
  RefreshCw,
  BarChart3,
  PieChart as PieChartIcon,
  Target
} from 'lucide-react';
import { Button, Card, CardContent, CardHeader } from '../ui';
import { CSVExportService } from '../../services/csvService';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/index';

interface AnalyticsDashboardProps {
  dateRange?: 'week' | 'month' | 'quarter' | 'year';
  onDateRangeChange?: (range: 'week' | 'month' | 'quarter' | 'year') => void;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ComponentType<any>;
  color: string;
  subtitle?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ title, value, change, icon: Icon, color, subtitle }) => (
  <motion.div
    whileHover={{ y: -2, scale: 1.02 }}
    className="relative overflow-hidden"
  >
    <Card className="bg-white/5 border-white/10 hover:border-white/20 transition-all duration-300">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-400 mb-1">{title}</p>
            <p className="text-2xl font-bold text-white mb-1">{value}</p>
            {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
            {change !== undefined && (
              <div className={`flex items-center mt-2 text-sm ${
                change >= 0 ? 'text-green-400' : 'text-red-400'
              }`}>
                {change >= 0 ? (
                  <TrendingUp className="w-4 h-4 mr-1" />
                ) : (
                  <TrendingDown className="w-4 h-4 mr-1" />
                )}
                {Math.abs(change)}% vs last period
              </div>
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

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  dateRange = 'month',
  onDateRangeChange
}) => {
  const [activeChart, setActiveChart] = useState<'bar' | 'line' | 'area'>('bar');
  const [selectedMetric, setSelectedMetric] = useState<'events' | 'registrations' | 'revenue'>('events');

  // Fetch analytics data
  const { data: analytics, isLoading, refetch } = useQuery({
    queryKey: ['analytics', dateRange],
    queryFn: () => api.admin.getAnalytics()
  });

  const { data: events = [] } = useQuery({
    queryKey: ['admin-events'],
    queryFn: api.admin.getAllEvents
  });

  const { data: registrations = [] } = useQuery({
    queryKey: ['admin-registrations'],
    queryFn: api.admin.getAllRegistrations
  });

  // Generate chart data
  const chartData = useMemo(() => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    
    // Generate last 6 months of data
    const data = [];
    for (let i = 5; i >= 0; i--) {
      const monthIndex = (currentMonth - i + 12) % 12;
      const eventCount = Math.floor(Math.random() * 20) + 5;
      const regCount = Math.floor(Math.random() * 300) + 100;
      
      data.push({
        month: months[monthIndex],
        events: eventCount,
        registrations: regCount,
        revenue: regCount * (Math.floor(Math.random() * 50) + 25),
        activeUsers: Math.floor(regCount * 0.8)
      });
    }
    return data;
  }, [dateRange]);

  // Event category distribution
  const categoryData = useMemo(() => {
    const categories = ['Conference', 'Workshop', 'Seminar', 'Networking', 'Training'];
    const colors = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
    
    return categories.map((category, index) => ({
      name: category,
      value: Math.floor(Math.random() * 30) + 10,
      color: colors[index]
    }));
  }, []);

  // Registration status data
  const statusData = useMemo(() => [
    { name: 'Confirmed', value: 78, color: '#10b981' },
    { name: 'Pending', value: 15, color: '#f59e0b' },
    { name: 'Cancelled', value: 7, color: '#ef4444' }
  ], []);

  const handleExportAnalytics = () => {
    CSVExportService.exportAnalytics(analytics || {
      totalEvents: events.length,
      totalRegistrations: registrations.length,
      totalRevenue: 0,
      activeEvents: events.filter((event: any) => event.isActive).length
    });
  };

  const renderChart = () => {
    const commonProps = {
      data: chartData,
      margin: { top: 5, right: 30, left: 20, bottom: 5 }
    };

    switch (activeChart) {
      case 'line':
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="month" stroke="#9CA3AF" />
            <YAxis stroke="#9CA3AF" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#1F2937', 
                border: '1px solid #374151',
                borderRadius: '8px'
              }} 
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey={selectedMetric} 
              stroke="#0ea5e9" 
              strokeWidth={2}
              dot={{ fill: '#0ea5e9', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: '#0ea5e9', strokeWidth: 2 }}
            />
          </LineChart>
        );
      
      case 'area':
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="month" stroke="#9CA3AF" />
            <YAxis stroke="#9CA3AF" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#1F2937', 
                border: '1px solid #374151',
                borderRadius: '8px'
              }} 
            />
            <Area 
              type="monotone" 
              dataKey={selectedMetric} 
              stroke="#0ea5e9" 
              fill="rgba(14, 165, 233, 0.2)"
              strokeWidth={2}
            />
          </AreaChart>
        );
      
      default:
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="month" stroke="#9CA3AF" />
            <YAxis stroke="#9CA3AF" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#1F2937', 
                border: '1px solid #374151',
                borderRadius: '8px'
              }} 
            />
            <Bar 
              dataKey={selectedMetric} 
              fill="#0ea5e9"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        );
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Loading skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Analytics Dashboard</h2>
          <p className="text-gray-400">
            Comprehensive insights into your event performance
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            className="flex items-center"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          
          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportAnalytics}
          >
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="flex items-center space-x-2">
        <Filter className="w-4 h-4 text-gray-400" />
        <div className="flex space-x-1">
          {(['week', 'month', 'quarter', 'year'] as const).map((range) => (
            <Button
              key={range}
              variant={dateRange === range ? 'primary' : 'ghost'}
              size="sm"
              onClick={() => onDateRangeChange?.(range)}
            >
              {range.charAt(0).toUpperCase() + range.slice(1)}
            </Button>
          ))}
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Total Events"
          value={analytics?.totalEvents || events.length}
          change={analytics?.eventsGrowth || 12}
          icon={Calendar}
          color="bg-gradient-to-br from-blue-500 to-blue-600"
          subtitle={`${events.filter((e: any) => e.isActive).length} active`}
        />
        
        <MetricCard
          title="Total Registrations"
          value={(analytics?.totalRegistrations || registrations.length).toLocaleString()}
          change={analytics?.registrationsGrowth || 25}
          icon={Users}
          color="bg-gradient-to-br from-green-500 to-green-600"
          subtitle={`${Math.round(((analytics?.totalRegistrations || registrations.length) / (analytics?.totalEvents || events.length || 1)) || 0)} avg per event`}
        />
        
        <MetricCard
          title="Revenue"
          value={`$${(analytics?.totalRevenue || 0).toLocaleString()}`}
          change={analytics?.revenueGrowth || 18}
          icon={DollarSign}
          color="bg-gradient-to-br from-purple-500 to-purple-600"
          subtitle={`$${Math.round((analytics?.totalRevenue || 0) / (analytics?.totalEvents || events.length || 1))} per event`}
        />
        
        <MetricCard
          title="Conversion Rate"
          value="78.5%"
          change={5.2}
          icon={Target}
          color="bg-gradient-to-br from-cyan-500 to-cyan-600"
          subtitle="Registration to attendance"
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <Card className="lg:col-span-2 bg-white/5 border-white/10">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <h3 className="text-lg font-semibold text-white capitalize">
                {selectedMetric} Trend
              </h3>
              <p className="text-sm text-gray-400">
                Performance over the last 6 months
              </p>
            </div>
            
            <div className="flex items-center space-x-2">
              {/* Metric Selector */}
              <select
                value={selectedMetric}
                onChange={(e) => setSelectedMetric(e.target.value as any)}
                className="bg-gray-800 border border-gray-700 rounded-md px-3 py-1 text-white text-sm"
              >
                <option value="events">Events</option>
                <option value="registrations">Registrations</option>
                <option value="revenue">Revenue</option>
              </select>
              
              {/* Chart Type Selector */}
              <div className="flex space-x-1">
                {(['bar', 'line', 'area'] as const).map((type) => (
                  <Button
                    key={type}
                    variant={activeChart === type ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => setActiveChart(type)}
                  >
                    <BarChart3 className="w-4 h-4" />
                  </Button>
                ))}
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="p-6">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                {renderChart()}
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Category Distribution */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <h3 className="text-lg font-semibold text-white">Event Categories</h3>
            <p className="text-sm text-gray-400">Distribution by type</p>
          </CardHeader>
          <CardContent className="p-6">
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    stroke="none"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px'
                    }} 
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            {/* Legend */}
            <div className="space-y-2 mt-4">
              {categoryData.map((entry, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: entry.color }}
                    />
                    <span className="text-gray-300">{entry.name}</span>
                  </div>
                  <span className="text-white font-medium">{entry.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Registration Status & Additional Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Registration Status */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <h3 className="text-lg font-semibold text-white">Registration Status</h3>
            <p className="text-sm text-gray-400">Current registration breakdown</p>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {statusData.map((status, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div 
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: status.color }}
                    />
                    <span className="text-gray-300">{status.name}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-white font-medium">{status.value}%</span>
                    <div className="w-20 h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full transition-all duration-500"
                        style={{ 
                          width: `${status.value}%`,
                          backgroundColor: status.color
                        }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Performance Metrics */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <h3 className="text-lg font-semibold text-white">Performance Metrics</h3>
            <p className="text-sm text-gray-400">Key performance indicators</p>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-300">Average Event Capacity</span>
                  <span className="text-white font-medium">85%</span>
                </div>
                <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: '85%' }} />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-300">Customer Satisfaction</span>
                  <span className="text-white font-medium">4.7/5</span>
                </div>
                <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 transition-all duration-500" style={{ width: '94%' }} />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-300">Repeat Attendees</span>
                  <span className="text-white font-medium">62%</span>
                </div>
                <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-500 transition-all duration-500" style={{ width: '62%' }} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
