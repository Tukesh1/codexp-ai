"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { AppShell } from "@/components/app-shell"
import { MermaidDiagram } from "@/components/mermaid-diagram"
import { api, type FileRecord, type Job, type Project, type ProjectSummary } from "@/lib/api"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"

type Tab = "overview" | "files" | "qa" | "docs" | "diagram"

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params.id

  const [tab, setTab] = useState<Tab>("overview")
  const [project, setProject] = useState<Project | null>(null)
  const [summary, setSummary] = useState<ProjectSummary | null>(null)
  const [files, setFiles] = useState<FileRecord[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [docs, setDocs] = useState("")
  const [docsStatus, setDocsStatus] = useState<string>("")
  const [diagram, setDiagram] = useState<{
    format: string
    content?: string
    nodes?: Array<{ id: string; label: string; type: string }>
    edges?: Array<{ from: string; to: string }>
  } | null>(null)
  const [question, setQuestion] = useState("")
  const [answer, setAnswer] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const [p, s, j] = await Promise.all([
        api.getProject(id),
        api.getSummary(id).catch(() => null),
        api.getStatus(id).catch(() => ({ jobs: [] as Job[] })),
      ])
      setProject(p)
      setSummary(s)
      setJobs(j.jobs || [])
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
      }
    }, 4000)
    return () => clearInterval(timer)
  }, [id, refresh, project?.status])

  useEffect(() => {
    if (tab === "files") {
      void api.getFiles(id).then((r) => setFiles(r.files || [])).catch((e) => setError(e.message))
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
      void api.getDiagram(id).then((r) => setDiagram(r)).catch((e) => setError(e.message))
    }
  }, [tab, id])

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

  async function ask() {
    if (!question.trim()) return
    setBusy(true)
    setError(null)
    try {
      const res = await api.ask(id, question)
      setAnswer(res.answer)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Q&A failed")
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

  const overviewText = summary?.overview || summary?.summary

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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{project?.repo_url}</p>
          <p className="mt-1 text-sm">
            Status: <span className="font-medium capitalize">{project?.status || "…"}</span>
            {latestJob && (
              <span className="ml-3 text-muted-foreground">
                Job {latestJob.status} · {latestJob.progress}%
                {latestJob.error_message ? ` — ${latestJob.error_message}` : ""}
              </span>
            )}
          </p>
        </div>
        <Button onClick={runAnalysis} disabled={busy}>
          {busy ? "Working…" : "Re-analyze with AI"}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 border-b pb-2">
        {(
          [
            ["overview", "Overview"],
            ["files", "Files"],
            ["diagram", "Diagram"],
            ["docs", "Docs"],
            ["qa", "Q&A"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`rounded-md px-3 py-1.5 text-sm transition-colors ${
              tab === key ? "bg-primary text-primary-foreground" : "hover:bg-muted"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Files" value={summary?.file_count ?? 0} />
          <Metric label="Functions" value={summary?.function_count ?? 0} />
          <Metric label="Classes" value={summary?.class_count ?? 0} />
          <Metric label="Languages" value={Object.keys(summary?.languages || {}).length} />
          <div className="rounded-xl border bg-card p-4 sm:col-span-2 lg:col-span-4">
            <h3 className="font-medium">AI Overview</h3>
            <div className="mt-3 whitespace-pre-wrap text-sm text-muted-foreground">
              {overviewText ||
                (project?.status === "analyzing"
                  ? "AI is analyzing this repository…"
                  : "Run analysis to generate an AI overview.")}
            </div>
            {summary?.languages && (
              <div className="mt-4 flex flex-wrap gap-2">
                {Object.entries(summary.languages).map(([lang, count]) => (
                  <span key={lang} className="rounded-full bg-muted px-2.5 py-1 text-xs">
                    {lang}: {count}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {tab === "files" && (
        <div className="overflow-hidden rounded-xl border">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium">Path</th>
                <th className="px-4 py-3 font-medium">Language</th>
                <th className="px-4 py-3 font-medium">Size</th>
              </tr>
            </thead>
            <tbody>
              {files.map((f) => (
                <tr key={f.id} className="border-t">
                  <td className="px-4 py-2 font-mono text-xs">{f.path}</td>
                  <td className="px-4 py-2 capitalize">{f.language || "—"}</td>
                  <td className="px-4 py-2 text-muted-foreground">
                    {f.size_bytes != null ? `${f.size_bytes} B` : "—"}
                  </td>
                </tr>
              ))}
              {files.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                    No files yet. Start an analysis.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
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
          <pre className="overflow-auto whitespace-pre-wrap rounded-xl border bg-card p-4 font-mono text-sm">
            {docs || "No documentation yet."}
          </pre>
        </div>
      )}

      {tab === "qa" && (
        <div className="mx-auto w-full max-w-2xl space-y-4">
          <div className="flex gap-2">
            <Input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask about this codebase…"
              onKeyDown={(e) => e.key === "Enter" && void ask()}
            />
            <Button onClick={ask} disabled={busy}>
              Ask
            </Button>
          </div>
          {answer && (
            <div className="rounded-xl border bg-card p-4">
              <h3 className="mb-2 text-sm font-medium">Answer</h3>
              <pre className="whitespace-pre-wrap font-sans text-sm text-muted-foreground">
                {answer}
              </pre>
            </div>
          )}
        </div>
      )}
    </AppShell>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  )
}
