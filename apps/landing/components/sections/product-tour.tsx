"use client"

import { useEffect, useState, type ReactNode } from "react"

type DemoId = "overview" | "activity" | "code" | "diagram"

const DEMOS: Array<{
  id: DemoId
  label: string
  title: string
  blurb: string
}> = [
  {
    id: "overview",
    label: "Overview",
    title: "Readiness & GitHub pulse",
    blurb: "Score the index, language mix, and repo identity in one glance.",
  },
  {
    id: "activity",
    label: "Activity",
    title: "Contribution pulse",
    blurb: "Heatmap and commit density that scale with the repo.",
  },
  {
    id: "code",
    label: "Code",
    title: "Select → explain",
    blurb: "Highlight a slice, pick a lens, ask — answers stay grounded.",
  },
  {
    id: "diagram",
    label: "Diagram",
    title: "Architecture map",
    blurb: "Symbol graph from the index — modules, edges, entry points.",
  },
]

const LANGS = [
  { name: "Go", pct: 62, delay: "0s" },
  { name: "TypeScript", pct: 24, delay: "0.15s" },
  { name: "Python", pct: 14, delay: "0.3s" },
]

const HEAT = [
  0.1, 0.2, 0.4, 0.15, 0.6, 0.3, 0.8, 0.2, 0.5, 0.9, 0.35, 0.7, 0.25, 0.45, 0.55, 0.15, 0.85,
  0.4, 0.2, 0.65, 0.3, 0.5, 0.75, 0.1, 0.4, 0.95, 0.2, 0.55, 0.35, 0.7, 0.15, 0.45, 0.6, 0.25,
  0.8, 0.3, 0.5, 0.2, 0.9, 0.4, 0.15, 0.65,
]

const COMMITS = [
  { hash: "a3f1c2", msg: "wire AskWithOptions lenses", ago: "2h" },
  { hash: "9b0e44", msg: "index symbol end lines", ago: "5h" },
  { hash: "c71d08", msg: "readiness score v2", ago: "1d" },
]

function Chrome({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex h-full min-h-[280px] flex-col sm:min-h-[320px]">
      <div className="flex items-center gap-2 border-b border-[var(--line)] px-4 py-2.5">
        <span className="size-2 bg-[var(--fg)]/20" />
        <span className="size-2 bg-[var(--fg)]/20" />
        <span className="size-2 bg-[var(--fg)]/20" />
        <span className="ml-3 font-[family-name:var(--font-mono)] text-[11px] text-[var(--fg-muted)]">
          {title}
        </span>
      </div>
      <div className="flex-1 p-4 sm:p-5">{children}</div>
    </div>
  )
}

