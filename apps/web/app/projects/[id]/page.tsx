"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { MessageSquare, RefreshCw } from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { CodeViewer } from "@/components/code-viewer"
import { FileTree } from "@/components/file-tree"
import { MermaidDiagram } from "@/components/mermaid-diagram"
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

type Tab = "overview" | "files" | "diagram" | "docs"

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params.id
  const { setActiveProjectId, openAsk } = useWorkspace()

  const [tab, setTab] = useState<Tab>("overview")
  const [project, setProject] = useState<Project | null>(null)
  const [summary, setSummary] = useState<ProjectSummary | null>(null)
  const [insights, setInsights] = useState<ProjectInsights | null>(null)
  const [files, setFiles] = useState<FileRecord[]>([])
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
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

  useEffect(() => {
    setActiveProjectId(id)
  }, [id, setActiveProjectId])

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
    const timer = setInterval(() => {
      void api.getStatus(id).then((j) => setJobs(j.jobs || [])).catch(() => undefined)
      void api.getProject(id).then(setProject).catch(() => undefined)
      if (project?.status === "analyzing" || project?.status === "completed") {
        void api.getSummary(id).then(setSummary).catch(() => undefined)
        // Local insights only on poll — GitHub sections refresh independently in Overview
        void api.getInsights(id).then(setInsights).catch(() => undefined)
      }
    }, 5000)
    return () => clearInterval(timer)
  }, [id, refresh, project?.status])

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

      {tab === "files" && (
        <div className="grid min-h-[560px] overflow-hidden rounded-xl border lg:grid-cols-[280px_1fr]">
          <div className="border-b bg-muted/20 lg:border-b-0 lg:border-r">
            <div className="border-b px-3 py-2">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Files ({files.length})
              </p>
            </div>
            <div className="max-h-[280px] overflow-y-auto lg:max-h-[calc(100vh-280px)]">
              <FileTree files={files} selectedPath={selectedPath} onSelect={setSelectedPath} />
            </div>
          </div>
          <div className="min-h-[360px] bg-card">
            <CodeViewer projectId={id} path={selectedPath} />
          </div>
        </div>
      )}

      {tab === "diagram" && (
        <div className="rounded-xl border bg-card p-4">
          <h3 className="mb-3 font-medium">Architecture diagram</h3>
          {diagram?.format === "mermaid" && diagram.content ? (
            <MermaidDiagram chart={diagram.content} />
          ) : diagram?.nodes && diagram.nodes.length > 0 ? (
            <ul className="space-y-1 text-sm">
              {diagram.nodes
                .filter((n) => n.type !== "file")
                .slice(0, 80)
                .map((n) => (
                  <li key={n.id} className="font-mono text-xs">
                    <span className="text-muted-foreground">[{n.type}]</span> {n.label}
                  </li>
                ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">
              No diagram yet. Run AI analysis to generate a Mermaid architecture diagram.
            </p>
          )}
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
          <pre className="overflow-auto whitespace-pre-wrap rounded-xl border bg-card p-4 font-mono text-sm leading-relaxed">
            {docs || "No documentation yet."}
          </pre>
        </div>
      )}
    </AppShell>
  )
}
