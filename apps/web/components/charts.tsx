"use client"

import { useMemo, useState } from "react"

export const CHART_PALETTE = [
  "#0d9488",
  "#2563eb",
  "#d97706",
  "#db2777",
  "#7c3aed",
  "#059669",
  "#ea580c",
  "#4f46e5",
]

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

type LangRow = { name: string; files: number; bytes: number }

/** Stacked language strip + interactive legend — no floating tooltip overlay. */
export function LanguageMix({
  data,
  valueLabel = "files",
}: {
  data: LangRow[]
  valueLabel?: string
}) {
  const [active, setActive] = useState<string | null>(null)
  const totalFiles = data.reduce((s, d) => s + d.files, 0) || 1
  const totalBytes = data.reduce((s, d) => s + d.bytes, 0)

  return (
    <div className="space-y-4">
      <div className="flex h-3.5 overflow-hidden rounded-full bg-muted">
        {data.map((d, i) => {
          const pct = (d.files / totalFiles) * 100
          if (pct < 0.4) return null
          const isActive = active === d.name
          return (
            <button
              key={d.name}
              type="button"
              title={`${d.name}: ${d.files} ${valueLabel}`}
              onMouseEnter={() => setActive(d.name)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(d.name)}
              onBlur={() => setActive(null)}
              className="h-full transition-[filter,transform] duration-200 first:rounded-l-full last:rounded-r-full"
              style={{
                width: `${pct}%`,
                background: CHART_PALETTE[i % CHART_PALETTE.length],
                filter: active && !isActive ? "saturate(0.35) brightness(0.9)" : "none",
                transform: isActive ? "scaleY(1.35)" : "scaleY(1)",
                transformOrigin: "center",
              }}
            />
          )
        })}
      </div>

      <div className="grid gap-2">
        {data.slice(0, 8).map((d, i) => {
          const pct = Math.round((d.files / totalFiles) * 100)
          const isActive = active === d.name
          return (
            <button
              key={d.name}
              type="button"
              onMouseEnter={() => setActive(d.name)}
              onMouseLeave={() => setActive(null)}
              className={`grid grid-cols-[1fr_auto] items-center gap-3 rounded-lg px-2 py-1.5 text-left text-sm transition-colors ${
                isActive ? "bg-muted/80" : "hover:bg-muted/40"
              }`}
            >
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ background: CHART_PALETTE[i % CHART_PALETTE.length] }}
                />
                <span className="truncate font-medium">{d.name}</span>
                <span className="text-xs text-muted-foreground">{pct}%</span>
              </span>
              <span className="shrink-0 tabular-nums text-xs text-muted-foreground">
                {d.bytes > 0 ? formatBytes(d.bytes) : `${d.files} ${valueLabel}`}
              </span>
            </button>
          )
        })}
      </div>

      {totalBytes > 0 && valueLabel === "files" && (
        <p className="text-xs text-muted-foreground">
          Indexed size ≈ {formatBytes(totalBytes)} across {totalFiles} files
        </p>
      )}
    </div>
  )
}

