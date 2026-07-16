"use client"

import { useCallback, useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { AppShell } from "@/components/app-shell"
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
  const [diagram, setDiagram] = useState<{ nodes: Array<{ id: string; label: string; type: string }>; edges: Array<{ from: string; to: string }> } | null>(null)
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
    }, 4000)
    return () => clearInterval(timer)
  }, [id, refresh])

  useEffect(() => {
    if (tab === "files") {
      void api.getFiles(id).then((r) => setFiles(r.files || [])).catch((e) => setError(e.message))
    }
    if (tab === "docs") {
      void api.getDocs(id).then((r) => setDocs(r.content || "")).catch((e) => setError(e.message))
    }
    if (tab === "diagram") {
      void api.getDiagram(id).then((r) => setDiagram(r)).catch((e) => setError(e.message))
    }
  }, [tab, id])

  async function runAnalysis() {
    setBusy(true)
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
    try {
      const res = await api.ask(id, question)
      setAnswer(res.answer)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Q&A failed")
    } finally {
      setBusy(false)
    }
  }

  const latestJob = jobs[0]

  return (
    <AppShell title={project?.name || "Project"}>
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{project?.repo_url}</p>
          <p className="mt-1 text-sm">
            Status: <span className="capitalize font-medium">{project?.status || "…"}</span>
            {latestJob && (
              <span className="ml-3 text-muted-foreground">
                Job {latestJob.status} · {latestJob.progress}%
              </span>
            )}
          </p>
        </div>
        <Button onClick={runAnalysis} disabled={busy}>
          {busy ? "Working…" : "Re-analyze"}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 border-b pb-2">
        {(
          [
            ["overview", "Overview"],
            ["files", "Files"],
            ["qa", "Q&A"],
            ["docs", "Docs"],
            ["diagram", "Diagram"],
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
          <div className="sm:col-span-2 lg:col-span-4 rounded-xl border bg-card p-4">
            <h3 className="font-medium">Summary</h3>
            <p className="mt-2 text-sm text-muted-foreground whitespace-pre-wrap">
              {summary?.summary || "Run analysis to generate a summary."}
            </p>
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
              <pre className="whitespace-pre-wrap text-sm text-muted-foreground font-sans">
                {answer}
              </pre>
            </div>
          )}
        </div>
      )}

      {tab === "docs" && (
        <pre className="overflow-auto rounded-xl border bg-card p-4 text-sm whitespace-pre-wrap font-mono">
          {docs || "No documentation generated yet."}
        </pre>
      )}

      {tab === "diagram" && (
        <div className="rounded-xl border bg-card p-4">
          <h3 className="mb-3 font-medium">Entity graph</h3>
          {!diagram || diagram.nodes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No diagram data yet.</p>
          ) : (
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
