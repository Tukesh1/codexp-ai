import { AdminLayout } from "@/components/admin-layout"
import { StatsCard } from "@/components/stats-card"
import { 
  BarChart3, 
  TrendingUp,
  Users,
  Code2,
  Clock,
  Download,
  Calendar,
  Globe,
  Cpu,
  HardDrive
} from "lucide-react"

export default function AnalyticsPage() {
  // Mock analytics data
  const overviewStats = [
    {
      title: "Total API Calls",
      value: "1.2M",
      change: { value: "15%", type: "increase" as const },
      icon: BarChart3,
      trend: [45, 52, 48, 61, 58, 67, 72]
    },
    {
      title: "Active Users (24h)",
      value: "3,247",
      change: { value: "8%", type: "increase" as const },
      icon: Users,
      trend: [30, 35, 42, 38, 45, 48, 52]
    },
    {
      title: "Analyses Completed",
      value: "18,569",
      change: { value: "23%", type: "increase" as const },
      icon: Code2,
      trend: [20, 25, 30, 35, 32, 40, 45]
    },
    {
      title: "Avg Response Time",
      value: "127ms",
      change: { value: "12%", type: "decrease" as const },
      icon: Clock,
      trend: [180, 165, 150, 140, 135, 130, 127]
    }
  ]

  const usageByPlan = [
    { plan: "Free", users: 1645, percentage: 58, color: "bg-gray-400" },
    { plan: "Pro", users: 892, percentage: 31, color: "bg-blue-500" },
    { plan: "Team", users: 310, percentage: 11, color: "bg-purple-500" }
  ]

  const topLanguages = [
    { language: "JavaScript", projects: 456, percentage: 37 },
    { language: "TypeScript", projects: 334, percentage: 27 },
    { language: "Python", projects: 298, percentage: 24 },
    { language: "Go", projects: 89, percentage: 7 },
    { language: "Others", projects: 57, percentage: 5 }
  ]

  const systemMetrics = [
    { name: "CPU Usage", value: 68, unit: "%", status: "normal" },
    { name: "Memory Usage", value: 72, unit: "%", status: "normal" },
    { name: "Disk Usage", value: 45, unit: "%", status: "good" },
    { name: "Network I/O", value: 234, unit: "MB/s", status: "normal" }
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'good':
        return 'text-green-600'
      case 'normal':
        return 'text-yellow-600'
      case 'warning':
        return 'text-red-600'
      default:
        return 'text-gray-600'
    }
  }

  return (
    <AdminLayout 
      title="Analytics" 
      subtitle="System performance metrics, usage statistics, and insights."
    >
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {overviewStats.map((stat, index) => (
          <StatsCard key={index} {...stat} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Usage by Plan */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Usage by Plan</h3>
            <button className="text-blue-600 hover:text-blue-800 text-sm">
              View Details
            </button>
          </div>
          
          <div className="space-y-4">
            {usageByPlan.map((plan, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${plan.color}`}></div>
                  <span className="text-sm font-medium text-gray-900">{plan.plan}</span>
                </div>
                <div className="flex items-center space-x-3">
                  <span className="text-sm text-gray-600">{plan.users} users</span>
                  <span className="text-sm font-medium text-gray-900">{plan.percentage}%</span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex space-x-1 h-2 bg-gray-200 rounded-full overflow-hidden">
            {usageByPlan.map((plan, index) => (
              <div
                key={index}
                className={plan.color}
                style={{ width: `${plan.percentage}%` }}
              ></div>
            ))}
          </div>
        </div>

        {/* Top Languages */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Top Languages</h3>
            <Globe className="h-5 w-5 text-gray-400" />
          </div>
          
          <div className="space-y-4">
            {topLanguages.map((lang, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900">{lang.language}</span>
                <div className="flex items-center space-x-3">
                  <div className="w-20 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full"
                      style={{ width: `${lang.percentage}%` }}
                    ></div>
                  </div>
                  <span className="text-sm text-gray-600 w-8">{lang.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* System Metrics */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">System Metrics</h3>
            <Cpu className="h-5 w-5 text-gray-400" />
          </div>
          
          <div className="space-y-4">
            {systemMetrics.map((metric, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900">{metric.name}</span>
                <div className="flex items-center space-x-2">
                  <span className={`text-sm font-medium ${getStatusColor(metric.status)}`}>
                    {metric.value}{metric.unit}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Detailed Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Activity Timeline */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Activity Timeline</h3>
              <div className="flex items-center space-x-2">
                <button className="flex items-center px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50">
                  <Calendar className="h-4 w-4 mr-1" />
                  Last 7 days
                </button>
                <button className="text-blue-600 hover:text-blue-800">
                  <Download className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
          
          <div className="p-6">
            <div className="h-64 flex items-end space-x-2">
              {[65, 78, 52, 89, 95, 67, 82].map((height, index) => (
                <div key={index} className="flex-1 flex flex-col items-center">
                  <div 
                    className="w-full bg-blue-500 rounded-t-sm"
                    style={{ height: `${height}%` }}
                  ></div>
                  <span className="text-xs text-gray-500 mt-2">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][index]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Geographic Distribution */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Geographic Distribution</h3>
          </div>
          
          <div className="p-6">
            <div className="space-y-4">
              {[
                { country: "United States", users: 1234, percentage: 43 },
                { country: "Germany", users: 567, percentage: 20 },
                { country: "United Kingdom", users: 432, percentage: 15 },
                { country: "Canada", users: 298, percentage: 10 },
                { country: "France", users: 189, percentage: 7 },
                { country: "Others", users: 127, percentage: 5 }
              ].map((location, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-4 h-3 bg-gray-200 rounded-sm"></div>
                    <span className="text-sm font-medium text-gray-900">{location.country}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-sm text-gray-600">{location.users}</span>
                    <div className="w-16 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full"
                        style={{ width: `${location.percentage}%` }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-gray-900 w-8">{location.percentage}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
