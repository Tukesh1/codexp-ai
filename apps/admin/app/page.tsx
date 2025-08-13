import { AdminLayout } from "@/components/admin-layout"
import { StatsCard } from "@/components/stats-card"
import { 
  Users, 
  Code2, 
  BarChart3, 
  Activity,
  TrendingUp,
  Database,
  Clock,
  AlertTriangle
} from "lucide-react"

export default function Dashboard() {
  // Mock data - in real app, this would come from your API
  const stats = [
    {
      title: "Total Users",
      value: "2,847",
      change: { value: "12%", type: "increase" as const },
      icon: Users,
      trend: [40, 35, 50, 45, 60, 55, 65]
    },
    {
      title: "Active Projects",
      value: "1,234",
      change: { value: "8%", type: "increase" as const },
      icon: Code2,
      trend: [30, 40, 35, 50, 45, 60, 55]
    },
    {
      title: "Analysis Completed",
      value: "18,569",
      change: { value: "23%", type: "increase" as const },
      icon: BarChart3,
      trend: [20, 30, 25, 40, 35, 50, 45]
    },
    {
      title: "System Uptime",
      value: "99.9%",
      change: { value: "0.1%", type: "increase" as const },
      icon: Activity,
      description: "Last 30 days"
    }
  ]

  const recentActivity = [
    {
      user: "John Doe",
      action: "analyzed repository",
      project: "react-dashboard",
      time: "2 minutes ago",
      status: "completed"
    },
    {
      user: "Jane Smith", 
      action: "created new project",
      project: "vue-components",
      time: "5 minutes ago",
      status: "active"
    },
    {
      user: "Mike Johnson",
      action: "upgraded to Pro plan",
      project: null,
      time: "1 hour ago",
      status: "completed"
    },
    {
      user: "Sarah Wilson",
      action: "generated documentation",
      project: "api-service",
      time: "2 hours ago", 
      status: "completed"
    }
  ]

  const systemAlerts = [
    {
      type: "warning",
      title: "High CPU Usage",
      message: "API service is using 85% CPU",
      time: "10 minutes ago"
    },
    {
      type: "info",
      title: "Scheduled Maintenance",
      message: "Database backup scheduled for 2 AM UTC",
      time: "1 hour ago"
    }
  ]

  return (
    <AdminLayout 
      title="Dashboard" 
      subtitle="Welcome back! Here's what's happening with your system."
    >
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <StatsCard key={index} {...stat} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-center space-x-4">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-sm text-gray-900">
                        <span className="font-medium">{activity.user}</span>{" "}
                        {activity.action}
                        {activity.project && (
                          <>
                            {" "}<span className="font-medium text-blue-600">{activity.project}</span>
                          </>
                        )}
                      </p>
                      <p className="text-xs text-gray-500">{activity.time}</p>
                    </div>
                    <div className="flex-shrink-0">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        activity.status === 'completed' 
                          ? 'bg-green-100 text-green-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {activity.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* System Alerts & Quick Actions */}
        <div className="space-y-6">
          {/* System Alerts */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">System Alerts</h2>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {systemAlerts.map((alert, index) => (
                  <div key={index} className="flex items-start space-x-3">
                    <AlertTriangle className={`h-5 w-5 mt-0.5 ${
                      alert.type === 'warning' ? 'text-yellow-500' : 'text-blue-500'
                    }`} />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{alert.title}</p>
                      <p className="text-xs text-gray-600">{alert.message}</p>
                      <p className="text-xs text-gray-500 mt-1">{alert.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
            </div>
            <div className="p-6 space-y-3">
              <button className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                <Database className="h-4 w-4 mr-2" />
                Run Database Backup
              </button>
              <button className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                <TrendingUp className="h-4 w-4 mr-2" />
                Generate Report
              </button>
              <button className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                <Clock className="h-4 w-4 mr-2" />
                View Logs
              </button>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
