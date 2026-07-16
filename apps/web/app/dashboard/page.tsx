"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  ArrowUpRight,
  FolderGit2,
  MessageSquare,
  Plus,
  Sparkles,
  Zap,
} from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { CHART_PALETTE, LanguageMix } from "@/components/charts"
import { api, type Project, type ProjectSummary } from "@/lib/api"
import { useWorkspace } from "@/lib/workspace"
import { Button } from "@workspace/ui/components/button"

function statusColor(status: string) {
  switch (status) {
    case "completed":
      return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
    case "analyzing":
    case "running":
      return "bg-amber-500/15 text-amber-700 dark:text-amber-400"
    case "failed":
      return "bg-red-500/15 text-red-600 dark:text-red-400"
    default:
      return "bg-muted text-muted-foreground"
  }
}

type ProjectCardData = Project & {
  summary?: ProjectSummary | null
}

export default function DashboardPage() {
  const { openAsk } = useWorkspace()
  const [projects, setProjects] = useState<ProjectCardData[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [hasKey, setHasKey] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const [listRes, settings] = await Promise.all([
          api.listProjects(),
          api.getSettings().catch(() => null),
        ])
        if (cancelled) return
        if (settings) setHasKey(settings.has_api_key)

        const list = listRes.projects || []
        const withSummaries = await Promise.all(
          list.slice(0, 8).map(async (p) => {
            const summary =
              p.status === "completed" || p.status === "analyzing"
                ? await api.getSummary(p.id).catch(() => null)
                : null
            return { ...p, summary }
          })
        )
        // Keep remaining projects without summary fetch
        const rest = list.slice(8).map((p) => ({ ...p, summary: null }))
        if (!cancelled) setProjects([...withSummaries, ...rest])
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load")
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const completed = projects.filter((p) => p.status === "completed").length
  const analyzing = projects.filter((p) => p.status === "analyzing").length
  const recent = [...projects].sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  )

  const workspaceLanguages = useMemo(() => {
    const map = new Map<string, number>()
    for (const p of projects) {
      const langs = p.summary?.languages || {}
      for (const [name, count] of Object.entries(langs)) {
        map.set(name, (map.get(name) || 0) + count)
      }
    }
    return [...map.entries()]
      .map(([name, files]) => ({ name, files, bytes: 0 }))
      .sort((a, b) => b.files - a.files)
      .slice(0, 8)
  }, [projects])

  const totalFiles = projects.reduce((s, p) => s + (p.summary?.file_count || 0), 0)
  const totalFns = projects.reduce((s, p) => s + (p.summary?.function_count || 0), 0)

  return (
    <AppShell title="Dashboard">
      <section className="relative overflow-hidden rounded-2xl border bg-zinc-950 px-6 py-9 text-zinc-50">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 80% 60% at 10% 0%, oklch(0.65 0.12 180 / 0.35), transparent 55%), radial-gradient(ellipse 50% 40% at 90% 20%, oklch(0.7 0.1 70 / 0.22), transparent 50%), linear-gradient(180deg, transparent, oklch(0.2 0 0 / 0.5))",
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
        <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-xl space-y-3">
            <p className="inline-flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.16em] text-teal-300/90">
              <Sparkles className="size-3.5" />
              Your code intelligence hub
            </p>
            <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              See structure. Ask anything. Ship faster.
            </h2>
            <p className="text-sm leading-relaxed text-zinc-300">
              Browse repos like GitHub, explore language mix and activity, generate docs and
              diagrams, and keep Ask AI one click away from every screen.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              className="bg-white text-zinc-900 hover:bg-zinc-100"
              onClick={() => openAsk()}
            >
              <MessageSquare className="size-4" />
              Ask AI
            </Button>
            <Button asChild variant="outline" className="border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white">
              <Link href="/projects/new">
                <Plus className="size-4" />
                New project
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {!hasKey && (
        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
          <span className="font-medium">API key needed.</span> Add OpenAI or Gemini in{" "}
          <Link href="/settings" className="underline">
            Settings
          </Link>{" "}
          to unlock analysis, docs, and Q&A.
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Projects" value={projects.length} hint="Connected repos" />
        <StatCard label="Analyzed" value={completed} hint="Ready for deep dive" accent="teal" />
        <StatCard label="In progress" value={analyzing} hint="Jobs running" accent="amber" />
        <StatCard label="Indexed files" value={totalFiles} hint={`${totalFns} functions found`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_0.95fr]">
        <section className="rounded-2xl border bg-card p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="font-medium tracking-tight">Workspace language mix</h3>
              <p className="text-xs text-muted-foreground">
                Aggregated from analyzed projects — hover rows, nothing shifts
              </p>
            </div>
            <Zap className="size-4 text-teal-600 dark:text-teal-400" />
          </div>
          {workspaceLanguages.length === 0 ? (
            <div className="flex min-h-36 items-center justify-center rounded-xl border border-dashed text-sm text-muted-foreground">
              Analyze a project to unlock workspace-level charts.
            </div>
          ) : (
            <LanguageMix data={workspaceLanguages} />
          )}
        </section>

        <section className="rounded-2xl border bg-card p-5">
          <h3 className="font-medium tracking-tight">Quick paths</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">Common next moves in this workspace</p>
          <div className="mt-4 grid gap-2">
            <QuickLink href="/projects/new" title="Connect a GitHub repo" desc="Start a fresh analysis pipeline" />
            <QuickLink href="/settings" title="Configure AI provider" desc="OpenAI or Gemini with your own key" />
            <button
              type="button"
              onClick={() => openAsk(recent[0]?.id)}
              className="rounded-xl border px-4 py-3 text-left transition hover:bg-muted/50"
            >
              <p className="text-sm font-medium">Ask about a project</p>
              <p className="text-xs text-muted-foreground">Opens the global Ask AI panel</p>
            </button>
            {recent[0] && (
              <QuickLink
                href={`/projects/${recent[0].id}`}
                title={`Continue: ${recent[0].name}`}
                desc="Jump back into overview, code, and docs"
              />
            )}
          </div>
        </section>
      </div>

      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold tracking-tight">Recent projects</h3>
          <p className="text-sm text-muted-foreground">
            Cards include live status and mini language signals.
          </p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/projects">View all</Link>
        </Button>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Loading workspace…</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {!loading && !error && projects.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed py-16 text-center">
          <FolderGit2 className="size-10 text-muted-foreground" />
          <div>
            <p className="font-medium">No projects yet</p>
            <p className="text-sm text-muted-foreground">
              Paste a GitHub repo URL to start analyzing.
            </p>
          </div>
          <Button asChild>
            <Link href="/projects/new">Create your first project</Link>
          </Button>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {recent.slice(0, 6).map((project) => {
          const langs = Object.entries(project.summary?.languages || {}).slice(0, 4)
          const fileCount = project.summary?.file_count
          return (
            <Link
              key={project.id}
              href={`/projects/${project.id}`}
              className="group relative flex flex-col rounded-2xl border bg-card p-4 transition hover:-translate-y-0.5 hover:border-foreground/15 hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-2">
                <h4 className="font-medium tracking-tight">{project.name}</h4>
                <span
                  className={`rounded-md px-2 py-0.5 text-[11px] font-medium capitalize ${statusColor(project.status)}`}
                >
                  {project.status}
                </span>
              </div>
              <p className="mt-2 truncate font-mono text-[11px] text-muted-foreground">
                {project.repo_url || "No repo URL"}
              </p>

              {langs.length > 0 && (
                <div className="mt-4">
                  <div className="flex h-1.5 overflow-hidden rounded-full bg-muted">
                    {langs.map(([name, count], i) => {
                      const total = langs.reduce((s, [, c]) => s + c, 0) || 1
                      return (
                        <span
                          key={name}
                          style={{
                            width: `${(count / total) * 100}%`,
                            background: CHART_PALETTE[i % CHART_PALETTE.length],
                          }}
                        />
                      )
                    })}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {langs.map(([name], i) => (
                      <span
                        key={name}
                        className="inline-flex items-center gap-1 rounded-md bg-muted/70 px-1.5 py-0.5 text-[10px] text-muted-foreground"
                      >
                        <span
                          className="size-1.5 rounded-full"
                          style={{ background: CHART_PALETTE[i % CHART_PALETTE.length] }}
                        />
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-auto flex items-center justify-between pt-4 text-xs text-muted-foreground">
                <span>
                  {fileCount != null ? `${fileCount} files · ` : ""}
                  Updated {new Date(project.updated_at).toLocaleDateString()}
                </span>
                <span className="inline-flex items-center gap-1 text-foreground opacity-0 transition group-hover:opacity-100">
                  Open <ArrowUpRight className="size-3.5" />
                </span>
              </div>
            </Link>
          )
        })}
      </div>
    </AppShell>
  )
}

function StatCard({
  label,
  value,
  hint,
  accent,
}: {
  label: string
  value: number
  hint: string
  accent?: "teal" | "amber"
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border bg-card p-4">
      {accent && (
        <div
          className="pointer-events-none absolute -right-6 -top-6 size-20 rounded-full opacity-30"
          style={{
            background:
              accent === "teal"
                ? "radial-gradient(circle, #14b8a6, transparent 70%)"
                : "radial-gradient(circle, #f59e0b, transparent 70%)",
          }}
        />
      )}
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-3xl font-semibold tracking-tight tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </div>
  )
}

function QuickLink({
  href,
  title,
  desc,
}: {
  href: string
  title: string
  desc: string
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border px-4 py-3 transition hover:bg-muted/50"
    >
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs text-muted-foreground">{desc}</p>
    </Link>
  )
}
