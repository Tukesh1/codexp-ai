import Link from 'next/link'
import { ArrowRight, Sparkles } from 'lucide-react'

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-[#0D0C0D]">
      <div className="container mx-auto px-4 pt-32 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          {/* Left Content */}
          <div className="space-y-8 max-w-2xl">
            {/* Version Badge */}
            {/* <div className="flex items-center space-x-2 text-[#878787] text-sm font-mono">
              <span>FlowBite v2.0</span>
              <ArrowRight className="w-4 h-4" />
            </div> */}
            <div className="inline-flex items-center px-4 py-2 bg-white/10 backdrop-blur-sm border border-white/30 mb-8">
            <Sparkles className="w-4 h-4 mr-2 text-blue-300" />
            <span className="text-sm font-medium text-white/80">
              Trusted by developers at leading tech companies
            </span>
          </div>
            {/* Main Headline */}
            <div className="space-y-6">
              <h1 className="text-2xl md:text-5xl lg:text-5xl font-light text-[#878787] leading-[1.1] tracking-tight">
                Explain, document, and visualize codebases automatically with{' '}
                <span className="text-[#F5F5F3] font-medium">AI-powered analysis</span>
              </h1>
              <p className="text-lg text-[#878787] max-w-xl">
                Ship dev-ready docs, diagrams, and Q&A for any repository in minutes. Understand unfamiliar code instantly.
              </p>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Link
                href="/demo"
                className="inline-flex items-center justify-center px-6 py-3 bg-[#F5F5F3] text-[#0C0C0C] text-sm font-medium hover:bg-[#E5E5E3] transition-colors border border-[#E5E5E3]"
              >
                Try Live Demo
              </Link>
              <Link
                href="/github"
                className="inline-flex items-center justify-center px-6 py-3 border border-[#2C2C2C] text-[#F5F5F3] text-sm font-medium hover:bg-[#1A1A1A] transition-colors"
              >
                View on GitHub
              </Link>
            </div>
          </div>

          {/* Right Content - Dashboard Preview */}
          <div className="relative lg:mt-8">
            <div className="relative">
              {/* Main Dashboard Window */}
              <div className="bg-[#0C0C0C] border border-[#2C2C2C] overflow-hidden shadow-2xl">
                {/* Window Header */}
                <div className="bg-[#1A1A1A] px-4 py-3 border-b border-[#2C2C2C]">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 bg-[#FF5F57] rounded-full"></div>
                    <div className="w-3 h-3 bg-[#FFBD2E] rounded-full"></div>
                    <div className="w-3 h-3 bg-[#28CA42] rounded-full"></div>
                  </div>
                </div>

                {/* Code Analysis Dashboard */}
                <div className="p-6 space-y-6">
                  {/* Stats Cards */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-[#1A1A1A] p-4 border border-[#2C2C2C]">
                      <div className="text-2xl font-semibold text-[#F5F5F3] mb-1 font-mono">2,847</div>
                      <div className="text-[#878787] text-sm">Functions</div>
                    </div>
                    <div className="bg-[#1A1A1A] p-4 border border-[#2C2C2C]">
                      <div className="text-2xl font-semibold text-[#F5F5F3] mb-1 font-mono">98%</div>
                      <div className="text-[#878787] text-sm">Documented</div>
                    </div>
                  </div>

                  {/* Code Structure Visualization */}
                  <div className="bg-[#1A1A1A] p-4 border border-[#2C2C2C] h-32">
                    <div className="text-[#878787] text-xs mb-2">Code Structure</div>
                    <div className="space-y-2">
                      {['Python 45%', 'TypeScript 30%', 'Go 15%', 'Other 10%'].map((lang, i) => (
                        <div key={i} className="flex items-center space-x-2">
                          <div className={`w-2 h-2 rounded-full ${
                            i === 0 ? 'bg-blue-400' : i === 1 ? 'bg-yellow-400' : i === 2 ? 'bg-green-400' : 'bg-gray-400'
                          }`}></div>
                          <div className="text-[#F5F5F3] text-xs flex-1">{lang}</div>
                          <div className={`h-1 flex-1 rounded ${
                            i === 0 ? 'bg-blue-400' : i === 1 ? 'bg-yellow-400' : i === 2 ? 'bg-green-400' : 'bg-gray-400'
                          }`} style={{ width: `${45 - i * 10}%` }}></div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recent Analysis */}
                  <div className="space-y-3">
                    <div className="text-[#F5F5F3] text-sm font-medium">Recent Analysis</div>
                    {[
                      { name: 'auth.py', type: 'Function', status: 'Analyzed' },
                      { name: 'UserService', type: 'Class', status: 'Documented' },
                      { name: 'main.go', type: 'File', status: 'Analyzed' }
                    ].map((item, i) => (
                      <div key={i} className="flex items-center space-x-3 text-sm">
                        <div className="w-2 h-2 bg-[#28CA42] rounded-full"></div>
                        <div className="text-[#F5F5F3]">{item.name}</div>
                        <div className="text-[#878787] text-xs bg-[#2C2C2C] px-2 py-1 rounded">{item.type}</div>
                        <div className="text-[#878787] ml-auto">2m ago</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Floating Elements */}
              <div className="absolute -top-4 -right-4 bg-[#1A1A1A] border border-[#2C2C2C] p-3 shadow-xl">
                <div className="text-[#28CA42] text-sm font-medium font-mono">95% Match</div>
                <div className="text-[#878787] text-xs">Q&A Accuracy</div>
              </div>

              <div className="absolute -bottom-4 -left-4 bg-[#1A1A1A] border border-[#2C2C2C] p-3 shadow-xl">
                <div className="text-[#3B82F6] text-sm font-medium font-mono">3.2 min</div>
                <div className="text-[#878787] text-xs">Analysis Time</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}