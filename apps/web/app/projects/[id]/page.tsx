"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation"
import { MessageSquare, RefreshCw } from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { CodeViewer } from "@/components/code-viewer"
import { ExplorePanel } from "@/components/explore-panel"
import { FileTree } from "@/components/file-tree"
import { MermaidDiagram } from "@/components/mermaid-diagram"
import { MarkdownBody } from "@/components/markdown-body"
import { ProjectOverview } from "@/components/project-overview"
import {
  api,
  type FileRecord,
  type Job,
  type Project,
  type ProjectInsights,
  type ProjectSummary,
} from "@/lib/api"
import { useWorkspace } from "@/lib/workspace"
import { Button } from "@workspace/ui/components/button"

type Tab = "overview" | "files" | "explore" | "diagram" | "docs"

function structuralMermaid(
  nodes: Array<{ id: string; label: string; type: string }>
): string {
  const safe = (s: string) =>
    s.replace(/["\[\]]/g, "").replace(/\s+/g, " ").trim().slice(0, 40) || "item"
  const files = nodes.filter((n) => n.type === "file").slice(0, 12)
  const byFile = new Map<string, Array<{ label: string; type: string }>>()
  for (const n of nodes) {
    if (n.type === "file") continue
    const filePath = n.id.includes("::") ? n.id.split("::")[0] : ""
    if (!filePath) continue
    const list = byFile.get(filePath) || []
    if (list.length < 5) list.push({ label: n.label, type: n.type })
    byFile.set(filePath, list)
  }

  const lines = ["flowchart TB"]
  files.forEach((f, i) => {
    const sid = `f${i}`
    const short = safe(f.label.split("/").slice(-2).join("/"))
    lines.push(`  subgraph ${sid}["${short}"]`)
    const kids = byFile.get(f.label) || []
    kids.forEach((k, j) => {
      const nid = `${sid}n${j}`
      const label = safe(k.label)
      if (k.type === "class") {
        lines.push(`    ${nid}["${label}"]`)
      } else {
        lines.push(`    ${nid}("${label}")`)
      }
    })
    if (kids.length === 0) {
      lines.push(`    ${sid}empty(["…"])`)
    }
    lines.push("  end")
  })
  for (let i = 0; i < files.length - 1; i++) {
    lines.push(`  f${i} --> f${i + 1}`)
  }
  return lines.join("\n")
}

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params.id
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { setActiveProjectId, openAsk } = useWorkspace()

  const tabParam = searchParams.get("tab") as Tab | null
  const pathParam = searchParams.get("path")
  const lineParam = searchParams.get("line")

  const [tab, setTabState] = useState<Tab>(
    tabParam && ["overview", "files", "explore", "diagram", "docs"].includes(tabParam)
      ? tabParam
      : "overview"
  )
  const [project, setProject] = useState<Project | null>(null)
  const [summary, setSummary] = useState<ProjectSummary | null>(null)
  const [insights, setInsights] = useState<ProjectInsights | null>(null)
  const [files, setFiles] = useState<FileRecord[]>([])
  const [selectedPath, setSelectedPath] = useState<string | null>(pathParam)
  const [focusLine, setFocusLine] = useState<number | null>(
    lineParam && !Number.isNaN(Number(lineParam)) ? Number(lineParam) : null
  )
  const [jobs, setJobs] = useState<Job[]>([])
  const [docs, setDocs] = useState("")
  const [docsStatus, setDocsStatus] = useState("")
  const [diagram, setDiagram] = useState<{
    format: string
    content?: string
    nodes?: Array<{ id: string; label: string; type: string }>
  } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const setTab = useCallback(
    (next: Tab) => {
      setTabState(next)
      const q = new URLSearchParams(searchParams.toString())
      q.set("tab", next)
      if (next !== "files") {
        q.delete("path")
        q.delete("line")
      } else if (selectedPath) {
        q.set("path", selectedPath)
        if (focusLine) q.set("line", String(focusLine))
      }
      router.replace(`${pathname}?${q.toString()}`, { scroll: false })
    },
    [router, pathname, searchParams, selectedPath, focusLine]
  )

  const openFile = useCallback(
    (path: string, line?: number) => {
      setSelectedPath(path)
      setFocusLine(line ?? null)
      setTabState("files")
      const q = new URLSearchParams(searchParams.toString())
      q.set("tab", "files")
      q.set("path", path)
      if (line) q.set("line", String(line))
      else q.delete("line")
      router.replace(`${pathname}?${q.toString()}`, { scroll: false })
    },
    [router, pathname, searchParams]
  )

  useEffect(() => {
    setActiveProjectId(id)
  }, [id, setActiveProjectId])

  useEffect(() => {
    if (pathParam) setSelectedPath(pathParam)
    if (lineParam && !Number.isNaN(Number(lineParam))) setFocusLine(Number(lineParam))
    if (tabParam && ["overview", "files", "explore", "diagram", "docs"].includes(tabParam)) {
      setTabState(tabParam)
    }
  }, [pathParam, lineParam, tabParam])

  const refresh = useCallback(async () => {
    try {
      const [p, s, j, ins] = await Promise.all([
        api.getProject(id),
        api.getSummary(id).catch(() => null),
        api.getStatus(id).catch(() => ({ jobs: [] as Job[] })),
        api.getInsights(id).catch(() => null),
      ])
      setProject(p)
      setSummary(s)
      setJobs(j.jobs || [])
      setInsights(ins)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load project")
    }
  }, [id])

  useEffect(() => {
    void refresh()
  }, [refresh])

  // Poll job/project status only — do not re-fetch insights (would wipe GitHub panels).
  useEffect(() => {
    const timer = setInterval(() => {
      void api.getStatus(id).then((j) => setJobs(j.jobs || [])).catch(() => undefined)
      void api
        .getProject(id)
        .then((p) => {
          setProject((prev) => {
            // When analysis finishes, refresh local summary/insights once
            if (prev && prev.status === "analyzing" && p.status !== "analyzing") {
              void api.getSummary(id).then(setSummary).catch(() => undefined)
              void api.getInsights(id).then(setInsights).catch(() => undefined)
            }
            return p
          })
        })
        .catch(() => undefined)
      if (project?.status === "analyzing") {
        void api.getSummary(id).then(setSummary).catch(() => undefined)
      }
    }, 5000)
    return () => clearInterval(timer)
  }, [id, project?.status])

  useEffect(() => {
    if (tab === "files") {
      void api
        .getFiles(id)
        .then((r) => {
          const list = r.files || []
          setFiles(list)
          if (!selectedPath && list[0]) setSelectedPath(list[0].path)
        })
        .catch((e) => setError(e.message))
    }
    if (tab === "docs") {
      void api
        .getDocs(id)
        .then((r) => {
          setDocs(r.content || "")
          setDocsStatus(r.status || (r.content ? "ready" : "missing"))
        })
        .catch((e) => setError(e.message))
    }
    if (tab === "diagram") {
      void api.getDiagram(id).then(setDiagram).catch((e) => setError(e.message))
    }
  }, [tab, id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function runAnalysis() {
    setBusy(true)
    setError(null)
    try {
      await api.analyzeProject(id, true)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analyze failed")
    } finally {
      setBusy(false)
    }
  }

  async function generateDocs() {
    setBusy(true)
    setError(null)
    try {
      const res = await api.generateDocs(id, true)
      setDocs(res.content || "")
      setDocsStatus("ready")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Docs generation failed")
    } finally {
      setBusy(false)
    }
  }

  const latestJob = [...jobs].sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
  )[0]

  return (
    <AppShell title={project?.name || "Project"}>
      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}{" "}
          {error.toLowerCase().includes("api key") && (
            <Link href="/settings" className="underline">
              Open Settings
            </Link>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <p className="truncate text-sm text-muted-foreground">{project?.repo_url}</p>
          <p className="text-sm">
            Status: <span className="font-medium capitalize">{project?.status || "…"}</span>
            {latestJob && (
              <span className="ml-3 text-muted-foreground">
                Job {latestJob.status} · {latestJob.progress}%
                {latestJob.error_message ? ` — ${latestJob.error_message}` : ""}
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => openAsk(id)}>
            <MessageSquare className="size-4" />
            Ask AI
          </Button>
          <Button onClick={runAnalysis} disabled={busy}>
            <RefreshCw className={`size-4 ${busy ? "animate-spin" : ""}`} />
            {busy ? "Working…" : "Re-analyze"}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 border-b">
        {(
          [
            ["overview", "Overview"],
            ["files", "Code"],
            ["explore", "Explore"],
            ["diagram", "Diagram"],
            ["docs", "Docs"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`relative px-3 py-2.5 text-sm transition-colors ${
              tab === key
                ? "font-medium text-foreground after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <ProjectOverview projectId={id} summary={summary} insights={insights} />
      )}

      {tab === "explore" && <ExplorePanel projectId={id} onOpenFile={openFile} />}

      {tab === "files" && (
        <div className="grid h-[calc(100svh-13.5rem)] min-h-[420px] overflow-hidden rounded-xl border lg:grid-cols-[280px_1fr]">
          <div className="flex min-h-0 flex-col border-b bg-muted/20 lg:border-b-0 lg:border-r">
            <div className="shrink-0 border-b px-3 py-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Files ({files.length})
              </p>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <FileTree
                files={files}
                selectedPath={selectedPath}
                onSelect={(path) => openFile(path)}
              />
            </div>
          </div>
          <div className="min-h-0 overflow-hidden bg-card">
            <CodeViewer projectId={id} path={selectedPath} focusLine={focusLine} />
          </div>
        </div>
      )}

      {tab === "diagram" && (
        <div className="flex h-[calc(100svh-13.5rem)] min-h-[420px] flex-col overflow-hidden rounded-xl border bg-card">
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
            <div>
              <h3 className="font-medium">Architecture diagram</h3>
              <p className="text-xs text-muted-foreground">
                {diagram?.format === "mermaid"
                  ? "AI-generated module map — scroll or zoom to explore"
                  : "Structural map from indexed symbols"}
              </p>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-hidden">
            {diagram?.format === "mermaid" && diagram.content ? (
              <MermaidDiagram chart={diagram.content} />
            ) : diagram?.nodes && diagram.nodes.length > 0 ? (
              <MermaidDiagram
                chart={structuralMermaid(diagram.nodes)}
                caption="Fallback from indexed classes and functions"
              />
            ) : (
              <div className="flex h-full items-center justify-center p-6">
                <p className="max-w-sm text-center text-sm text-muted-foreground">
                  No diagram yet. Run AI analysis to generate a Mermaid architecture diagram.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "docs" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              {docsStatus === "ready"
                ? "AI-generated documentation"
                : "Documentation is generated on request using your API key."}
            </p>
            <Button onClick={generateDocs} disabled={busy}>
              {busy ? "Generating…" : docs ? "Regenerate docs" : "Generate docs"}
            </Button>
          </div>
          <div className="rounded-xl border bg-card p-5">
            {docs ? (
              <MarkdownBody content={docs} className="max-h-[calc(100svh-14rem)]" />
            ) : (
              <p className="text-sm text-muted-foreground">No documentation yet.</p>
            )}
          </div>
        </div>
      )}
    </AppShell>
  )
}
