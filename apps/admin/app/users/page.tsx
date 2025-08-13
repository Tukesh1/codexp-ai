import { AdminLayout } from "@/components/admin-layout"
import { StatsCard } from "@/components/stats-card"
import { 
  Users, 
  UserPlus, 
  Crown,
  Activity,
  MoreHorizontal,
  Search,
  Filter,
  Download
} from "lucide-react"

export default function UsersPage() {
  // Mock user data
  const userStats = [
    {
      title: "Total Users",
      value: "2,847",
      change: { value: "12%", type: "increase" as const },
      icon: Users,
    },
    {
      title: "New This Month",
      value: "324",
      change: { value: "18%", type: "increase" as const },
      icon: UserPlus,
    },
    {
      title: "Pro Users",
      value: "892",
      change: { value: "5%", type: "increase" as const },
      icon: Crown,
    },
    {
      title: "Active Today",
      value: "1,243",
      change: { value: "2%", type: "increase" as const },
      icon: Activity,
    }
  ]

  const users = [
    {
      id: 1,
      name: "John Doe",
      email: "john@example.com",
      plan: "Pro",
      projects: 12,
      lastActive: "2 hours ago",
      status: "active",
      joined: "Jan 15, 2024"
    },
    {
      id: 2,
      name: "Jane Smith", 
      email: "jane@example.com",
      plan: "Free",
      projects: 3,
      lastActive: "1 day ago",
      status: "active",
      joined: "Feb 3, 2024"
    },
    {
      id: 3,
      name: "Mike Johnson",
      email: "mike@example.com", 
      plan: "Team",
      projects: 25,
      lastActive: "30 minutes ago",
      status: "active",
      joined: "Dec 10, 2023"
    },
    {
      id: 4,
      name: "Sarah Wilson",
      email: "sarah@example.com",
      plan: "Pro", 
      projects: 8,
      lastActive: "5 days ago",
      status: "inactive",
      joined: "Nov 22, 2023"
    },
    {
      id: 5,
      name: "Alex Brown",
      email: "alex@example.com",
      plan: "Free",
      projects: 1,
      lastActive: "3 hours ago", 
      status: "active",
      joined: "Mar 5, 2024"
    }
  ]

  const getPlanBadgeColor = (plan: string) => {
    switch (plan) {
      case 'Pro':
        return 'bg-blue-100 text-blue-800'
      case 'Team':
        return 'bg-purple-100 text-purple-800'
      case 'Free':
        return 'bg-gray-100 text-gray-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusColor = (status: string) => {
    return status === 'active' 
      ? 'bg-green-100 text-green-800'
      : 'bg-red-100 text-red-800'
  }

  return (
    <AdminLayout 
      title="User Management" 
      subtitle="Manage users, plans, and permissions across your platform."
    >
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {userStats.map((stat, index) => (
          <StatsCard key={index} {...stat} />
        ))}
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">All Users</h2>
            <div className="flex items-center space-x-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search users..."
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
              
              {/* Filter */}
              <button className="flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </button>
              
              {/* Export */}
              <button className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                <Download className="h-4 w-4 mr-2" />
                Export
              </button>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Plan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Projects
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Active
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Joined
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-gray-600">
                          {user.name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getPlanBadgeColor(user.plan)}`}>
                      {user.plan}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user.projects}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.lastActive}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(user.status)}`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.joined}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button className="text-gray-400 hover:text-gray-600">
                      <MoreHorizontal className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Showing 1 to 5 of 2,847 users
            </div>
            <div className="flex items-center space-x-2">
              <button className="px-3 py-1 border border-gray-300 rounded text-sm text-gray-500 hover:bg-gray-50">
                Previous
              </button>
              <button className="px-3 py-1 bg-blue-600 text-white rounded text-sm">
                1
              </button>
              <button className="px-3 py-1 border border-gray-300 rounded text-sm text-gray-500 hover:bg-gray-50">
                2
              </button>
              <button className="px-3 py-1 border border-gray-300 rounded text-sm text-gray-500 hover:bg-gray-50">
                3
              </button>
              <button className="px-3 py-1 border border-gray-300 rounded text-sm text-gray-500 hover:bg-gray-50">
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
