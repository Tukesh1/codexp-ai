import Link from "next/link"
import { APP_URL } from "@/config/site"

const plans = [
  {
    name: "Free",
    price: "0",
    blurb: "Explore on public repos with your own API key.",
    features: [
      "Connect public GitHub repos",
      "Overview, Code, Diagram, Docs, Explore",
      "Select-to-explain & Ask",
      "Bring your own LLM key",
    ],
    cta: "Start free",
    highlight: false,
  },
  {
    name: "Developer",
    price: "19",
    blurb: "For private repos and heavier daily use.",
    features: [
      "Private repositories",
      "GitHub token insights",
      "Unlimited Ask (within your provider limits)",
      "Priority analysis queue",
    ],
    cta: "Start with Free",
    highlight: true,
  },
]

export function Pricing() {
  return (
    <section id="pricing" className="border-t border-[var(--line)] py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <h2 className="font-[family-name:var(--font-display)] text-4xl font-bold tracking-tight text-[var(--fg)] md:text-5xl">
          Pricing that stays out of the way
        </h2>
        <p className="mt-3 max-w-lg text-lg text-[var(--fg-muted)]">
          You pay your model provider. Codexp is the workspace on top.
        </p>

        <div className="mt-14 grid gap-px bg-[var(--line)] md:grid-cols-2">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`flex flex-col p-8 md:p-10 ${
                plan.highlight ? "bg-[var(--bg-elevated)]" : "bg-[var(--bg)]"
              }`}
            >
              <div className="flex items-baseline justify-between gap-4">
                <h3 className="text-2xl font-semibold tracking-tight text-[var(--fg)]">
                  {plan.name}
                </h3>
                <p className="font-[family-name:var(--font-mono)] text-3xl text-[var(--fg)]">
                  ${plan.price}
                  <span className="text-base text-[var(--fg-muted)]">/mo</span>
                </p>
              </div>
              <p className="mt-3 text-base text-[var(--fg-muted)]">{plan.blurb}</p>
              <ul className="mt-8 flex-1 space-y-3">
                {plan.features.map((f) => (
                  <li key={f} className="flex gap-3 text-base text-[var(--fg-muted)]">
                    <span className="mt-2.5 size-1.5 shrink-0 bg-[var(--fg)]" />
                    {f}
                  </li>
                ))}
              </ul>
              <Link
                href={`${APP_URL}/projects/new`}
                className={`mt-10 block px-4 py-3.5 text-center text-base font-semibold transition ${
                  plan.highlight
                    ? "bg-[var(--fg)] text-[var(--inverse)] hover:opacity-85"
                    : "border border-[var(--fg)] text-[var(--fg)] hover:bg-[var(--fg)] hover:text-[var(--inverse)]"
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
