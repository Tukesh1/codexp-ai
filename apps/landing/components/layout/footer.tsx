import Link from 'next/link'
import { Twitter, Github, Linkedin, Mail } from 'lucide-react'

const navigation = {
  product: [
    { name: 'Features', href: '#features' },
    { name: 'Pricing', href: '#pricing' },
    { name: 'Demo', href: '#demo' },
    { name: 'API', href: '/docs/api' },
  ],
  developers: [
    { name: 'Documentation', href: '/docs' },
    { name: 'GitHub', href: 'https://github.com/Tukesh1/codexp-ai' },
    { name: 'API Reference', href: '/docs/api' },
    { name: 'Examples', href: '/docs/examples' },
  ],
  resources: [
    { name: 'Getting Started', href: '/docs/getting-started' },
    { name: 'Use Cases', href: '/use-cases' },
    { name: 'Community', href: '/community' },
    { name: 'Changelog', href: '/changelog' },
  ],
  support: [
    { name: 'Help Center', href: '/help' },
    { name: 'Contact', href: '/contact' },
    { name: 'Status', href: '/status' },
    { name: 'Bug Reports', href: '/issues' },
  ],
}

const socialLinks = [
  {
    name: 'GitHub',
    href: 'https://github.com/Tukesh1/codexp-ai',
    icon: Github,
  },
  {
    name: 'Twitter',
    href: '#',
    icon: Twitter,
  },
  {
    name: 'LinkedIn',
    href: '#',
    icon: Linkedin,
  },
  {
    name: 'Email',
    href: 'mailto:contact@codexp.ai',
    icon: Mail,
  },
]

export function Footer() {
  return (
    <footer className="text-white bg-[#0D0C0D]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-8">
          {/* Brand Section */}
          <div className="lg:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-green-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">C</span>
              </div>
              <span className="font-semibold text-xl">Codexp AI</span>
            </div>
            <p className="text-gray-400 mb-6 max-w-md">
              Automatically analyze, document, and visualize any codebase with AI. Transform complex code into clear documentation and interactive diagrams.
            </p>
            <div className="flex space-x-4">
              {socialLinks.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <span className="sr-only">{item.name}</span>
                  <item.icon className="w-5 h-5" />
                </Link>
              ))}
            </div>
          </div>

          {/* Navigation Sections */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Product
            </h3>
            <ul className="space-y-3">
              {navigation.product.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Developers
            </h3>
            <ul className="space-y-3">
              {navigation.developers.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Resources
            </h3>
            <ul className="space-y-3">
              {navigation.resources.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              Support
            </h3>
            <ul className="space-y-3">
              {navigation.support.map((item) => (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Newsletter Signup */}
        <div className="mt-12 pt-8 border-t border-gray-800">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <h3 className="text-lg font-semibold mb-2">Developer Updates</h3>
              <p className="text-gray-400">Get notified about new features, API updates, and code analysis improvements.</p>
            </div>
            <div className="flex space-x-2">
              <input
                type="email"
                placeholder="Enter your email"
                className="px-4 py-2 border border-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-[#0D0C0D]/80"
              />
              <button className="px-6 py-2 bg-purple-600 hover:bg-purple-700 border border-purple-500 font-medium transition-colors">
                Subscribe
              </button>
            </div>
          </div>
        </div>

        {/* Bottom Section */}
        <div className="mt-8 pt-8 border-t border-gray-800 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-400 text-sm">
            © {new Date().getFullYear()} Codexp AI. All rights reserved.
          </p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <Link href="/privacy" className="text-gray-400 hover:text-white text-sm transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-gray-400 hover:text-white text-sm transition-colors">
              Terms of Service
            </Link>
            <Link href="/cookies" className="text-gray-400 hover:text-white text-sm transition-colors">
              Cookie Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}