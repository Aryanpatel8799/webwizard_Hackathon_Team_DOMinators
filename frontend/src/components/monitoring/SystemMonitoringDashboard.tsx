import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Activity, 
  Server, 
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Zap,
  HardDrive,
  Cpu,
  Network
} from 'lucide-react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Button, Card, CardContent } from '../ui';
import { useNotifications, NotificationService } from '../../contexts/NotificationContext';

interface SystemMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  status: 'healthy' | 'warning' | 'critical';
  trend: 'up' | 'down' | 'stable';
  history: { timestamp: Date; value: number }[];
}

interface ServiceStatus {
  name: string;
  status: 'online' | 'offline' | 'maintenance';
  responseTime: number;
  uptime: number;
  lastCheck: Date;
  endpoint?: string;
}

const SystemMonitoringDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<SystemMetric[]>([]);
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const { addNotification } = useNotifications();

  // Fetch system metrics
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setIsLoading(true);
        
        // In a real implementation, this would fetch from your monitoring API
        const mockMetrics: SystemMetric[] = [
          {
            id: 'cpu',
            name: 'CPU Usage',
            value: 45 + Math.random() * 20,
            unit: '%',
            status: 'healthy',
            trend: 'stable',
            history: generateHistory(24, 45, 20)
          },
          {
            id: 'memory',
            name: 'Memory Usage',
            value: 62 + Math.random() * 15,
            unit: '%',
            status: 'warning',
            trend: 'up',
            history: generateHistory(24, 62, 15)
          },
          {
            id: 'disk',
            name: 'Disk Usage',
            value: 78 + Math.random() * 10,
            unit: '%',
            status: 'warning',
            trend: 'up',
            history: generateHistory(24, 78, 10)
          },
          {
            id: 'network',
            name: 'Network I/O',
            value: 125 + Math.random() * 50,
            unit: 'MB/s',
            status: 'healthy',
            trend: 'stable',
            history: generateHistory(24, 125, 50)
          },
          {
            id: 'requests',
            name: 'Requests/min',
            value: 1240 + Math.random() * 300,
            unit: 'req/min',
            status: 'healthy',
            trend: 'up',
            history: generateHistory(24, 1240, 300)
          },
          {
            id: 'response_time',
            name: 'Avg Response Time',
            value: 120 + Math.random() * 30,
            unit: 'ms',
            status: 'healthy',
            trend: 'down',
            history: generateHistory(24, 120, 30)
          }
        ];

        const mockServices: ServiceStatus[] = [
          {
            name: 'API Server',
            status: 'online',
            responseTime: 120,
            uptime: 99.9,
            lastCheck: new Date(),
            endpoint: '/api/health'
          },
          {
            name: 'Database',
            status: 'online',
            responseTime: 45,
            uptime: 99.95,
            lastCheck: new Date(),
            endpoint: '/db/health'
          },
          {
            name: 'Redis Cache',
            status: 'online',
            responseTime: 12,
            uptime: 99.8,
            lastCheck: new Date(),
            endpoint: '/cache/health'
          },
          {
            name: 'Email Service',
            status: Math.random() > 0.8 ? 'maintenance' : 'online',
            responseTime: 850,
            uptime: 98.5,
            lastCheck: new Date(),
            endpoint: '/email/health'
          },
          {
            name: 'Socket.IO',
            status: 'online',
            responseTime: 25,
            uptime: 99.7,
            lastCheck: new Date(),
            endpoint: '/socket/health'
          }
        ];

        // Check for critical metrics and send notifications
        mockMetrics.forEach(metric => {
          if (metric.status === 'critical') {
            addNotification(
              NotificationService.createSystemAlert(
                `${metric.name} is at ${metric.value}${metric.unit} - Critical level!`,
                'urgent'
              )
            );
          } else if (metric.status === 'warning' && metric.value > 80) {
            addNotification(
              NotificationService.createSystemAlert(
                `${metric.name} is at ${metric.value}${metric.unit} - High usage detected`,
                'high'
              )
            );
          }
        });

        setMetrics(mockMetrics);
        setServices(mockServices);
        setLastUpdate(new Date());
      } catch (error) {
        console.error('Failed to fetch system metrics:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchMetrics();

    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, [addNotification]);

  const generateHistory = (hours: number, base: number, variance: number) => {
    const history = [];
    const now = new Date();
    
    for (let i = hours; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
      const value = base + (Math.random() - 0.5) * variance;
      history.push({ timestamp, value: Math.max(0, value) });
    }
    
    return history;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'online':
        return 'text-green-400';
      case 'warning':
      case 'maintenance':
        return 'text-yellow-400';
      case 'critical':
      case 'offline':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'online':
        return CheckCircle;
      case 'warning':
      case 'maintenance':
        return AlertTriangle;
      case 'critical':
      case 'offline':
        return AlertTriangle;
      default:
        return Clock;
    }
  };

  const getMetricIcon = (id: string) => {
    switch (id) {
      case 'cpu':
        return Cpu;
      case 'memory':
        return HardDrive;
      case 'disk':
        return HardDrive;
      case 'network':
        return Network;
      case 'requests':
        return Activity;
      case 'response_time':
        return Zap;
      default:
        return Activity;
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return TrendingUp;
      case 'down':
        return TrendingDown;
      default:
        return Activity;
    }
  };

  const formatUptime = (uptime: number) => {
    return `${uptime.toFixed(2)}%`;
  };

  const chartData = metrics.find(m => m.id === 'requests')?.history.map(h => ({
    time: h.timestamp.getHours(),
    requests: h.value,
    cpu: metrics.find(m => m.id === 'cpu')?.history.find(ch => 
      ch.timestamp.getHours() === h.timestamp.getHours()
    )?.value || 0,
    memory: metrics.find(m => m.id === 'memory')?.history.find(ch => 
      ch.timestamp.getHours() === h.timestamp.getHours()
    )?.value || 0
  })) || [];

  const serviceStatusData = services.map(service => ({
    name: service.name,
    status: service.status === 'online' ? 1 : service.status === 'maintenance' ? 0.5 : 0,
    responseTime: service.responseTime
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">System Monitoring</h1>
          <p className="text-gray-400">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </p>
        </div>
        
        <Button
          onClick={() => window.location.reload()}
          disabled={isLoading}
          className="bg-cyan-600 hover:bg-cyan-700"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* System Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {metrics.map((metric) => {
          const Icon = getMetricIcon(metric.id);
          const StatusIcon = getStatusIcon(metric.status);
          const TrendIcon = getTrendIcon(metric.trend);
          
          return (
            <motion.div
              key={metric.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <Card className="bg-white/5 border-white/10 hover:bg-white/10 transition-colors">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <Icon className="w-8 h-8 text-cyan-400" />
                      <div>
                        <h3 className="text-lg font-semibold text-white">{metric.name}</h3>
                        <div className="flex items-center space-x-2">
                          <StatusIcon className={`w-4 h-4 ${getStatusColor(metric.status)}`} />
                          <span className={`text-sm ${getStatusColor(metric.status)}`}>
                            {metric.status}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="flex items-center space-x-1">
                        <span className="text-2xl font-bold text-white">
                          {metric.value.toFixed(metric.unit === '%' ? 1 : 0)}
                        </span>
                        <span className="text-gray-400">{metric.unit}</span>
                      </div>
                      <div className="flex items-center space-x-1 mt-1">
                        <TrendIcon className={`w-3 h-3 ${
                          metric.trend === 'up' ? 'text-red-400' : 
                          metric.trend === 'down' ? 'text-green-400' : 'text-gray-400'
                        }`} />
                        <span className={`text-xs ${
                          metric.trend === 'up' ? 'text-red-400' : 
                          metric.trend === 'down' ? 'text-green-400' : 'text-gray-400'
                        }`}>
                          {metric.trend}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Mini Chart */}
                  <div className="h-16">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={metric.history.slice(-12)}>
                        <Area
                          type="monotone"
                          dataKey="value"
                          stroke={
                            metric.status === 'healthy' ? '#10B981' :
                            metric.status === 'warning' ? '#F59E0B' : '#EF4444'
                          }
                          fill={
                            metric.status === 'healthy' ? '#10B981' :
                            metric.status === 'warning' ? '#F59E0B' : '#EF4444'
                          }
                          fillOpacity={0.3}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Chart */}
        <Card className="bg-white/5 border-white/10">
          <div className="p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Activity className="w-5 h-5 text-cyan-400" />
              <h3 className="text-lg font-semibold text-white">System Performance (24h)</h3>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="time" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1F2937',
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: '#F9FAFB'
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="requests"
                    stroke="#10B981"
                    strokeWidth={2}
                    name="Requests/min"
                  />
                  <Line
                    type="monotone"
                    dataKey="cpu"
                    stroke="#F59E0B"
                    strokeWidth={2}
                    name="CPU %"
                  />
                  <Line
                    type="monotone"
                    dataKey="memory"
                    stroke="#EF4444"
                    strokeWidth={2}
                    name="Memory %"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </Card>

        {/* Service Status */}
        <Card className="bg-white/5 border-white/10">
          <div className="p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Server className="w-5 h-5 text-cyan-400" />
              <h3 className="text-lg font-semibold text-white">Service Health</h3>
            </div>
            <div className="space-y-4">
              {services.map((service) => {
                const StatusIcon = getStatusIcon(service.status);
                
                return (
                  <div key={service.name} className="flex items-center justify-between p-3 bg-white/5 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <StatusIcon className={`w-5 h-5 ${getStatusColor(service.status)}`} />
                      <div>
                        <h4 className="text-white font-medium">{service.name}</h4>
                        <p className="text-sm text-gray-400">
                          Uptime: {formatUptime(service.uptime)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className={`text-sm font-medium ${getStatusColor(service.status)}`}>
                        {service.status.toUpperCase()}
                      </div>
                      <div className="text-xs text-gray-400">
                        {service.responseTime}ms
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>
      </div>

      {/* Response Time Chart */}
      <Card className="bg-white/5 border-white/10">
        <div className="p-6">
          <div className="flex items-center space-x-2 mb-4">
            <Zap className="w-5 h-5 text-cyan-400" />
            <h3 className="text-lg font-semibold text-white">Service Response Times</h3>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={serviceStatusData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#F9FAFB'
                  }}
                />
                <Bar dataKey="responseTime" fill="#10B981" name="Response Time (ms)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default SystemMonitoringDashboard;
