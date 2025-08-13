import { AdminLayout } from "@/components/admin-layout"
import { StatsCard } from "@/components/stats-card"
import { 
  Activity,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Server,
  Database,
  Cpu,
  HardDrive,
  Wifi,
  Clock,
  Zap,
  RefreshCw
} from "lucide-react"

export default function HealthPage() {
  // Mock health data
  const healthStats = [
    {
      title: "System Uptime",
      value: "99.9%",
      change: { value: "0.1%", type: "increase" as const },
      icon: Activity,
      description: "Last 30 days"
    },
    {
      title: "Response Time",
      value: "127ms",
      change: { value: "12%", type: "decrease" as const },
      icon: Clock,
      description: "Average API response"
    },
    {
      title: "Error Rate",
      value: "0.02%",
      change: { value: "0.01%", type: "decrease" as const },
      icon: AlertTriangle,
      description: "Last 24 hours"
    },
    {
      title: "Throughput",
      value: "1.2K/min",
      change: { value: "8%", type: "increase" as const },
      icon: Zap,
      description: "Requests per minute"
    }
  ]

  const services = [
    {
      name: "API Gateway",
      status: "healthy",
      uptime: "99.99%",
      responseTime: "45ms",
      lastChecked: "30 seconds ago",
      endpoint: "https://api.codexp.ai/health"
    },
    {
      name: "AI Service",
      status: "healthy", 
      uptime: "99.95%",
      responseTime: "234ms",
      lastChecked: "1 minute ago",
      endpoint: "https://ai.codexp.ai/health"
    },
    {
      name: "Database (Primary)",
      status: "healthy",
      uptime: "100%",
      responseTime: "12ms",
      lastChecked: "30 seconds ago",
      endpoint: "postgresql://primary.db.codexp.ai:5432"
    },
    {
      name: "Database (Replica)",
      status: "warning",
      uptime: "99.8%",
      responseTime: "89ms",
      lastChecked: "2 minutes ago",
      endpoint: "postgresql://replica.db.codexp.ai:5432"
    },
    {
      name: "Redis Cache",
      status: "healthy",
      uptime: "99.99%",
      responseTime: "8ms",
      lastChecked: "30 seconds ago",
      endpoint: "redis://cache.codexp.ai:6379"
    },
    {
      name: "File Storage",
      status: "degraded",
      uptime: "99.5%",
      responseTime: "456ms",
      lastChecked: "5 minutes ago",
      endpoint: "s3://storage.codexp.ai"
    }
  ]

  const systemMetrics = [
    {
      name: "CPU Usage",
      value: 34,
      threshold: 80,
      unit: "%",
      status: "normal",
      icon: Cpu
    },
    {
      name: "Memory Usage",
      value: 72,
      threshold: 85,
      unit: "%",
      status: "normal", 
      icon: Server
    },
    {
      name: "Disk Usage",
      value: 45,
      threshold: 90,
      unit: "%",
      status: "good",
      icon: HardDrive
    },
    {
      name: "Network I/O",
      value: 234,
      threshold: 1000,
      unit: "MB/s",
      status: "good",
      icon: Wifi
    }
  ]

  const recentIncidents = [
    {
      id: 1,
      title: "High latency on AI service",
      status: "resolved",
      severity: "medium",
      startTime: "2024-03-15 14:30 UTC",
      duration: "23 minutes",
      description: "Increased response times due to model loading issues"
    },
    {
      id: 2,
      title: "Database connection timeout",
      status: "investigating", 
      severity: "high",
      startTime: "2024-03-15 09:15 UTC",
      duration: "ongoing",
      description: "Intermittent connection timeouts to replica database"
    },
    {
      id: 3,
      title: "Scheduled maintenance completed",
      status: "resolved",
      severity: "low",
      startTime: "2024-03-14 02:00 UTC", 
      duration: "2 hours",
      description: "System updates and security patches applied"
    }
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'text-green-600 bg-green-50'
      case 'warning':
        return 'text-yellow-600 bg-yellow-50'
      case 'degraded':
        return 'text-orange-600 bg-orange-50'
      case 'unhealthy':
        return 'text-red-600 bg-red-50'
      default:
        return 'text-gray-600 bg-gray-50'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return CheckCircle
      case 'warning':
        return AlertTriangle
      case 'degraded':
      case 'unhealthy':
        return XCircle
      default:
        return AlertTriangle
    }
  }
 // Get server status
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low':
        return 'bg-blue-100 text-blue-800'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800'
      case 'high':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getIncidentStatusColor = (status: string) => {
    switch (status) {
      case 'resolved':
        return 'bg-green-100 text-green-800'
      case 'investigating':
        return 'bg-orange-100 text-orange-800'
      case 'monitoring':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  return (
    <AdminLayout 
      title="System Health" 
      subtitle="Monitor system performance, service status, and infrastructure health."
    >
      {/* Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {healthStats.map((stat, index) => (
          <StatsCard key={index} {...stat} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Service Status */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Service Status</h2>
                <button className="flex items-center px-3 py-1 text-sm text-blue-600 hover:text-blue-800">
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Refresh
                </button>
              </div>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {services.map((service, index) => {
                  const StatusIcon = getStatusIcon(service.status)
                  return (
                    <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <StatusIcon className={`h-5 w-5 ${getStatusColor(service.status).split(' ')[0]}`} />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{service.name}</div>
                          <div className="text-xs text-gray-500">{service.endpoint}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(service.status)}`}>
                          {service.status}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {service.responseTime} • {service.uptime} uptime
                        </div>
                        <div className="text-xs text-gray-400">
                          Last checked: {service.lastChecked}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* System Metrics */}
        <div>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">System Metrics</h2>
            </div>
            <div className="p-6">
              <div className="space-y-6">
                {systemMetrics.map((metric, index) => (
                  <div key={index} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <metric.icon className="h-4 w-4 text-gray-400" />
                        <span className="text-sm font-medium text-gray-900">{metric.name}</span>
                      </div>
                      <span className="text-sm font-medium text-gray-900">
                        {metric.value}{metric.unit}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          metric.value > metric.threshold ? 'bg-red-500' :
                          metric.value > metric.threshold * 0.8 ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min((metric.value / metric.threshold) * 100, 100)}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-xs text-gray-500">
                      <span>0</span>
                      <span>{metric.threshold}{metric.unit}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Incidents */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Recent Incidents</h2>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {recentIncidents.map((incident) => (
              <div key={incident.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-sm font-medium text-gray-900">{incident.title}</h3>
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(incident.severity)}`}>
                        {incident.severity}
                      </span>
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getIncidentStatusColor(incident.status)}`}>
                        {incident.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{incident.description}</p>
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      <span>Started: {incident.startTime}</span>
                      <span>Duration: {incident.duration}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
