"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { APP_URL, GITHUB_URL } from "@/config/site"
import { RepoCta } from "@/components/sections/repo-cta"

const LENSES = ["architect", "security", "beginner", "reviewer"] as const

const ANSWERS: Record<(typeof LENSES)[number], string> = {
  architect:
    "This wires selection + lens into Ask so the model focuses on the highlighted slice — module boundary, not the whole file.",
  security:
    "Watch the trust boundary: credentials and selection code leave your browser only toward your configured provider.",
  beginner:
    "You highlighted a function call. Codexp sends that snippet with your question so the answer stays concrete.",
  reviewer:
    "Prefer keeping AskWithOptions thin — selection, files, and lens are enough context for a precise review.",
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
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_70%_45%_at_50%_-5%,rgba(245,245,245,0.07),transparent_55%)]"
      />
      <div aria-hidden className="landing-grid absolute inset-0 -z-10" />
      <div aria-hidden className="landing-grain absolute inset-0 -z-10" />

      <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-12 px-4 py-16 md:px-6 lg:grid-cols-2 lg:gap-14 lg:py-20">
        <div className="relative z-10 max-w-xl">
          <p className="landing-rise font-[family-name:var(--font-display)] text-7xl font-extrabold tracking-[-0.04em] text-[var(--fg)] sm:text-8xl md:text-9xl">
            Codexp
          </p>
          <h1 className="landing-rise landing-rise-delay-1 mt-7 max-w-lg text-2xl font-medium leading-snug tracking-tight text-[var(--fg)] md:text-3xl">
            Understand any GitHub repo — overview, diagrams, Ask on what you highlight.
          </h1>
          <p className="landing-rise landing-rise-delay-2 mt-4 max-w-md text-lg leading-relaxed text-[var(--fg-muted)]">
            Bring your own key. Index once. Explore with lenses, graphs, and notes.
          </p>

          <div className="landing-rise landing-rise-delay-3 mt-9">
            <RepoCta />
          </div>

          <div className="landing-rise landing-rise-delay-3 mt-5 flex flex-wrap gap-6 font-[family-name:var(--font-mono)] text-sm tracking-wide text-[var(--fg-muted)]">
            <Link href={`${APP_URL}/login`} className="transition hover:text-[var(--fg)]">
              Sign in
            </Link>
            <Link href={GITHUB_URL} className="transition hover:text-[var(--fg)]">
              Source
            </Link>
          </div>
        </div>

        <div className="landing-rise landing-rise-delay-2 relative z-10 w-full">
          <div className="overflow-hidden border border-[var(--line)] bg-[var(--bg-elevated)]">
            <div className="flex items-center gap-2 border-b border-[var(--line)] px-4 py-2.5">
              <span className="size-2 bg-[var(--fg)]/20" />
              <span className="size-2 bg-[var(--fg)]/20" />
              <span className="size-2 bg-[var(--fg)]/20" />
              <span className="ml-3 font-[family-name:var(--font-mono)] text-[11px] text-[var(--fg-muted)]">
                services/project.go
              </span>
            </div>

            <div className="border-b border-[var(--line)] p-4 font-[family-name:var(--font-mono)] text-[13px] leading-[1.7] sm:p-5 sm:text-[15px]">
              <div className="flex gap-4">
                <div className="select-none text-right text-[var(--fg-muted)]/40">
                  {[318, 319, 320, 321, 322, 323, 324].map((n) => (
                    <div key={n}>{n}</div>
                  ))}
                </div>
                <pre className="overflow-x-auto whitespace-pre text-[var(--fg-muted)]">
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
              className={`bg-[var(--bg)] p-4 transition-opacity duration-500 sm:p-5 ${
                phase === "select" ? "opacity-45" : "opacity-100"
              }`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.2em] text-[var(--fg-muted)]">
                  Select → explain
                </p>
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
              <p className="mt-3 min-h-[5rem] text-base leading-relaxed text-[var(--fg)]">
                {typed}
                <span className="landing-cursor text-[var(--fg)]">{"▌"}</span>
              </p>
              <div className="mt-3 h-px w-full bg-[var(--fg)] landing-sweep" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
