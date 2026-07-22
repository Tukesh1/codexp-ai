const steps = [
  {
    n: "01",
    title: "Connect a repo",
    body: "Paste a GitHub URL. Codexp clones, indexes symbols, and embeds what it finds.",
  },
  {
    n: "02",
    title: "Read the map",
    body: "Overview readiness, language mix, architecture diagrams, and generated docs.",
  },
  {
    n: "03",
    title: "Ask on the code",
    body: "Highlight a selection, pick a lens, or open Explore for graphs, quizzes, and notes.",
  },
]

const capabilities = [
  {
    title: "Select to explain",
    body: "Highlight any slice of a file. Get a focused answer with selection context, not a generic chat dump.",
  },
  {
    title: "Explore tools",
    body: "Call graphs, concept clusters, dead-end paths, change briefings after re-analyze, and learning quizzes.",
  },
  {
    title: "Your keys, your models",
    body: "OpenAI or Gemini from Settings. Optional GitHub token for private repos and richer insights.",
  },
  {
    title: "Sticky mental notes",
    body: "Pin observations on files and symbols so the next time you open the repo, context is still there.",
  },
]

export function Features() {
  return (
    <>
      <section id="how" className="border-t border-[var(--line)] py-24 md:py-32">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <h2 className="max-w-xl font-[family-name:var(--font-display)] text-4xl font-bold tracking-tight text-[var(--fg)] md:text-5xl">
            From clone to clarity in three moves
          </h2>
          <p className="mt-3 max-w-md text-lg text-[var(--fg-muted)]">
            Built for the messy middle of onboarding a foreign repository.
          </p>
          <ol className="mt-16 grid gap-12 md:grid-cols-3 md:gap-10">
            {steps.map((step) => (
              <li key={step.n}>
                <span className="font-[family-name:var(--font-mono)] text-sm tracking-[0.2em] text-[var(--fg-muted)]">
                  {step.n}
                </span>
                <h3 className="mt-3 text-2xl font-semibold tracking-tight text-[var(--fg)]">
                  {step.title}
                </h3>
                <p className="mt-2 text-base leading-relaxed text-[var(--fg-muted)]">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="product" className="border-t border-[var(--line)] py-24 md:py-32">
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
            <div>
              <h2 className="font-[family-name:var(--font-display)] text-4xl font-bold tracking-tight text-[var(--fg)] md:text-5xl">
                What you actually get
              </h2>
              <p className="mt-3 text-lg text-[var(--fg-muted)]">
                No placeholder dashboards. These ship in the product today.
              </p>
            </div>
            <ul className="divide-y divide-[var(--line)] border-y border-[var(--line)]">
              {capabilities.map((item) => (
                <li key={item.title} className="grid gap-2 py-7 sm:grid-cols-[12rem_1fr] sm:gap-10">
                  <h3 className="text-base font-semibold text-[var(--fg)]">{item.title}</h3>
                  <p className="text-base leading-relaxed text-[var(--fg-muted)]">{item.body}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </>
  )
}
