import { 
  Brain, 
  Zap, 
  Shield, 
  BarChart3, 
  Users, 
  Workflow,
  ArrowRight
} from 'lucide-react'

const features = [
  {
    icon: Brain,
    title: 'AI-Powered Insights',
    description: 'Get intelligent recommendations and predictions based on your business data with advanced machine learning algorithms.',
    color: 'from-purple-500 to-purple-600'
  },
  {
    icon: Zap,
    title: 'Lightning Fast',
    description: 'Built for speed with modern architecture. Experience instant loading and real-time updates across all features.',
    color: 'from-yellow-500 to-orange-500'
  },
  {
    icon: Shield,
    title: 'Enterprise Security',
    description: 'Bank-grade security with end-to-end encryption, SOC 2 compliance, and advanced threat protection.',
    color: 'from-green-500 to-emerald-600'
  },
  {
    icon: BarChart3,
    title: 'Advanced Analytics',
    description: 'Comprehensive dashboards and reports that turn your data into actionable business intelligence.',
    color: 'from-blue-500 to-cyan-500'
  },
  {
    icon: Users,
    title: 'Team Collaboration',
    description: 'Work together seamlessly with real-time collaboration tools, shared workspaces, and role-based permissions.',
    color: 'from-pink-500 to-rose-500'
  },
  {
    icon: Workflow,
    title: 'Smart Automation',
    description: 'Automate repetitive tasks and workflows with intelligent triggers and custom business rules.',
    color: 'from-indigo-500 to-purple-500'
  }
]

const stats = [
  { label: 'Active Users', value: '50K+' },
  { label: 'Data Points Processed', value: '1B+' },
  { label: 'Uptime', value: '99.9%' },
  { label: 'Countries', value: '120+' }
]

export function Features() {
  return (
    <section id="features" className="py-24 bg-[#0D0C0D]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
            Everything you need to
            <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent"> succeed</span>
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            Powerful features designed to streamline your business operations and drive growth through intelligent automation.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="group p-8 border border-gray-800 hover:border-gray-700 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 bg-[#0D0C0D]/80">
            
              <div className={`w-14 h-14 bg-gradient-to-r ${feature.color} flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
                <feature.icon className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">
                {feature.title}
              </h3>
              <p className="text-gray-400 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>

        {/* Stats Section */}
        <div className="bg-gradient-to-r from-gray-900 to-black border border-gray-800 p-12 text-white">
          <div className="text-center mb-12">
            <h3 className="text-2xl sm:text-3xl font-bold mb-4">
              Trusted by businesses worldwide
            </h3>
            <p className="text-gray-300 text-lg">
              Join thousands of companies already using FlowBite to transform their operations
            </p>
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl sm:text-4xl font-bold mb-2 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
                  {stat.value}
                </div>
                <div className="text-gray-300 text-sm sm:text-base">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}