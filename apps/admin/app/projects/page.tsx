import { AdminLayout } from "@/components/admin-layout"
import { StatsCard } from "@/components/stats-card"
import { 
  Code2, 
  GitBranch,
  Clock,
  CheckCircle,
  MoreHorizontal,
  Search,
  Filter,
  Download,
  ExternalLink,
  Play,
  Pause
} from "lucide-react"

export default function ProjectsPage() {
  // Mock project stats
  const projectStats = [
    {
      title: "Total Projects",
      value: "1,234",
      change: { value: "8%", type: "increase" as const },
      icon: Code2,
    },
    {
      title: "Active Analyses",
      value: "47",
      change: { value: "15%", type: "increase" as const },
      icon: Play,
    },
    {
      title: "Completed Today",
      value: "89",
      change: { value: "12%", type: "increase" as const },
      icon: CheckCircle,
    },
    {
      title: "Avg. Analysis Time",
      value: "2.3m",
      change: { value: "5%", type: "decrease" as const },
      icon: Clock,
    }
  ]

  const projects = [
    {
      id: 1,
      name: "react-dashboard",
      owner: "John Doe",
      repository: "github.com/johndoe/react-dashboard",
      language: "TypeScript",
      status: "completed",
      lastAnalysis: "2 hours ago",
      filesAnalyzed: 156,
      functions: 423,
      classes: 89,
      progress: 100
    },
    {
      id: 2,
      name: "vue-components",
      owner: "Jane Smith",
      repository: "github.com/janesmith/vue-components", 
      language: "JavaScript",
      status: "analyzing",
      lastAnalysis: "5 minutes ago",
      filesAnalyzed: 78,
      functions: 234,
      classes: 45,
      progress: 65
    },
    {
      id: 3,
      name: "api-service",
      owner: "Mike Johnson",
      repository: "github.com/mikejohnson/api-service",
      language: "Go",
      status: "pending",
      lastAnalysis: "1 day ago",
      filesAnalyzed: 23,
      functions: 89,
      classes: 12,
      progress: 0
    },
    {
      id: 4,
      name: "ml-pipeline",
      owner: "Sarah Wilson",
      repository: "github.com/sarahwilson/ml-pipeline",
      language: "Python", 
      status: "completed",
      lastAnalysis: "6 hours ago",
      filesAnalyzed: 234,
      functions: 567,
      classes: 123,
      progress: 100
    },
    {
      id: 5,
      name: "mobile-app",
      owner: "Alex Brown",
      repository: "github.com/alexbrown/mobile-app",
      language: "TypeScript",
      status: "failed",
      lastAnalysis: "3 hours ago",
      filesAnalyzed: 0,
      functions: 0,
      classes: 0,
      progress: 0
    }
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'analyzing':
        return 'bg-blue-100 text-blue-800'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800'
      case 'failed':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getLanguageColor = (language: string) => {
    switch (language) {
      case 'TypeScript':
        return 'bg-blue-50 text-blue-700'
      case 'JavaScript':
        return 'bg-yellow-50 text-yellow-700'
      case 'Python':
        return 'bg-green-50 text-green-700'
      case 'Go':
        return 'bg-cyan-50 text-cyan-700'
      default:
        return 'bg-gray-50 text-gray-700'
    }
  }

  return (
    <AdminLayout 
      title="Project Management" 
      subtitle="Monitor and manage all code analysis projects across your platform."
    >
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {projectStats.map((stat, index) => (
          <StatsCard key={index} {...stat} />
        ))}
      </div>

      {/* Projects Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">All Projects</h2>
            <div className="flex items-center space-x-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search projects..."
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
                  Project
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Language
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Progress
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Analysis Results
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Analysis
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {projects.map((project) => (
                <tr key={project.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="flex items-center">
                        <Code2 className="h-4 w-4 text-gray-400 mr-2" />
                        <div>
                          <div className="text-sm font-medium text-gray-900">{project.name}</div>
                          <div className="text-sm text-gray-500">{project.owner}</div>
                        </div>
                      </div>
                      <div className="mt-1 flex items-center text-xs text-gray-500">
                        <GitBranch className="h-3 w-3 mr-1" />
                        {project.repository}
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getLanguageColor(project.language)}`}>
                      {project.language}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(project.status)}`}>
                      {project.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${project.progress}%` }}
                        ></div>
                      </div>
                      <span className="text-sm text-gray-600">{project.progress}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      <div>{project.filesAnalyzed} files</div>
                      <div className="text-xs text-gray-500">
                        {project.functions} functions, {project.classes} classes
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {project.lastAnalysis}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end space-x-2">
                      {project.status === 'analyzing' ? (
                        <button className="text-orange-600 hover:text-orange-800" title="Pause analysis">
                          <Pause className="h-4 w-4" />
                        </button>
                      ) : (
                        <button className="text-green-600 hover:text-green-800" title="Start analysis">
                          <Play className="h-4 w-4" />
                        </button>
                      )}
                      <button className="text-gray-400 hover:text-gray-600">
                        <MoreHorizontal className="h-5 w-5" />
                      </button>
                    </div>
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
              Showing 1 to 5 of 1,234 projects
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
