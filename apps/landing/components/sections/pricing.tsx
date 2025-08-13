import { Check } from 'lucide-react'
import Link from 'next/link'

const plans = [
  {
    name: 'Free',
    price: 0,
    description: 'Perfect for exploring Codexp AI capabilities.',
    features: [
      '1 public repository',
      'Basic code analysis',
      'Function summaries',
      '50 Q&A queries per month',
      'Community support',
      'Export basic docs',
      'GitHub integration'
    ],
    cta: 'Get started',
    popular: false
  },
  {
    name: 'Developer',
    price: 19,
    originalPrice: 39,
    description: 'For individual developers and small projects.',
    features: [
      'Unlimited private repositories',
      'Advanced code analysis',
      'Auto documentation generation',
      'Dependency diagrams',
      'Unlimited Q&A queries',
      '50K analysis tokens daily',
      'Email support',
      'Export all formats',
      'PR analysis',
      'API access'
    ],
    cta: 'Start 14 day trial',
    popular: true
  }
]

export function Pricing() {
  return (
    <section id="pricing" className="py-24 bg-[#0D0C0D]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-white mb-4">
            Simple, transparent pricing
          </h2>
          <p className="text-gray-400 text-lg">
            Start free and scale as your development projects grow. No hidden fees.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {plans.map((plan, index) => (
            <div
              key={index}
              className={`relative bg-[#1A1A1A] border border-[#2C2C2C] p-8 ${
                plan.popular ? 'ring-1 ring-white/20' : ''
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 right-6">
                  <div className="bg-white text-black px-3 py-1 text-xs font-medium uppercase tracking-wide">
                    Current offer
                  </div>
                </div>
              )}

              <div className="mb-8">
                <h3 className="text-2xl font-semibold text-white mb-2">{plan.name}</h3>
                
                <div className="flex items-baseline mb-4">
                  {plan.originalPrice && (
                    <span className="text-2xl text-gray-500 line-through mr-2">
                      ${plan.originalPrice}
                    </span>
                  )}
                  <span className="text-4xl font-bold text-white">{plan.price}</span>
                  <span className="text-gray-400 ml-2">/mo</span>
                  <span className="text-gray-500 ml-2 text-sm">excl. VAT</span>
                </div>

                <p className="text-gray-400 text-sm mb-6">{plan.description}</p>

                <div className="mb-6">
                  <h4 className="text-white font-medium text-sm mb-4 uppercase tracking-wide">
                    Including:
                  </h4>
                  <ul className="space-y-2">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start space-x-3">
                        <Check className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                        <span className="text-gray-300 text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Link
                  href="/signup"
                  className={`w-full py-3 px-6 text-center font-medium transition-colors ${
                    plan.popular
                      ? 'bg-white text-black hover:bg-gray-100'
                      : 'border border-[#2C2C2C] text-white hover:bg-[#2C2C2C]'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>

              <div className="text-center">
                <p className="text-xs text-gray-500">
                  {plan.popular 
                    ? 'New users? Plan free 14 contact us'
                    : '14 day trial. No credit card required.'
                  }
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}