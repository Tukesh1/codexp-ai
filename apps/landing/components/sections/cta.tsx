import Link from 'next/link'
import { ArrowRight, Sparkles } from 'lucide-react'

export function CTA() {
  return (
    <section className="py-24 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
      {/* Modern Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px]"></div>
      
      {/* Subtle Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-transparent to-slate-900/80"></div>

      {/* Modern Floating Elements */}
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-green-500/5 rounded-full blur-3xl"></div>
      <div className="absolute top-3/4 left-3/4 w-48 h-48 bg-purple-500/5 rounded-full blur-3xl"></div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="max-w-4xl mx-auto">
          {/* Badge */}
          <div className="inline-flex items-center px-4 py-2 bg-white/5 backdrop-blur-md border border-white/10 rounded-full mb-8">
            <Sparkles className="w-4 h-4 mr-2 text-blue-400" />
            <span className="text-sm font-medium text-white/90">
              Join thousands of developers already using Codexp AI
            </span>
          </div>

          {/* Main Headline */}
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
            Ready to understand
            <br />
            any codebase?
          </h2>

          {/* Subheadline */}
          <p className="text-xl sm:text-2xl text-white/90 mb-10 leading-relaxed">
            Start analyzing your repositories today and see how AI can transform
            your development workflow instantly.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Link
              href="/signup"
              className="bg-white text-slate-900 px-8 py-4 rounded-lg hover:bg-white/95 transition-all duration-300 flex items-center space-x-2 text-lg font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              <span>Start analyzing</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/demo"
              className="border border-white/20 text-white px-8 py-4 rounded-lg hover:bg-white/5 transition-all duration-300 text-lg font-medium backdrop-blur-md"
            >
              Try live demo
            </Link>
          </div>

          {/* Trust Indicators */}
          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-8 text-white/80">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>Free forever plan</span>
            </div>
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>Instant analysis</span>
            </div>
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              <span>GitHub integration</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}