/** Circular donut chart — no floating overlays; legend highlights on hover. */
export function DonutChart({
  data,
  valueLabel = "files",
}: {
  data: Array<{ name: string; files: number }>
  valueLabel?: string
}) {
  const [active, setActive] = useState<string | null>(null)
  const total = data.reduce((s, d) => s + d.files, 0) || 1
  const size = 148
  const stroke = 22
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r

  let offset = 0
  const segments = data.slice(0, 8).map((d, i) => {
    const frac = d.files / total
    const length = frac * c
    const seg = {
      ...d,
      color: CHART_PALETTE[i % CHART_PALETTE.length],
      dash: `${length} ${c - length}`,
      offset,
      pct: Math.round(frac * 100),
    }
    offset -= length
    return seg
  })

  const activeSeg = segments.find((s) => s.name === active) || null

  return (
    <div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-center">
      <div className="relative mx-auto size-[148px]">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            className="text-muted"
          />
          {segments.map((seg) => {
            const isActive = active === seg.name
            return (
              <circle
                key={seg.name}
                cx={size / 2}
                cy={size / 2}
                r={r}
                fill="none"
                stroke={seg.color}
                strokeWidth={isActive ? stroke + 4 : stroke}
                strokeDasharray={seg.dash}
                strokeDashoffset={seg.offset}
                strokeLinecap="butt"
                className="cursor-pointer transition-[stroke-width] duration-200"
                style={{ opacity: active && !isActive ? 0.35 : 1 }}
                onMouseEnter={() => setActive(seg.name)}
                onMouseLeave={() => setActive(null)}
              />
            )
          })}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
          {activeSeg ? (
            <>
              <span className="max-w-[88px] truncate text-xs font-medium">{activeSeg.name}</span>
              <span className="text-lg font-semibold tabular-nums">{activeSeg.pct}%</span>
            </>
          ) : (
            <>
              <span className="text-lg font-semibold tabular-nums">{total}</span>
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">{valueLabel}</span>
            </>
          )}
        </div>
      </div>
      <ul className="space-y-1.5">
        {segments.map((seg) => {
          const isActive = active === seg.name
          return (
            <li key={seg.name}>
              <button
                type="button"
                className={`flex w-full items-center justify-between gap-2 rounded-md px-2 py-1 text-left text-xs transition-colors ${
                  isActive ? "bg-muted/80" : "hover:bg-muted/40"
                }`}
                onMouseEnter={() => setActive(seg.name)}
                onMouseLeave={() => setActive(null)}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span className="size-2.5 shrink-0 rounded-full" style={{ background: seg.color }} />
                  <span className="truncate font-medium">{seg.name}</span>
                </span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {seg.files} · {seg.pct}%
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/** Horizontal proportional bars — hover only tints the row, no overlay. */
export function FolderBars({
  data,
}: {
  data: Array<{ name: string; files: number }>
}) {
  const [active, setActive] = useState<string | null>(null)
  const max = Math.max(...data.map((d) => d.files), 1)

  return (
    <div className="space-y-2.5">
      {data.slice(0, 10).map((d) => {
        const pct = (d.files / max) * 100
        const isActive = active === d.name
        return (
          <div
            key={d.name}
            className="group"
            onMouseEnter={() => setActive(d.name)}
            onMouseLeave={() => setActive(null)}
          >
            <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
              <span className={`truncate font-mono ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                {d.name}
              </span>
              <span className="tabular-nums text-muted-foreground">{d.files}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${pct}%`,
                  background: isActive
                    ? "linear-gradient(90deg, #0d9488, #2563eb)"
                    : "linear-gradient(90deg, #0f766e, #1d4ed8)",
                  opacity: active && !isActive ? 0.35 : 1,
                }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

/** GitHub-style contribution heatmap — status line on hover, no layout shift. */
export function CommitHeatmap({
  commits,
}: {
  commits: Array<{ date: string; count?: number }>
}) {
  const weeks = useMemo(() => buildHeatmap(commits, 12), [commits])
  const [active, setActive] = useState<HeatDay | null>(null)

  if (weeks.every((w) => w.every((d) => d.count === 0))) {
    return (
      <p className="text-sm text-muted-foreground">No recent commit activity to plot.</p>
    )
  }

  return (
    <div>
      <div className="flex gap-1 overflow-x-auto pb-1">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.map((day) => (
              <button
                key={day.key}
                type="button"
                className="size-3 rounded-[3px] transition-[transform,box-shadow] duration-150 hover:scale-125 hover:shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                style={{ background: heatColor(day.count) }}
                onMouseEnter={() => setActive(day)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(day)}
                onBlur={() => setActive(null)}
                aria-label={`${day.label}: ${day.count} commits`}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
          <span>Less</span>
          {[0, 1, 2, 3, 4].map((l) => (
            <span key={l} className="size-2.5 rounded-[2px]" style={{ background: heatColor(l) }} />
          ))}
          <span>More</span>
        </div>
        <p className="h-4 text-xs tabular-nums text-muted-foreground">
          {active
            ? `${active.label} · ${active.count} commit${active.count === 1 ? "" : "s"}`
            : "Hover a cell to inspect a day"}
        </p>
      </div>
    </div>
  )
}

/** Compact vertical spark bars for commit density by day. */
export function ActivitySparks({
  data,
}: {
  data: Array<{ date: string; count: number }>
}) {
  const [active, setActive] = useState<string | null>(null)
  const max = Math.max(...data.map((d) => d.count), 1)

  if (data.length === 0) return null

  return (
    <div className="space-y-2">
      <div className="flex h-24 items-end gap-1">
        {data.map((d) => {
          const h = Math.max(8, (d.count / max) * 100)
          const isActive = active === d.date
          return (
            <button
              key={d.date}
              type="button"
              className="group relative flex-1 rounded-t-sm transition-opacity"
              style={{
                height: `${h}%`,
                background: isActive ? "#0d9488" : "#14b8a6",
                opacity: active && !isActive ? 0.3 : 1,
              }}
              onMouseEnter={() => setActive(d.date)}
              onMouseLeave={() => setActive(null)}
              title={`${d.date}: ${d.count}`}
            />
          )
        })}
      </div>
      <p className="h-4 text-xs text-muted-foreground tabular-nums">
        {active
          ? `${active} · ${data.find((d) => d.date === active)?.count ?? 0} commits`
          : "Hover a bar to inspect a day"}
      </p>
    </div>
  )
}

/** Circular readiness score for analysis health. */
export function ScoreRing({
  score,
  label,
  detail,
}: {
  score: number
  label: string
  detail: string
}) {
  const clamped = Math.max(0, Math.min(100, score))
  const r = 36
  const c = 2 * Math.PI * r
  const offset = c - (clamped / 100) * c

  return (
    <div className="flex items-center gap-4">
      <div className="relative size-24 shrink-0">
        <svg viewBox="0 0 88 88" className="size-full -rotate-90">
          <circle
            cx="44"
            cy="44"
            r={r}
            fill="none"
            stroke="currentColor"
            strokeWidth="8"
            className="text-muted"
          />
          <circle
            cx="44"
            cy="44"
            r={r}
            fill="none"
            stroke={`url(#scoreGrad-${clamped})`}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            className="transition-all duration-700"
          />
          <defs>
            <linearGradient id={`scoreGrad-${clamped}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#0d9488" />
              <stop offset="100%" stopColor="#2563eb" />
            </linearGradient>
          </defs>
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-semibold tabular-nums">{clamped}</span>
          <span className="text-[10px] uppercase tracking-wide text-muted-foreground">score</span>
        </div>
      </div>
      <div>
        <p className="font-medium">{label}</p>
        <p className="mt-1 text-sm text-muted-foreground">{detail}</p>
      </div>
    </div>
  )
}

type HeatDay = { key: string; label: string; count: number }

function buildHeatmap(
  commits: Array<{ date: string; count?: number }>,
  weekCount: number
): HeatDay[][] {
  const counts = new Map<string, number>()
  for (const c of commits) {
    const day = c.date.slice(0, 10)
    counts.set(day, (counts.get(day) || 0) + (c.count ?? 1))
  }

  const end = new Date()
  end.setHours(0, 0, 0, 0)
  // Align to Sunday start of current week
  const start = new Date(end)
  start.setDate(end.getDate() - (weekCount * 7 - 1) - end.getDay())

  const weeks: HeatDay[][] = []
  const cursor = new Date(start)
  for (let w = 0; w < weekCount; w++) {
    const week: HeatDay[] = []
    for (let d = 0; d < 7; d++) {
      const key = cursor.toISOString().slice(0, 10)
      week.push({
        key,
        label: key,
        count: counts.get(key) || 0,
      })
      cursor.setDate(cursor.getDate() + 1)
    }
    weeks.push(week)
  }
  return weeks
}

function heatColor(count: number) {
  if (count <= 0) return "color-mix(in oklch, var(--muted) 85%, transparent)"
  if (count === 1) return "#99f6e4"
  if (count === 2) return "#5eead4"
  if (count === 3) return "#14b8a6"
  return "#0f766e"
}
