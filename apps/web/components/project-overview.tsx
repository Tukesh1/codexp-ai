"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Activity,
  BookOpen,
  Box,
  CheckCircle2,
  CircleDashed,
  ExternalLink,
  FileCode2,
  GitBranch,
  GitCommit,
  GitFork,
  GitPullRequest,
  Layers,
  RefreshCw,
  Scale,
  Star,
  Users,
} from "lucide-react"
import { api } from "@/lib/api"
import {
  ActivitySparks,
  CHART_PALETTE,
  CommitHeatmap,
  DonutChart,
  LanguageMix,
  ScoreRing,
  formatBytes,
} from "@/components/charts"
import { MarkdownBody } from "@/components/markdown-body"
import type { ProjectInsights, ProjectSummary, Readiness } from "@/lib/api"

function computeScore(summary: ProjectSummary | null, insights: ProjectInsights | null) {
  let score = 5
  if ((summary?.file_count || insights?.total_files || 0) > 0) score += 15
  if ((summary?.function_count || insights?.function_count || 0) > 0) score += 12
  if ((summary?.overview || summary?.summary || "").length > 40) score += 18
  if (insights?.artifacts?.diagram) score += 10
  if (insights?.artifacts?.docs) score += 8
  if ((insights?.embedding_count || 0) > 0) score += 8
  if ((insights?.languages?.length || 0) > 0) score += 6
  if ((insights?.commits?.length || 0) > 0) score += 6
  if (insights?.github) score += 6
  if ((insights?.contributors?.length || 0) > 0) score += 4
  if (insights?.readme?.excerpt) score += 2
  return Math.min(100, score)
}

function scoreLabel(score: number) {
  if (score >= 80)
    return { label: "Fully mapped", detail: "Indexed code, AI artifacts, and GitHub signals are ready." }
  if (score >= 50)
    return { label: "Partially indexed", detail: "Re-analyze or generate docs/diagram to unlock more." }
  return { label: "Needs analysis", detail: "Run AI analysis to map this repository end-to-end." }
}

const KIND_LABEL: Record<string, string> = {
  readme: "README",
  license: "License",
  container: "Container",
  manifest: "Manifest",
  lockfile: "Lockfile",
  build: "Build",
  entrypoint: "Entry",
  config: "Config",
  important: "Key file",
}

const GITHUB_SECTIONS = [
  "meta",
  "readme",
  "commits",
  "contributors",
  "releases",
  "languages",
  "pulls",
] as const

type GithubSection = (typeof GITHUB_SECTIONS)[number]

/** Survives Overview remounts (tab switches) so we do not re-hit GitHub rate limits. */
const githubCache = new Map<string, Partial<ProjectInsights>>()
const githubAutoFetchInflight = new Map<string, Promise<void>>()

const GITHUB_FIELD_KEYS = [
  "github",
  "github_error",
  "github_languages",
  "github_languages_error",
  "contributors",
  "contributors_error",
  "releases",
  "releases_error",
  "readme",
  "readme_error",
  "open_prs",
  "open_prs_error",
  "commits",
  "commits_error",
  "commit_activity",
  "recent_authors",
  "github_token_configured",
] as const

function pickGithubFields(source: Partial<ProjectInsights> | null | undefined): Partial<ProjectInsights> {
  if (!source) return {}
  const out: Partial<ProjectInsights> = {}
  for (const key of GITHUB_FIELD_KEYS) {
    if (source[key] !== undefined) {
      ;(out as Record<string, unknown>)[key] = source[key]
    }
  }
  return out
}

function sectionAlreadyLoaded(insights: ProjectInsights | null, section: GithubSection): boolean {
  if (!insights) return false
  switch (section) {
    case "meta":
      return insights.github !== undefined || Boolean(insights.github_error)
    case "readme":
      return insights.readme !== undefined || Boolean(insights.readme_error)
    case "commits":
      return insights.commits !== undefined || Boolean(insights.commits_error)
    case "contributors":
      return insights.contributors !== undefined || Boolean(insights.contributors_error)
    case "releases":
      return insights.releases !== undefined || Boolean(insights.releases_error)
    case "languages":
      return insights.github_languages !== undefined || Boolean(insights.github_languages_error)
    case "pulls":
      return insights.open_prs !== undefined || Boolean(insights.open_prs_error)
    default:
      return false
  }
}