function OverviewDemo() {
  return (
    <Chrome title="overview · codexp-ai">
      <div className="grid h-full gap-5 sm:grid-cols-[auto_1fr]">
        <div className="flex flex-col items-center justify-center">
          <svg viewBox="0 0 120 120" className="size-28 sm:size-32">
            <circle cx="60" cy="60" r="48" fill="none" stroke="var(--line)" strokeWidth="7" />
            <circle
              cx="60"
              cy="60"
              r="48"
              fill="none"
              stroke="var(--fg)"
              strokeWidth="7"
              strokeLinecap="square"
              strokeDasharray="301"
              strokeDashoffset="301"
              className="landing-ring -rotate-90"
              style={{ transformOrigin: "60px 60px" }}
            />
            <text
              x="60"
              y="58"
              textAnchor="middle"
              fill="var(--fg)"
              style={{ fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 600 }}
            >
              87
            </text>
            <text
              x="60"
              y="76"
              textAnchor="middle"
              fill="var(--fg-muted)"
              style={{ fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: "0.12em" }}
            >
              READY
            </text>
          </svg>
        </div>
        <div className="flex flex-col justify-center gap-4">
          <div>
            <p className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.18em] text-[var(--fg-muted)]">
              Languages
            </p>
            <div className="mt-3 space-y-2.5">
              {LANGS.map((l) => (
                <div key={l.name}>
                  <div className="mb-1 flex justify-between font-[family-name:var(--font-mono)] text-[11px] text-[var(--fg-muted)]">
                    <span>{l.name}</span>
                    <span>{l.pct}%</span>
                  </div>
                  <div className="h-1 overflow-hidden bg-[var(--line)]">
                    <div
                      className="h-full bg-[var(--fg)] landing-bar"
                      style={{ width: `${l.pct}%`, animationDelay: l.delay }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="flex gap-4 border-t border-[var(--line)] pt-3 font-[family-name:var(--font-mono)] text-[11px] text-[var(--fg-muted)]">
            <span>
              <span className="text-[var(--fg)]">142</span> files
            </span>
            <span>
              <span className="text-[var(--fg)]">1.2k</span> symbols
            </span>
            <span>
              <span className="text-[var(--fg)]">38</span> pkgs
            </span>
          </div>
        </div>
      </div>
    </Chrome>
  )
}

function ActivityDemo() {
  return (
    <Chrome title="activity · contribution pulse">
      <div className="grid h-full gap-5 sm:grid-cols-[1.2fr_0.8fr]">
        <div>
          <p className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.18em] text-[var(--fg-muted)]">
            Last 12 weeks
          </p>
          <div className="mt-3 grid grid-cols-7 gap-1">
            {HEAT.map((v, i) => (
              <div
                key={i}
                className="aspect-square landing-heat"
                style={{
                  backgroundColor: `rgba(245, 245, 245, ${0.06 + v * 0.85})`,
                  animationDelay: `${i * 0.02}s`,
                }}
              />
            ))}
          </div>
        </div>
        <div>
          <p className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.18em] text-[var(--fg-muted)]">
            Recent
          </p>
          <ul className="mt-3 space-y-2.5">
            {COMMITS.map((c, i) => (
              <li
                key={c.hash}
                className="landing-node flex items-baseline gap-2 font-[family-name:var(--font-mono)] text-[11px]"
                style={{ animationDelay: `${0.2 + i * 0.12}s` }}
              >
                <span className="text-[var(--fg)]">{c.hash}</span>
                <span className="min-w-0 flex-1 truncate text-[var(--fg-muted)]">{c.msg}</span>
                <span className="shrink-0 text-[var(--fg-muted)]/50">{c.ago}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Chrome>
  )
}

function CodeDemo() {
  const [on, setOn] = useState(false)
  useEffect(() => {
    const t = window.setTimeout(() => setOn(true), 400)
    return () => window.clearTimeout(t)
  }, [])

  return (
    <Chrome title="code · handlers/ask.go">
      <div className="font-[family-name:var(--font-mono)] text-[12px] leading-[1.7] sm:text-[13px]">
        <div className="flex gap-4">
          <div className="select-none text-right text-[var(--fg-muted)]/40">
            {[88, 89, 90, 91, 92].map((n) => (
              <div key={n}>{n}</div>
            ))}
          </div>
          <pre className="overflow-x-auto whitespace-pre text-[var(--fg-muted)]">
            <code>
              {`if sel != "" {\n`}
              <span
                className={`block transition-colors duration-500 ${
                  on ? "bg-[var(--select)] text-[var(--fg)]" : "text-[var(--fg-muted)]"
                }`}
              >
                {`  ctx = WithSelection(ctx, sel)\n`}
                {`  lens = ResolveLens(req.Lens)\n`}
              </span>
              {`}\nreturn Ask(ctx, q, lens)`}
            </code>
          </pre>
        </div>
        <div
          className={`mt-4 border border-[var(--line)] bg-[var(--bg)] p-3 transition-opacity duration-500 ${
            on ? "opacity-100" : "opacity-30"
          }`}
        >
          <p className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.18em] text-[var(--fg-muted)]">
            architect lens
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-[var(--fg)]">
            Selection scopes the prompt — Ask never sees the whole file unless you send it.
            <span className="landing-cursor text-[var(--fg)]">{"▌"}</span>
          </p>
        </div>
      </div>
    </Chrome>
  )
}

function DiagramDemo() {
  return (
    <Chrome title="diagram · symbol graph">
      <svg viewBox="0 0 480 220" className="h-full w-full" aria-hidden>
        <defs>
          <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="var(--fg)" />
          </marker>
        </defs>
        <line
          x1="100"
          y1="110"
          x2="190"
          y2="60"
          stroke="var(--fg)"
          strokeWidth="1.25"
          markerEnd="url(#arrow)"
          className="landing-edge"
          style={{ animationDelay: "0.15s" }}
        />
        <line
          x1="100"
          y1="110"
          x2="190"
          y2="160"
          stroke="var(--fg)"
          strokeWidth="1.25"
          markerEnd="url(#arrow)"
          className="landing-edge"
          style={{ animationDelay: "0.25s" }}
        />
        <line
          x1="280"
          y1="60"
          x2="360"
          y2="110"
          stroke="var(--fg)"
          strokeWidth="1.25"
          markerEnd="url(#arrow)"
          className="landing-edge"
          style={{ animationDelay: "0.4s" }}
        />
        <line
          x1="280"
          y1="160"
          x2="360"
          y2="110"
          stroke="var(--fg)"
          strokeWidth="1.25"
          markerEnd="url(#arrow)"
          className="landing-edge"
          style={{ animationDelay: "0.5s" }}
        />
        {[
          { x: 40, y: 88, w: 100, label: "api/main", d: "0s" },
          { x: 200, y: 38, w: 110, label: "handlers", d: "0.1s" },
          { x: 200, y: 138, w: 110, label: "services", d: "0.2s" },
          { x: 360, y: 88, w: 90, label: "ai svc", d: "0.35s" },
        ].map((n) => (
          <g key={n.label} className="landing-node" style={{ animationDelay: n.d }}>
            <rect
              x={n.x}
              y={n.y}
              width={n.w}
              height={44}
              fill="var(--bg)"
              stroke="var(--fg)"
              strokeWidth="1"
            />
            <text
              x={n.x + n.w / 2}
              y={n.y + 27}
              textAnchor="middle"
              fill="var(--fg)"
              style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}
            >
              {n.label}
            </text>
          </g>
        ))}
      </svg>
    </Chrome>
  )
}

const PANELS: Record<DemoId, () => ReactNode> = {
  overview: OverviewDemo,
  activity: ActivityDemo,
  code: CodeDemo,
  diagram: DiagramDemo,
}

export function ProductTour() {
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (paused) return
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    if (reduce) return
    const t = window.setInterval(() => {
      setActive((i) => (i + 1) % DEMOS.length)
    }, 5200)
    return () => window.clearInterval(t)
  }, [paused])

  const demo = DEMOS[active]!
  const Panel = PANELS[demo.id]

  return (
    <section id="tour" className="border-t border-[var(--line)] py-24 md:py-32">
      <div className="mx-auto max-w-6xl px-4 md:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="font-[family-name:var(--font-display)] text-4xl font-bold tracking-tight text-[var(--fg)] md:text-5xl">
              The product, as it ships
            </h2>
            <p className="mt-3 max-w-lg text-lg text-[var(--fg-muted)]">
              Animated walkthrough of Overview, Activity, Code, and Diagram.
            </p>
          </div>
          <p className="font-[family-name:var(--font-mono)] text-[11px] text-[var(--fg-muted)]">
            {String(active + 1).padStart(2, "0")} / {String(DEMOS.length).padStart(2, "0")}
          </p>
        </div>

        <div
          className="mt-12 grid gap-6 lg:grid-cols-[13rem_1fr]"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          <div className="flex flex-row gap-2 overflow-x-auto lg:flex-col lg:gap-0">
            {DEMOS.map((d, i) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setActive(i)}
                className={`shrink-0 border px-3 py-3 text-left text-base transition lg:border-0 lg:border-l lg:px-4 ${
                  i === active
                    ? "border-[var(--fg)] bg-[var(--bg-elevated)] text-[var(--fg)] lg:border-l-[var(--fg)]"
                    : "border-[var(--line)] text-[var(--fg-muted)] hover:text-[var(--fg)] lg:border-l-[var(--line)]"
                }`}
              >
                <span className="font-[family-name:var(--font-mono)] text-xs tracking-wider uppercase opacity-60">
                  {d.label}
                </span>
                <span className="mt-0.5 block font-medium">{d.title}</span>
              </button>
            ))}
          </div>

          <div className="overflow-hidden border border-[var(--line)] bg-[var(--bg-elevated)]">
            <div className="flex items-center justify-between gap-4 border-b border-[var(--line)] px-5 py-3">
              <div>
                <p className="text-lg font-medium text-[var(--fg)]">{demo.title}</p>
                <p className="mt-0.5 text-sm text-[var(--fg-muted)]">{demo.blurb}</p>
              </div>
              <div className="hidden h-px w-24 shrink-0 overflow-hidden bg-[var(--line)] sm:block">
                <div key={demo.id} className="h-full bg-[var(--fg)] landing-progress" />
              </div>
            </div>
            <div key={demo.id} className="landing-panel-in">
              <Panel />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
