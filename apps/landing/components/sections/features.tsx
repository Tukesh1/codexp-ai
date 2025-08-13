import { 
  Code2, 
  Zap, 
  FileText, 
  MessageSquare, 
  GitBranch, 
  Search,
  ArrowRight
} from 'lucide-react'

const features = [
  {
    icon: Code2,
    title: 'Smart Code Analysis',
    description: 'AI-powered parsing using tree-sitter to understand your codebase structure, functions, and relationships.',
    color: 'from-blue-500 to-blue-600'
  },
  {
    icon: FileText,
    title: 'Auto Documentation',
    description: 'Generate comprehensive docs, function summaries, and API documentation automatically from your code.',
    color: 'from-green-500 to-emerald-600'
  },
  {
    icon: MessageSquare,
    title: 'Intelligent Q&A',
    description: 'Ask questions about your codebase and get accurate, context-aware answers powered by AI.',
    color: 'from-purple-500 to-purple-600'
  },
  {
    icon: GitBranch,
    title: 'Visual Diagrams',
    description: 'Create dependency graphs, call diagrams, and architectural visualizations from your codebase.',
    color: 'from-orange-500 to-red-500'
  },
  {
    icon: Search,
    title: 'Semantic Search',
    description: 'Find code by meaning, not just text. Search for functionality across your entire codebase.',
    color: 'from-cyan-500 to-blue-500'
  },
  {
    icon: Zap,
    title: 'Multi-Language',
    description: 'Support for Python, JavaScript, TypeScript, Go, C++, and more programming languages.',
    color: 'from-yellow-500 to-orange-500'
  }
]

const stats = [
  { label: 'Languages Supported', value: '25+' },
  { label: 'Functions Analyzed', value: '10M+' },
  { label: 'Analysis Accuracy', value: '99.5%' },
  { label: 'Repositories', value: '5K+' }
]

export function Features() {
  return (
    <section id="features" className="py-24 bg-[#0D0C0D]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
            Understand any codebase
            <span className="bg-gradient-to-r from-blue-400 to-green-400 bg-clip-text text-transparent"> instantly</span>
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            Powerful AI-driven features that make complex codebases accessible and comprehensible for developers at any level.
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
              Trusted by developers worldwide
            </h3>
            <p className="text-gray-300 text-lg">
              Join thousands of developers using Codexp AI to understand and document their codebases
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