function mergeGithubSection(
  prev: ProjectInsights | null,
  section: string,
  res: Record<string, unknown>
): ProjectInsights {
  const next: ProjectInsights = {
    languages: [],
    folders: [],
    activity: [],
    total_bytes: 0,
    ...(prev || {}),
  }
  const err = typeof res.error === "string" ? res.error : undefined
  if (typeof res.github_token_configured === "boolean") {
    next.github_token_configured = res.github_token_configured
  }

  switch (section) {
    case "meta":
    case "github":
      if (res.github) {
        next.github = res.github as ProjectInsights["github"]
        next.github_error = undefined
      } else if (err && !next.github) {
        // Keep previously loaded meta; only surface error when we have nothing to show.
        next.github_error = err
      }
      break
    case "languages":
      if (Array.isArray(res.github_languages)) {
        next.github_languages = res.github_languages as ProjectInsights["github_languages"]
        next.github_languages_error = undefined
      } else if (err && !next.github_languages?.length) {
        next.github_languages_error = err || "Failed to load GitHub languages"
      }
      break
    case "contributors":
      if (Array.isArray(res.contributors)) {
        next.contributors = res.contributors as ProjectInsights["contributors"]
        next.contributors_error = undefined
      } else if (err && !next.contributors?.length) {
        next.contributors_error = err || "Failed to load contributors"
      }
      break
    case "releases":
      if (Array.isArray(res.releases)) {
        next.releases = res.releases as ProjectInsights["releases"]
        next.releases_error = undefined
      } else if (err && !next.releases?.length) {
        next.releases_error = err
      }
      break
    case "readme":
      if (res.readme) {
        next.readme = res.readme as ProjectInsights["readme"]
        next.readme_error = undefined
      } else if (err && !next.readme) {
        next.readme_error = err
      }
      break
    case "pulls":
      if (typeof res.open_prs === "number") {
        next.open_prs = res.open_prs
        next.open_prs_error = undefined
      } else if (err && next.open_prs === undefined) {
        next.open_prs_error = err
      }
      break
    case "commits":
      if (Array.isArray(res.commits)) {
        next.commits = res.commits as ProjectInsights["commits"]
        next.commit_activity = res.commit_activity as ProjectInsights["commit_activity"]
        next.recent_authors = res.recent_authors as ProjectInsights["recent_authors"]
        next.commits_error = undefined
      } else if (err && !next.commits?.length) {
        next.commits_error = err || "Failed to load commits"
      }
      break
  }
  return next
}

function rememberGithub(projectId: string, insights: ProjectInsights | null) {
  if (!insights) return
  const prev = githubCache.get(projectId) || {}
  githubCache.set(projectId, { ...prev, ...pickGithubFields(insights) })
}

