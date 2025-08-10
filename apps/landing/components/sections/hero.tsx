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
            <Sparkles className="w-4 h-4 mr-2 text-yellow-300" />
            <span className="text-sm font-medium text-white/80">
              Join 10,000+ businesses already growing with FlowBite
            </span>
          </div>
            {/* Main Headline */}
            <div className="space-y-6">
              <h1 className="text-2xl md:text-5xl lg:text-5xl font-light text-[#878787] leading-[1.1] tracking-tight">
                Invoicing, Time tracking, File reconciliation, Storage, Financial Overview & your own Assistant made for{' '}
                <span className="text-[#F5F5F3] font-medium">Entrepreneurs</span>
              </h1>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Link
                href="/contact"
                className="inline-flex items-center justify-center px-6 py-3 bg-[#F5F5F3] text-[#0C0C0C] text-sm font-medium hover:bg-[#E5E5E3] transition-colors border border-[#E5E5E3]"
              >
                Talk to founders
              </Link>
              <Link
                href="/trial"
                className="inline-flex items-center justify-center px-6 py-3 border border-[#2C2C2C] text-[#F5F5F3] text-sm font-medium hover:bg-[#1A1A1A] transition-colors"
              >
                Start free trial
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

                {/* Dashboard Content */}
                <div className="p-6 space-y-6">
                  {/* Stats Cards */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-[#1A1A1A] p-4 border border-[#2C2C2C]">
                      <div className="text-2xl font-semibold text-[#F5F5F3] mb-1 font-mono">$12,546.90</div>
                      <div className="text-[#878787] text-sm">Revenue</div>
                    </div>
                    <div className="bg-[#1A1A1A] p-4 border border-[#2C2C2C]">
                      <div className="text-2xl font-semibold text-[#F5F5F3] mb-1 font-mono">156</div>
                      <div className="text-[#878787] text-sm">Invoices</div>
                    </div>
                  </div>

                  {/* Chart Area */}
                  <div className="bg-[#1A1A1A] p-4 border border-[#2C2C2C] h-32">
                    <div className="flex items-end justify-between h-full space-x-1">
                      {[40, 60, 30, 80, 50, 70, 45, 85, 65, 75, 55, 90].map((height, i) => (
                        <div
                          key={i}
                          className="bg-[#404040] flex-1"
                          style={{ height: `${height}%` }}
                        ></div>
                      ))}
                    </div>
                  </div>

                  {/* Recent Activity */}
                  <div className="space-y-3">
                    <div className="text-[#F5F5F3] text-sm font-medium">Recent Activity</div>
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center space-x-3 text-sm">
                        <div className="w-2 h-2 bg-[#28CA42] rounded-full"></div>
                        <div className="text-[#F5F5F3]">Invoice #{1000 + i} paid</div>
                        <div className="text-[#878787] ml-auto">2h ago</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Floating Elements */}
              <div className="absolute -top-4 -right-4 bg-[#1A1A1A] border border-[#2C2C2C] p-3 shadow-xl">
                <div className="text-[#28CA42] text-sm font-medium font-mono">+$2,340</div>
                <div className="text-[#878787] text-xs">Today</div>
              </div>

              <div className="absolute -bottom-4 -left-4 bg-[#1A1A1A] border border-[#2C2C2C] p-3 shadow-xl">
                <div className="text-[#3B82F6] text-sm font-medium font-mono">12 hrs</div>
                <div className="text-[#878787] text-xs">Tracked</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}