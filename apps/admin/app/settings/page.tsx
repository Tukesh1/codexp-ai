import { AdminLayout } from "@/components/admin-layout"
import { 
  Save,
  AlertTriangle,
  Key,
  Database,
  Mail,
  Shield,
  Globe,
  Webhook,
  Bot,
  Server
} from "lucide-react"

export default function SettingsPage() {
  const settingsSections = [
    {
      id: "general",
      title: "General Settings",
      icon: Globe,
      settings: [
        { key: "site_name", label: "Site Name", value: "Codexp AI", type: "text" },
        { key: "site_description", label: "Site Description", value: "AI-powered code analysis platform", type: "textarea" },
        { key: "max_users", label: "Maximum Users", value: "10000", type: "number" },
        { key: "maintenance_mode", label: "Maintenance Mode", value: false, type: "boolean" }
      ]
    },
    {
      id: "api",
      title: "API Configuration",
      icon: Key,
      settings: [
        { key: "api_rate_limit", label: "API Rate Limit (per minute)", value: "1000", type: "number" },
        { key: "api_key_expiry", label: "API Key Expiry (days)", value: "90", type: "number" },
        { key: "webhook_timeout", label: "Webhook Timeout (seconds)", value: "30", type: "number" },
        { key: "enable_cors", label: "Enable CORS", value: true, type: "boolean" }
      ]
    },
    {
      id: "ai",
      title: "AI Services",
      icon: Bot,
      settings: [
        { key: "huggingface_api_key", label: "HuggingFace API Key", value: "hf_••••••••••••••••", type: "password" },
        { key: "model_cache_size", label: "Model Cache Size (GB)", value: "50", type: "number" },
        { key: "max_analysis_time", label: "Max Analysis Time (minutes)", value: "30", type: "number" },
        { key: "enable_gpu", label: "Enable GPU Processing", value: true, type: "boolean" }
      ]
    },
    {
      id: "database",
      title: "Database",
      icon: Database,
      settings: [
        { key: "db_backup_frequency", label: "Backup Frequency (hours)", value: "24", type: "number" },
        { key: "db_retention_days", label: "Data Retention (days)", value: "365", type: "number" },
        { key: "enable_analytics", label: "Enable Analytics Tracking", value: true, type: "boolean" },
        { key: "compress_backups", label: "Compress Backups", value: true, type: "boolean" }
      ]
    },
    {
      id: "security",
      title: "Security",
      icon: Shield,
      settings: [
        { key: "jwt_expiry", label: "JWT Token Expiry (hours)", value: "24", type: "number" },
        { key: "password_min_length", label: "Minimum Password Length", value: "8", type: "number" },
        { key: "require_2fa", label: "Require 2FA for Admins", value: true, type: "boolean" },
        { key: "enable_audit_logs", label: "Enable Audit Logs", value: true, type: "boolean" }
      ]
    },
    {
      id: "notifications",
      title: "Notifications",
      icon: Mail,
      settings: [
        { key: "smtp_host", label: "SMTP Host", value: "smtp.gmail.com", type: "text" },
        { key: "smtp_port", label: "SMTP Port", value: "587", type: "number" },
        { key: "smtp_username", label: "SMTP Username", value: "admin@codexp.ai", type: "email" },
        { key: "smtp_password", label: "SMTP Password", value: "••••••••••••", type: "password" }
      ]
    }
  ]

  return (
    <AdminLayout 
      title="System Settings" 
      subtitle="Configure system-wide settings and preferences."
    >
      <div className="max-w-4xl">
        {/* Header Actions */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <div className="flex items-center px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-yellow-600 mr-2" />
              <span className="text-sm text-yellow-700">Changes require system restart</span>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">
              Reset to Defaults
            </button>
            <button className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
              <Save className="h-4 w-4 mr-2" />
              Save All Changes
            </button>
          </div>
        </div>

        {/* Settings Sections */}
        <div className="space-y-6">
          {settingsSections.map((section) => (
            <div key={section.id} className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center">
                  <section.icon className="h-5 w-5 text-gray-400 mr-3" />
                  <h3 className="text-lg font-semibold text-gray-900">{section.title}</h3>
                </div>
              </div>
              
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {section.settings.map((setting) => (
                    <div key={setting.key} className="space-y-2">
                      <label className="block text-sm font-medium text-gray-700">
                        {setting.label}
                      </label>
                      
                      {setting.type === "text" || setting.type === "email" || setting.type === "password" ? (
                        <input
                          type={setting.type}
                          defaultValue={setting.value as string}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      ) : setting.type === "number" ? (
                        <input
                          type="number"
                          defaultValue={setting.value as string}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      ) : setting.type === "textarea" ? (
                        <textarea
                          defaultValue={setting.value as string}
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      ) : setting.type === "boolean" ? (
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            defaultChecked={setting.value as boolean}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <span className="ml-2 text-sm text-gray-600">Enable this feature</span>
                        </div>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* System Status */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center">
              <Server className="h-5 w-5 text-gray-400 mr-3" />
              <h3 className="text-lg font-semibold text-gray-900">System Status</h3>
            </div>
          </div>
          
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Database className="h-8 w-8 text-green-600" />
                </div>
                <div className="text-sm font-medium text-gray-900">Database</div>
                <div className="text-xs text-green-600">Connected</div>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Bot className="h-8 w-8 text-green-600" />
                </div>
                <div className="text-sm font-medium text-gray-900">AI Service</div>
                <div className="text-xs text-green-600">Online</div>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <Webhook className="h-8 w-8 text-green-600" />
                </div>
                <div className="text-sm font-medium text-gray-900">API Gateway</div>
                <div className="text-xs text-green-600">Healthy</div>
              </div>
            </div>
            
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Last system check:</span>
                <span className="text-gray-900">2 minutes ago</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-gray-600">System uptime:</span>
                <span className="text-gray-900">14 days, 6 hours</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-gray-600">Version:</span>
                <span className="text-gray-900">v1.2.3</span>
              </div>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="mt-8 bg-white rounded-lg shadow-sm border border-red-200">
          <div className="px-6 py-4 border-b border-red-200">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-500 mr-3" />
              <h3 className="text-lg font-semibold text-red-900">Danger Zone</h3>
            </div>
          </div>
          
          <div className="p-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg">
                <div>
                  <div className="text-sm font-medium text-red-900">Reset All Settings</div>
                  <div className="text-sm text-red-600">This will reset all settings to their default values.</div>
                </div>
                <button className="px-4 py-2 border border-red-300 text-red-700 rounded-lg text-sm font-medium hover:bg-red-50">
                  Reset Settings
                </button>
              </div>
              
              <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg">
                <div>
                  <div className="text-sm font-medium text-red-900">Clear All Data</div>
                  <div className="text-sm text-red-600">This will permanently delete all user data and projects.</div>
                </div>
                <button className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700">
                  Clear Data
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