export function ProjectOverview({
  projectId,
  summary,
  insights: insightsProp,
}: {
  projectId: string
  summary: ProjectSummary | null
  insights: ProjectInsights | null
}) {
  const [insights, setInsights] = useState<ProjectInsights | null>(() => {
    const cached = githubCache.get(projectId)
    if (!insightsProp && !cached) return null
    return {
      languages: [],
      folders: [],
      activity: [],
      total_bytes: 0,
      ...(insightsProp || {}),
      ...pickGithubFields(cached),
    }
  })
  const [loadingSection, setLoadingSection] = useState<Record<string, boolean>>({})
  const [readiness, setReadiness] = useState<Readiness | null>(null)

  useEffect(() => {
    let alive = true
    void api
      .getReadiness(projectId)
      .then((r) => {
        if (alive) setReadiness(r)
      })
      .catch(() => undefined)
    return () => {
      alive = false
    }
  }, [projectId])

  // Merge local analysis updates without wiping GitHub panels already loaded.
  useEffect(() => {
    setInsights((prev) => {
      const cached = githubCache.get(projectId)
      const github = {
        ...pickGithubFields(cached),
        ...pickGithubFields(prev),
      }
      if (!insightsProp && Object.keys(github).length === 0) return prev
      const next: ProjectInsights = {
        languages: [],
        folders: [],
        activity: [],
        total_bytes: 0,
        ...(insightsProp || {}),
        ...github,
      }
      rememberGithub(projectId, next)
      return next
    })
  }, [insightsProp, projectId])

  const refreshSection = useCallback(
    async (section: string) => {
      setLoadingSection((prev) => ({ ...prev, [section]: true }))
      try {
        const res = await api.refreshGithubSection(projectId, section)
        setInsights((prev) => {
          const next = mergeGithubSection(prev, section, res)
          rememberGithub(projectId, next)
          return next
        })
      } catch (err) {
        const message = err instanceof Error ? err.message : "Refresh failed"
        setInsights((prev) => {
          const next = mergeGithubSection(prev, section, { error: message })
          rememberGithub(projectId, next)
          return next
        })
      } finally {
        setLoadingSection((prev) => ({ ...prev, [section]: false }))
      }
    },
    [projectId]
  )

  // Fetch each missing GitHub section once; cache + shared lock skip re-fetch on remount.
  useEffect(() => {
    let alive = true

    const apply = (section: string, res: Record<string, unknown>) => {
      setInsights((prev) => {
        const next = mergeGithubSection(prev, section, res)
        rememberGithub(projectId, next)
        return next
      })
    }

    const run = async () => {
      const cached = githubCache.get(projectId) || {}
      const seed: ProjectInsights = {
        languages: [],
        folders: [],
        activity: [],
        total_bytes: 0,
        ...pickGithubFields(cached),
      }

      for (const section of GITHUB_SECTIONS) {
        if (sectionAlreadyLoaded(seed, section)) continue

        if (alive) setLoadingSection((prev) => ({ ...prev, [section]: true }))
        try {
          const res = await api.refreshGithubSection(projectId, section)
          const merged = mergeGithubSection(seed, section, res)
          Object.assign(seed, pickGithubFields(merged))
          rememberGithub(projectId, merged)
          if (alive) apply(section, res)
        } catch (err) {
          const message = err instanceof Error ? err.message : "Refresh failed"
          const res = { error: message }
          const merged = mergeGithubSection(seed, section, res)
          Object.assign(seed, pickGithubFields(merged))
          rememberGithub(projectId, merged)
          if (alive) apply(section, res)
        } finally {
          if (alive) setLoadingSection((prev) => ({ ...prev, [section]: false }))
        }
        await new Promise((r) => setTimeout(r, 250))
      }
    }

    const existing = githubAutoFetchInflight.get(projectId)
    const promise =
      existing ??
      run().finally(() => {
        githubAutoFetchInflight.delete(projectId)
      })
    if (!existing) githubAutoFetchInflight.set(projectId, promise)

    // If a fetch was already in flight / done, hydrate UI from cache when we remount.
    void promise.then(() => {
      if (!alive) return
      const cached = githubCache.get(projectId)
      if (!cached) return
      setInsights((prev) => {
        const next: ProjectInsights = {
          languages: [],
          folders: [],
          activity: [],
          total_bytes: 0,
          ...(prev || {}),
          ...pickGithubFields(cached),
        }
        return next
      })
    })

    return () => {
      alive = false
    }
  }, [projectId])

  const languageData = useMemo(() => {
    if (insights?.languages?.length) {
      return insights.languages.map((l) => ({
        name: l.language,
        files: l.file_count,
        bytes: l.bytes,
      }))
    }
    if (!summary?.languages) return []
    return Object.entries(summary.languages).map(([name, files]) => ({
      name,
      files,
      bytes: 0,
    }))
  }, [insights, summary])

  const githubLangData = useMemo(
    () =>
      (insights?.github_languages || []).map((l) => ({
        name: l.language,
        files: Math.max(1, Math.round(l.percent * 10)),
        bytes: l.bytes,
      })),
    [insights]
  )

  const folderData = useMemo(
    () =>
      (insights?.folders || []).map((f) => ({
        name: f.folder,
        files: f.file_count,
      })),
    [insights]
  )

  const extensionData = useMemo(
    () =>
      (insights?.extensions || []).map((e) => ({
        name: e.extension.startsWith(".") || e.extension === "(none)" ? e.extension : `.${e.extension}`,
        files: e.file_count,
      })),
    [insights]
  )

  const commitActivity = useMemo(() => {
    return [...(insights?.commit_activity || [])].sort((a, b) => a.date.localeCompare(b.date))
  }, [insights])

  const heatCommits = useMemo(() => {
    if (insights?.commits?.length) {
      return insights.commits.map((c) => ({ date: c.date, count: 1 }))
    }
    return commitActivity.map((c) => ({ date: c.date, count: c.count }))
  }, [insights, commitActivity])

  const commits = insights?.commits || []
  const github = insights?.github
  const score = readiness?.score ?? computeScore(summary, insights)
  const readinessLabel = readiness
    ? {
        label: readiness.label,
        detail:
          readiness.detail ||
          `${Math.round(readiness.coverage_pct)}% embedding coverage · ${readiness.embedding_count} embeddings`,
      }
    : scoreLabel(score)
  const totalBytes = insights?.total_bytes || 0
  const fileCount = readiness?.file_count ?? insights?.total_files ?? summary?.file_count ?? 0
  const functionCount =
    readiness?.function_count ?? insights?.function_count ?? summary?.function_count ?? 0
  const classCount = readiness?.class_count ?? insights?.class_count ?? summary?.class_count ?? 0
  const maxContributor = Math.max(...(insights?.contributors || []).map((c) => c.contributions), 1)

  return (
    <div className="space-y-10">
      {/* 1 — At a glance */}
      <section className="space-y-4">
        <SectionLabel step="01" title="At a glance" desc="Readiness and repository identity" />
        <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-2xl border bg-card p-5">
            <ScoreRing score={score} label={readinessLabel.label} detail={readinessLabel.detail} />
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Metric icon={FileCode2} label="Files" value={fileCount} />
              <Metric icon={GitBranch} label="Functions" value={functionCount} />
              <Metric icon={BookOpen} label="Classes" value={classCount} />
              <Metric
                icon={Layers}
                label="Embeddings"
                value={readiness?.embedding_count ?? insights?.embedding_count ?? 0}
              />
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-3">
              <ArtifactPill
                ready={readiness?.has_overview ?? !!insights?.artifacts?.overview}
                label="AI overview"
              />
              <ArtifactPill
                ready={readiness?.has_diagram ?? !!insights?.artifacts?.diagram}
                label="Diagram"
              />
              <ArtifactPill
                ready={readiness?.has_docs ?? !!insights?.artifacts?.docs}
                label="Docs"
              />
            </div>
            {readiness && (
              <p className="mt-3 text-xs text-muted-foreground">
                Index coverage {Math.round(readiness.coverage_pct)}%
                {(readiness.dead_end_files?.length || 0) > 0
                  ? ` · ${readiness.dead_end_files!.length} dead-end files`
                  : ""}
              </p>
            )}
          </div>

          <div className="rounded-2xl border bg-gradient-to-br from-teal-950 via-zinc-900 to-zinc-950 p-5 text-zinc-50">
            <div className="mb-3 flex justify-end">
              <button
                type="button"
                onClick={() => {
                  void refreshSection("meta")
                  void refreshSection("pulls")
                }}
                disabled={loadingSection.meta || loadingSection.pulls}
                className="inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-white/5 px-2 py-1 text-xs text-zinc-300 transition hover:bg-white/10 disabled:opacity-50"
              >
                <RefreshCw
                  className={`size-3.5 ${loadingSection.meta || loadingSection.pulls ? "animate-spin" : ""}`}
                />
                Refresh
              </button>
            </div>
            {github ? (
              <div className="flex h-full flex-col">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-teal-300/80">
                    Repository
                  </p>
                  {github.visibility && (
                    <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] capitalize">
                      {github.visibility}
                    </span>
                  )}
                  {github.archived && (
                    <span className="rounded-md bg-amber-500/20 px-1.5 py-0.5 text-[10px] text-amber-200">
                      archived
                    </span>
                  )}
                  {github.fork && (
                    <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px]">fork</span>
                  )}
                </div>
                <a
                  href={github.html_url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-2 text-xl font-semibold tracking-tight hover:underline"
                >
                  {github.full_name}
                  <ExternalLink className="size-4 opacity-70" />
                </a>
                {github.description && (
                  <p className="mt-2 line-clamp-3 text-sm text-zinc-300">{github.description}</p>
                )}
                {github.topics && github.topics.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {github.topics.slice(0, 8).map((t) => (
                      <span key={t} className="rounded-md bg-white/10 px-2 py-0.5 text-[11px] text-zinc-200">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-auto grid grid-cols-2 gap-3 pt-5 sm:grid-cols-4">
                  <RepoStat icon={Star} label="Stars" value={github.stars} />
                  <RepoStat icon={GitFork} label="Forks" value={github.forks} />
                  <RepoStat icon={GitCommit} label="Issues" value={github.open_issues} />
                  <RepoStat icon={GitPullRequest} label="Open PRs" value={insights?.open_prs ?? 0} />
                </div>
                {insights?.open_prs_error && (
                  <p className="mt-2 text-[11px] text-amber-200/90">{insights.open_prs_error}</p>
                )}
                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-zinc-400">
                  {github.license && (
                    <span className="inline-flex items-center gap-1">
                      <Scale className="size-3" /> {github.license}
                    </span>
                  )}
                  {github.default_branch && <span>Branch {github.default_branch}</span>}
                  {github.size_kb != null && <span>{formatBytes(github.size_kb * 1024)} on GitHub</span>}
                  {totalBytes > 0 && <span>{formatBytes(totalBytes)} indexed</span>}
                  {github.pushed_at && <span>Pushed {new Date(github.pushed_at).toLocaleDateString()}</span>}
                  {github.created_at && <span>Created {new Date(github.created_at).toLocaleDateString()}</span>}
                </div>
                {github.homepage && (
                  <a
                    href={github.homepage.startsWith("http") ? github.homepage : `https://${github.homepage}`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 truncate text-xs text-teal-300 hover:underline"
                  >
                    {github.homepage}
                  </a>
                )}
              </div>
            ) : loadingSection.meta ? (
              <div className="flex h-full flex-col justify-center">
                <p className="text-sm text-zinc-400">Loading repository metadata…</p>
              </div>
            ) : (
              <div className="flex h-full flex-col justify-center">
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-teal-300/80">
                  Repository
                </p>
                <p className="mt-2 text-lg font-semibold">GitHub metadata unavailable</p>
                <p className="mt-2 text-sm text-zinc-400">
                  {insights?.github_error ||
                    "Public repo stats appear here after analysis. Private repos may need auth."}
                </p>
                <button
                  type="button"
                  onClick={() => void refreshSection("meta")}
                  className="mt-4 inline-flex w-fit items-center gap-1.5 rounded-md border border-white/15 px-2.5 py-1.5 text-xs text-zinc-200 hover:bg-white/10"
                >
                  <RefreshCw className="size-3.5" />
                  Try again
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 2 — Understand the project */}
      <section className="space-y-4">
        <SectionLabel step="02" title="Understand the project" desc="AI briefing and README — start here" />
        <div className="grid gap-4 xl:grid-cols-2">
          <Panel title="AI briefing" subtitle="Generated during repository analysis">
            <div className="relative overflow-hidden rounded-xl border bg-muted/30 p-4">
              <div
                className="pointer-events-none absolute -right-8 -top-8 size-28 rounded-full opacity-30"
                style={{
                  background:
                    "radial-gradient(circle, oklch(0.7 0.12 180 / 0.5), transparent 70%)",
                }}
              />
              <div className="relative">
                {summary?.overview || summary?.summary ? (
                  <MarkdownBody content={summary.overview || summary.summary || ""} />
                ) : (
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    Run analysis to generate an AI overview of architecture, entry points, and purpose.
                  </p>
                )}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Activity className="size-3" />
                {insights?.chat_count ?? 0} chat messages
              </span>
              {insights?.last_job_status && (
                <span>
                  Last job: {insights.last_job_status}
                  {insights.last_job_at
                    ? ` · ${new Date(insights.last_job_at).toLocaleString()}`
                    : ""}
                </span>
              )}
            </div>
          </Panel>

          <Panel
            title="README"
            subtitle="Excerpt from the repository root"
            onRefresh={() => void refreshSection("readme")}
            refreshing={loadingSection.readme}
          >
            {insights?.readme?.excerpt ? (
              <div>
                <div className="mb-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                  <span className="font-mono">{insights.readme.path || insights.readme.name}</span>
                  {insights.readme.url && (
                    <a
                      href={insights.readme.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 hover:text-foreground"
                    >
                      View <ExternalLink className="size-3" />
                    </a>
                  )}
                </div>
                <div className="rounded-xl border bg-muted/30 p-3">
                  <MarkdownBody content={insights.readme.excerpt} />
                </div>
              </div>
            ) : insights?.readme_error ? (
              <GithubError
                message={insights.readme_error}
                onRetry={() => void refreshSection("readme")}
                refreshing={loadingSection.readme}
                tokenConfigured={insights.github_token_configured}
              />
            ) : loadingSection.readme ? (
              <EmptyState text="Loading README…" />
            ) : (
              <EmptyState text="No README found on GitHub for this repo." />
            )}
          </Panel>
        </div>
      </section>

      {/* 3 — Activity & people */}
      <section className="space-y-4">
        <SectionLabel step="03" title="Activity & people" desc="Recent commits and who builds this" />
        <div className="grid items-stretch gap-4 xl:grid-cols-[1.15fr_0.85fr]">
          <Panel
            className="h-full min-h-[28rem]"
            title="Contribution pulse"
            subtitle="Recent commit density from GitHub"
            onRefresh={() => void refreshSection("commits")}
            refreshing={loadingSection.commits}
          >
            <div className="flex h-full min-h-0 flex-col gap-5">
              <CommitHeatmap commits={heatCommits} />
              {commitActivity.length > 0 && (
                <div className="shrink-0">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Commits by day
                  </p>
                  <ActivitySparks data={commitActivity} />
                </div>
              )}
              {commits.length > 0 ? (
                <ul className="min-h-0 flex-1 space-y-0 overflow-y-auto overscroll-contain rounded-xl border">
                  {commits.slice(0, 10).map((c, i) => (
                    <li key={c.sha} className={`flex gap-3 px-3 py-2.5 ${i > 0 ? "border-t" : ""}`}>
                      <div className="mt-1 size-2 shrink-0 rounded-full bg-teal-500" />
                      <div className="min-w-0 flex-1">
                        <a
                          href={c.url}
                          target="_blank"
                          rel="noreferrer"
                          className="line-clamp-1 text-sm font-medium hover:underline"
                        >
                          {c.message}
                        </a>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {c.login || c.author} · {new Date(c.date).toLocaleString()} ·{" "}
                          <span className="font-mono">{c.sha.slice(0, 7)}</span>
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <GithubError
                  message={
                    insights?.commits_error ||
                    "Commit history unavailable (private repo or rate limit)."
                  }
                  onRetry={() => void refreshSection("commits")}
                  refreshing={loadingSection.commits}
                  tokenConfigured={insights?.github_token_configured}
                />
              )}
            </div>
          </Panel>

          <Panel
            className="h-full min-h-[28rem]"
            title="Contributors"
            subtitle="GitHub contribution leaders"
            onRefresh={() => void refreshSection("contributors")}
            refreshing={loadingSection.contributors}
          >
            {loadingSection.contributors && !insights?.contributors?.length && !insights?.contributors_error ? (
              <EmptyState text="Loading contributors…" />
            ) : (insights?.contributors || []).length === 0 ? (
              <GithubError
                message={insights?.contributors_error || "Contributor list unavailable."}
                onRetry={() => void refreshSection("contributors")}
                refreshing={loadingSection.contributors}
                tokenConfigured={insights?.github_token_configured}
              />
            ) : (
              <ul className="h-full min-h-0 space-y-2.5 overflow-y-auto overscroll-contain">
                {(insights?.contributors || []).slice(0, 10).map((c, i) => (
                  <li key={c.login} className="flex items-center gap-3">
                    {c.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.avatar_url} alt="" className="size-7 rounded-full" />
                    ) : (
                      <div className="flex size-7 items-center justify-center rounded-full bg-muted">
                        <Users className="size-3.5 text-muted-foreground" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <a
                        href={c.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm font-medium hover:underline"
                      >
                        {c.login}
                      </a>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${(c.contributions / maxContributor) * 100}%`,
                            background: CHART_PALETTE[i % CHART_PALETTE.length],
                          }}
                        />
                      </div>
                    </div>
                    <span className="shrink-0 tabular-nums text-xs text-muted-foreground">
                      {c.contributions}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <Panel
          title="Releases"
          subtitle="Published tags from GitHub"
          onRefresh={() => void refreshSection("releases")}
          refreshing={loadingSection.releases}
        >
          {(insights?.releases || []).length > 0 ? (
            <ul className="space-y-2">
              {(insights?.releases || []).map((r) => (
                <li key={r.tag} className="flex items-start justify-between gap-3 rounded-lg border px-3 py-2">
                  <div className="min-w-0">
                    <a href={r.url} target="_blank" rel="noreferrer" className="text-sm font-medium hover:underline">
                      {r.name || r.tag}
                    </a>
                    <p className="text-[11px] text-muted-foreground">
                      {r.tag}
                      {r.published_at ? ` · ${new Date(r.published_at).toLocaleDateString()}` : ""}
                      {r.prerelease ? " · prerelease" : ""}
                    </p>
                  </div>
                  <Box className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                </li>
              ))}
            </ul>
          ) : insights?.releases_error ? (
            <GithubError
              message={insights.releases_error}
              onRetry={() => void refreshSection("releases")}
              refreshing={loadingSection.releases}
              tokenConfigured={insights.github_token_configured}
            />
          ) : (
            <p className="text-sm text-muted-foreground">No published releases found.</p>
          )}
          {(insights?.recent_authors || []).length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Recent commit authors
              </p>
              <div className="flex flex-wrap gap-1.5">
                {(insights?.recent_authors || []).slice(0, 8).map((a) => (
                  <span
                    key={a.name}
                    className="rounded-md bg-muted px-2 py-1 text-xs text-muted-foreground"
                  >
                    {a.name} · {a.count}
                  </span>
                ))}
              </div>
            </div>
          )}
        </Panel>
      </section>
      {/* 4 — Tech stack */}
      <section className="space-y-4">
        <SectionLabel step="04" title="Tech stack" desc="How the codebase is composed" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Indexed languages" subtitle="From CodeExp analysis of cloned files">
            {languageData.length === 0 ? (
              <EmptyState text="Run analysis to see indexed language distribution." />
            ) : (
              <LanguageMix data={languageData} />
            )}
          </Panel>
          <Panel
            title="GitHub languages"
            subtitle="Official GitHub linguist breakdown"
            onRefresh={() => void refreshSection("languages")}
            refreshing={loadingSection.languages}
          >
            {loadingSection.languages && !insights?.github_languages?.length && !insights?.github_languages_error ? (
              <EmptyState text="Loading GitHub languages…" />
            ) : insights?.github_languages_error ? (
              <GithubError
                message={insights.github_languages_error}
                onRetry={() => void refreshSection("languages")}
                refreshing={loadingSection.languages}
                tokenConfigured={insights.github_token_configured}
              />
            ) : githubLangData.length === 0 ? (
              <EmptyState text="No GitHub language data returned for this repo." />
            ) : (
              <LanguageMix data={githubLangData} valueLabel="share" />
            )}
          </Panel>
        </div>
        <Panel title="Key files" subtitle="Manifests, entrypoints, configs, README — the map to start reading">
          {(insights?.key_files || []).length === 0 ? (
            <EmptyState text="No key files detected yet." />
          ) : (
            <ul className="grid gap-0 overflow-hidden rounded-xl border sm:grid-cols-2">
              {(insights?.key_files || []).map((f, i) => (
                <li
                  key={f.path}
                  className={`flex items-center gap-3 px-3 py-2 ${i > 0 ? "border-t sm:border-t-0" : ""} ${
                    i % 2 === 1 ? "sm:border-l" : ""
                  } ${i >= 2 ? "sm:border-t" : ""}`}
                >
                  <span className="w-16 shrink-0 rounded-md bg-muted px-1.5 py-0.5 text-center text-[10px] font-medium text-muted-foreground">
                    {KIND_LABEL[f.kind] || f.kind}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-xs">{f.path}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {f.language} · {formatBytes(f.size_bytes)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </section>

      {/* 5 — Structure */}
      <section className="space-y-4">
        <SectionLabel step="05" title="Structure" desc="Where code lives and what weighs the most" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Top folders" subtitle="Where most indexed files live">
            {folderData.length === 0 ? (
              <EmptyState text="Folder breakdown appears after indexing." />
            ) : (
              <DonutChart data={folderData} />
            )}
          </Panel>
          <Panel title="File extensions" subtitle="Surface-level file type mix">
            {extensionData.length === 0 ? (
              <EmptyState text="Extension breakdown appears after indexing." />
            ) : (
              <DonutChart data={extensionData} />
            )}
          </Panel>
        </div>
        <Panel title="Largest files" subtitle="Top heaviest indexed paths">
          {(insights?.largest_files || []).length === 0 ? (
            <EmptyState text="Largest files appear after indexing." />
          ) : (
            <ul className="divide-y overflow-hidden rounded-xl border">
              {(insights?.largest_files || []).slice(0, 5).map((f) => (
                <li key={f.path} className="flex items-center justify-between gap-3 px-3 py-1.5 text-xs">
                  <span className="min-w-0 truncate font-mono text-muted-foreground">{f.path}</span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {formatBytes(f.size_bytes)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </section>

      {/* 6 — Code map */}
      <section className="space-y-4">
        <SectionLabel step="06" title="Code map" desc="Notable symbols found during analysis" />
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Notable functions" subtitle="Sample of indexed function symbols">
            {(insights?.top_functions || []).length === 0 ? (
              <EmptyState text="Functions appear after analysis parses the codebase." />
            ) : (
              <ul className="max-h-72 space-y-0 overflow-y-auto rounded-xl border">
                {(insights?.top_functions || []).slice(0, 14).map((f, i) => (
                  <li key={`${f.path}-${f.name}-${i}`} className={`px-3 py-2 ${i > 0 ? "border-t" : ""}`}>
                    <p className="font-mono text-xs font-medium">
                      <span className="text-teal-700 dark:text-teal-400">ƒ</span> {f.name}
                      {f.start_line ? (
                        <span className="text-muted-foreground">:{f.start_line}</span>
                      ) : null}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{f.path}</p>
                    {f.signature && (
                      <p className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground/80">
                        {f.signature}
                      </p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <Panel title="Notable classes" subtitle="Sample of indexed class / type symbols">
            {(insights?.top_classes || []).length === 0 ? (
              <EmptyState text="Classes appear after analysis parses the codebase." />
            ) : (
              <ul className="max-h-72 space-y-0 overflow-y-auto rounded-xl border">
                {(insights?.top_classes || []).slice(0, 14).map((c, i) => (
                  <li key={`${c.path}-${c.name}-${i}`} className={`px-3 py-2 ${i > 0 ? "border-t" : ""}`}>
                    <p className="font-mono text-xs font-medium">
                      <span className="text-blue-700 dark:text-blue-400">C</span> {c.name}
                      {c.start_line ? (
                        <span className="text-muted-foreground">:{c.start_line}</span>
                      ) : null}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-muted-foreground">{c.path}</p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </section>

    </div>
  )
}

function SectionLabel({
  step,
  title,
  desc,
}: {
  step: string
  title: string
  desc: string
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-2 border-b pb-3">
      <div>
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          {step}
        </p>
        <h2 className="mt-0.5 text-lg font-semibold tracking-tight">{title}</h2>
      </div>
      <p className="max-w-md text-right text-xs text-muted-foreground">{desc}</p>
    </div>
  )
}


function ArtifactPill({ ready, label }: { ready: boolean; label: string }) {
  return (
    <div
      className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs ${
        ready
          ? "border-teal-500/30 bg-teal-500/10 text-teal-800 dark:text-teal-300"
          : "bg-muted/40 text-muted-foreground"
      }`}
    >
      {ready ? <CheckCircle2 className="size-3.5" /> : <CircleDashed className="size-3.5" />}
      {label}
    </div>
  )
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number
}) {
  return (
    <div className="rounded-xl border bg-background/60 px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Icon className="size-3.5" />
        <span className="text-[11px] uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-1 text-xl font-semibold tabular-nums tracking-tight">{value}</p>
    </div>
  )
}

function RepoStat({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: number
}) {
  return (
    <div>
      <div className="flex items-center gap-1 text-[11px] text-zinc-400">
        <Icon className="size-3" />
        {label}
      </div>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value.toLocaleString()}</p>
    </div>
  )
}

function Panel({
  title,
  subtitle,
  children,
  onRefresh,
  refreshing,
  className,
}: {
  title: string
  subtitle?: string
  children: React.ReactNode
  onRefresh?: () => void
  refreshing?: boolean
  className?: string
}) {
  return (
    <section className={`flex flex-col rounded-2xl border bg-card p-5 ${className || ""}`}>
      <header className="mb-4 flex shrink-0 items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-medium tracking-tight">{title}</h3>
          {subtitle && <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>}
        </div>
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2 py-1 text-xs text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50"
          >
            <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        )}
      </header>
      <div className="min-h-0 flex-1">{children}</div>
    </section>
  )
}

function GithubError({
  message,
  onRetry,
  refreshing,
  tokenConfigured,
}: {
  message: string
  onRetry?: () => void
  refreshing?: boolean
  tokenConfigured?: boolean
}) {
  const rateLimited = /rate limit|403|429/i.test(message)
  return (
    <div className="space-y-3 rounded-xl border border-dashed border-amber-500/40 bg-amber-500/5 px-4 py-4">
      <p className="text-sm text-amber-800 dark:text-amber-200">{message}</p>
      {rateLimited && (
        <p className="text-xs text-muted-foreground">
          Unauthenticated GitHub allows ~60 requests/hour. Add a personal access token in{" "}
          <a href="/settings" className="underline underline-offset-2 hover:text-foreground">
            Settings
          </a>
          {tokenConfigured ? " (token detected)" : ""}, then Refresh this panel.
        </p>
      )}
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          disabled={refreshing}
          className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium transition hover:bg-muted disabled:opacity-50"
        >
          <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} />
          Try again
        </button>
      )}
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex min-h-28 items-center justify-center rounded-xl border border-dashed px-4 text-center text-sm text-muted-foreground">
      {text}
    </div>
  )
}
