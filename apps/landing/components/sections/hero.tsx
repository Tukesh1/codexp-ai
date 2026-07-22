"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { getAppUrl, GITHUB_URL } from "@/config/site"
import { RepoCta } from "@/components/sections/repo-cta"

const LENSES = ["architect", "security", "beginner", "reviewer"] as const

const ANSWERS: Record<(typeof LENSES)[number], string> = {
  architect:
    "This wires selection + lens into Ask so the model focuses on the highlighted slice: module boundary, not the whole file.",
  security:
    "Watch the trust boundary: credentials and selection code leave your browser only toward your configured provider.",
  beginner:
    "You highlighted a function call. Codexp sends that snippet with your question so the answer stays concrete.",
  reviewer:
    "Prefer keeping AskWithOptions thin. Selection, files, and lens are enough context for a precise review.",
}

export function Hero() {
  const [lensIdx, setLensIdx] = useState(0)
  const [typed, setTyped] = useState("")
  const [phase, setPhase] = useState<"select" | "ask" | "hold">("select")

  const lens = LENSES[lensIdx] ?? LENSES[0]

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduce) {
      setPhase("hold")
      setTyped(ANSWERS[LENSES[0]])
      return
    }

    let cancelled = false
    const timers: number[] = []

    const run = (idx: number) => {
      if (cancelled) return
      setLensIdx(idx)
      setPhase("select")
      setTyped("")

      timers.push(
        window.setTimeout(() => {
          if (cancelled) return
          setPhase("ask")
          const current = LENSES[idx] ?? LENSES[0]
          const full = ANSWERS[current]
          let i = 0
          const tick = () => {
            if (cancelled) return
            i += 1
            setTyped(full.slice(0, i))
            if (i < full.length) {
              timers.push(window.setTimeout(tick, 14))
            } else {
              setPhase("hold")
              timers.push(window.setTimeout(() => run((idx + 1) % LENSES.length), 2200))
            }
          }
          timers.push(window.setTimeout(tick, 280))
        }, 900)
      )
    }

    run(0)
    return () => {
      cancelled = true
      timers.forEach((t) => window.clearTimeout(t))
    }
  }, [])

  return (
    <section className="relative isolate overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_50%_at_20%_0%,rgba(255,255,255,0.05),transparent_55%)]"
      />
      <div aria-hidden className="landing-grid absolute inset-0 -z-10" />
      <div aria-hidden className="landing-grain absolute inset-0 -z-10" />

      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-12 px-5 py-14 sm:px-6 md:py-18 lg:grid-cols-[1fr_1.05fr] lg:items-center lg:gap-20 lg:py-24">
        {/* Copy */}
        <div className="relative z-10 flex min-w-0 flex-col justify-center">
          <p className="landing-rise font-[family-name:var(--font-display)] text-[clamp(2.75rem,9vw,4.75rem)] font-semibold leading-[0.95] tracking-[-0.035em] text-[var(--fg)]">
            Codexp
          </p>

          <h1 className="landing-rise landing-rise-delay-1 mt-5 max-w-[22ch] text-pretty text-[1.35rem] font-medium leading-[1.35] tracking-[-0.02em] text-[var(--fg)] sm:text-[1.6rem] sm:leading-[1.3]">
            Ask anything about a repo. On the exact lines you highlight.
          </h1>

          <p className="landing-rise landing-rise-delay-2 mt-4 max-w-[34ch] text-pretty text-[0.95rem] leading-relaxed text-[var(--fg-muted)] sm:text-base">
            Bring your own key. Index once. Explore with lenses, graphs, and notes.
          </p>

          <div className="landing-rise landing-rise-delay-3 mt-8 w-full max-w-md">
            <RepoCta />
          </div>

          <div className="landing-rise landing-rise-delay-3 mt-6 flex items-center gap-5 font-[family-name:var(--font-mono)] text-xs tracking-wide text-[var(--fg-muted)]">
            <a href={`${getAppUrl()}/login`} className="transition hover:text-[var(--fg)]">
              Sign in
            </a>
            <span className="text-[var(--line)]" aria-hidden>
              /
            </span>
            <Link href={GITHUB_URL} className="transition hover:text-[var(--fg)]">
              Source
            </Link>
          </div>
        </div>

        {/* Product demo */}
        <div className="landing-rise landing-rise-delay-2 relative z-10 min-w-0">
          <div className="overflow-hidden border border-[var(--line)] bg-[var(--bg-elevated)]">
            <div className="flex h-10 items-center gap-2 border-b border-[var(--line)] px-4">
              <span className="size-1.5 shrink-0 rounded-full bg-[var(--fg)]/25" />
              <span className="size-1.5 shrink-0 rounded-full bg-[var(--fg)]/25" />
              <span className="size-1.5 shrink-0 rounded-full bg-[var(--fg)]/25" />
              <span className="ml-2 truncate font-[family-name:var(--font-mono)] text-[11px] text-[var(--fg-muted)]">
                services/project.go
              </span>
            </div>

            <div className="border-b border-[var(--line)] px-4 py-4 font-[family-name:var(--font-mono)] text-[12px] leading-[1.75] sm:px-5 sm:text-[13px]">
              <div className="flex min-w-0 gap-4">
                <div className="w-7 shrink-0 select-none text-right text-[var(--fg-muted)]/35">
                  {[318, 319, 320, 321, 322, 323, 324].map((n) => (
                    <div key={n}>{n}</div>
                  ))}
                </div>
                <pre className="min-w-0 flex-1 overflow-x-auto whitespace-pre text-[var(--fg-muted)]">
                  <code>
                    {`func AskQuestion(...) {\n`}
                    <span
                      className={`block transition-colors duration-500 ${
                        phase !== "select"
                          ? "bg-[var(--select)] text-[var(--fg)]"
                          : "text-[var(--fg-muted)]"
                      }`}
                    >
                      {`  out, err := ai.AskWithOptions(\n`}
                      {`    id, q, sel, files, "`}
                      <span className="font-medium text-[var(--fg)]">{lens}</span>
                      {`",\n`}
                      {`  )\n`}
                    </span>
                    {`  return out, err\n}`}
                  </code>
                </pre>
              </div>
            </div>

            <div
              className={`space-y-3 bg-[var(--bg)] px-4 py-4 transition-opacity duration-500 sm:px-5 ${
                phase === "select" ? "opacity-50" : "opacity-100"
              }`}
            >
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <span className="shrink-0 font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.16em] text-[var(--fg-muted)]">
                  Select to explain
                </span>
                <div className="flex flex-wrap gap-1">
                  {LENSES.map((l, i) => (
                    <span
                      key={l}
                      className={`px-2 py-0.5 font-[family-name:var(--font-mono)] text-[10px] transition ${
                        i === lensIdx
                          ? "bg-[var(--fg)] text-[var(--inverse)]"
                          : "text-[var(--fg-muted)]"
                      }`}
                    >
                      {l}
                    </span>
                  ))}
                </div>
              </div>
              <p className="min-h-[4.25rem] text-pretty text-sm leading-relaxed text-[var(--fg)]">
                {typed}
                <span className="landing-cursor text-[var(--fg)]">{"▌"}</span>
              </p>
              <div className="h-px w-full bg-[var(--fg)] landing-sweep" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
