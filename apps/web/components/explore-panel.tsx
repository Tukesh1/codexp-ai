"use client"

import { useCallback, useEffect, useState } from "react"
import {
  BookMarked,
  GitBranch,
  Loader2,
  Network,
  RefreshCw,
  Skull,
  Sparkles,
  Target,
} from "lucide-react"
import {
  api,
  type ConceptCluster,
  type Readiness,
} from "@/lib/api"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"

type ExplorePanelProps = {
  projectId: string
  onOpenFile: (path: string, line?: number) => void
}

type ExploreSection =
  | "readiness"
  | "concepts"
  | "graph"
  | "changes"
  | "deadends"
  | "quiz"
  | "notes"

const SECTIONS: Array<{ id: ExploreSection; label: string; icon: typeof Target }> = [
  { id: "readiness", label: "Readiness", icon: Target },
  { id: "concepts", label: "Concepts", icon: Network },
  { id: "graph", label: "Call graph", icon: GitBranch },
  { id: "changes", label: "Changes", icon: RefreshCw },
  { id: "deadends", label: "Dead ends", icon: Skull },
  { id: "quiz", label: "Quiz", icon: Sparkles },
  { id: "notes", label: "Notes", icon: BookMarked },
]

export function ExplorePanel({ projectId, onOpenFile }: ExplorePanelProps) {
  const [section, setSection] = useState<ExploreSection>("readiness")
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [readiness, setReadiness] = useState<Readiness | null>(null)
  const [concepts, setConcepts] = useState<{
    clusters: ConceptCluster[]
    message?: string
    method?: string
  } | null>(null)
  const [graphName, setGraphName] = useState("")
  const [graphPath, setGraphPath] = useState("")
  const [graph, setGraph] = useState<{
    symbol: { name: string; path: string; kind?: string }
    callers: Array<{ name?: string; path?: string; line?: number; source?: string; url?: string }>
    callees: Array<{ name?: string; path?: string; line?: number; source?: string }>
    related: Array<{ name: string; path: string; kind?: string }>
  } | null>(null)
  const [changes, setChanges] = useState<{
    baseline?: boolean
    message?: string
    added?: string[]
    removed?: string[]
  } | null>(null)
  const [deadEnds, setDeadEnds] = useState<{
    files: Array<{ path: string; reason: string }>
    tiny_file_folders?: Array<{ folder: string; file_count: number; avg_size: number }>
  } | null>(null)
  const [quiz, setQuiz] = useState<{
    attempt_id: string
    questions: Array<{ id: number; prompt: string; options: string[] }>
  } | null>(null)
  const [answers, setAnswers] = useState<number[]>([])
  const [quizResult, setQuizResult] = useState<{
    score: number
    correct: number
    total: number
    results: Array<{
      question: string
      is_correct: boolean
      explanation: string
      correct_answer: number
      user_answer: number
    }>
  } | null>(null)
  const [notes, setNotes] = useState<
    Array<{ id: string; path: string; content: string; start_line?: number | null }>
  >([])

  const loadSection = useCallback(async () => {
    setBusy(true)
    setError(null)
    try {
      if (section === "readiness") {
        setReadiness(await api.getReadiness(projectId))
      } else if (section === "concepts") {
        setConcepts(await api.getConcepts(projectId))
      } else if (section === "changes") {
        setChanges(await api.getChanges(projectId))
      } else if (section === "deadends") {
        setDeadEnds(await api.getDeadEnds(projectId))
      } else if (section === "notes") {
        const r = await api.listNotes(projectId)
        setNotes(r.notes || [])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load")
    } finally {
      setBusy(false)
    }
  }, [projectId, section])

  useEffect(() => {
    if (section === "graph" || section === "quiz") return
    void loadSection()
  }, [section, loadSection])

  async function runGraph() {
    if (!graphName.trim()) return
    setBusy(true)
    setError(null)
    try {
      setGraph(await api.getSymbolGraph(projectId, graphName.trim(), graphPath.trim() || undefined))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Graph failed")
    } finally {
      setBusy(false)
    }
  }

  async function runQuiz() {
    setBusy(true)
    setError(null)
    setQuizResult(null)
    try {
      const raw = await api.generateQuiz(projectId)
      const questions = (raw.quiz?.questions || []).map((q, i) => ({
        id: i + 1,
        prompt: q.question,
        options: q.options || [],
      }))
      setQuiz({ attempt_id: raw.id, questions })
      setAnswers(Array(questions.length).fill(-1))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Quiz failed")
    } finally {
      setBusy(false)
    }
  }

  async function submitQuiz() {
    if (!quiz) return
    setBusy(true)
    setError(null)
    try {
      const res = await api.submitQuiz(projectId, quiz.attempt_id, answers)
      setQuizResult({
        score: res.score,
        correct: res.correct,
        total: res.total,
        results: res.results || [],
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submit failed")
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex h-[calc(100svh-13.5rem)] min-h-[420px] flex-col overflow-hidden rounded-xl border bg-card">
      <div className="flex shrink-0 flex-wrap gap-1 border-b px-2 py-2">
        {SECTIONS.map((s) => {
          const Icon = s.icon
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setSection(s.id)}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs transition ${
                section === s.id
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="size-3.5" />
              {s.label}
            </button>
          )
        })}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
        {error && (
          <p className="mb-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
        {busy && !quiz && section !== "graph" && (
          <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading…
          </div>
        )}

        {section === "readiness" && readiness && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-3xl font-semibold tracking-tight">{readiness.score}</p>
                <p className="text-sm font-medium">{readiness.label}</p>
                <p className="mt-1 max-w-xl text-sm text-muted-foreground">
                  {readiness.detail ||
                    `${Math.round(readiness.coverage_pct)}% embedding coverage across symbols.`}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => void loadSection()}>
                Refresh
              </Button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="Files" value={readiness.file_count} />
              <Stat label="Functions" value={readiness.function_count} />
              <Stat label="Embeddings" value={readiness.embedding_count} />
              <Stat label="Coverage" value={`${Math.round(readiness.coverage_pct)}%`} />
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <Pill ok={readiness.has_overview} label="Overview" />
              <Pill ok={readiness.has_diagram} label="Diagram" />
              <Pill ok={readiness.has_docs} label="Docs" />
            </div>
            {(readiness.dead_end_files?.length || 0) > 0 && (
              <p className="text-xs text-muted-foreground">
                {readiness.dead_end_files!.length} dead-end / vendor-like files flagged
              </p>
            )}
          </div>
        )}

        {section === "concepts" && concepts && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {concepts.message || `Clustered via ${concepts.method || "index"}`}
            </p>
            <div className="grid gap-3 lg:grid-cols-2">
              {(concepts.clusters || []).map((c) => (
                <div key={c.id} className="rounded-xl border p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <h4 className="font-medium">{c.name}</h4>
                    <span className="text-xs text-muted-foreground">{c.size} symbols</span>
                  </div>
                  <ul className="space-y-1">
                    {c.symbols.slice(0, 8).map((s, i) => (
                      <li key={`${s.name}-${i}`}>
                        <button
                          type="button"
                          className="font-mono text-xs text-teal-800 hover:underline dark:text-teal-300"
                          onClick={() => onOpenFile(s.path)}
                        >
                          {s.kind === "class" ? "C" : "ƒ"} {s.name}
                          <span className="ml-1 text-muted-foreground">{s.path}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            {!concepts.clusters?.length && (
              <p className="text-sm text-muted-foreground">No clusters yet — analyze the project first.</p>
            )}
          </div>
        )}

        {section === "graph" && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Input
                value={graphName}
                onChange={(e) => setGraphName(e.target.value)}
                placeholder="Symbol name (e.g. AnalyzeProject)"
                className="max-w-xs"
              />
              <Input
                value={graphPath}
                onChange={(e) => setGraphPath(e.target.value)}
                placeholder="Optional file path"
                className="max-w-sm"
              />
              <Button onClick={() => void runGraph()} disabled={busy || !graphName.trim()}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : "Trace"}
              </Button>
            </div>
            {graph && (
              <div className="grid gap-4 lg:grid-cols-3">
                <GraphCol
                  title="Callers"
                  empty="No callers indexed yet — GitHub search or re-analyze helps."
                  items={graph.callers.map((c, i) => ({
                    key: i,
                    label: String(c.path || c.name || "ref"),
                    sub: c.line != null ? `line ${c.line}` : String(c.source || ""),
                    onClick: () =>
                      c.path ? onOpenFile(c.path, c.line ?? undefined) : undefined,
                  }))}
                />
                <GraphCol
                  title="Callees"
                  empty="Open a path or re-analyze to extract calls."
                  items={graph.callees.map((c, i) => ({
                    key: i,
                    label: String(c.name || c.path || "call"),
                    sub: [c.path, c.line != null ? `:${c.line}` : ""].filter(Boolean).join(""),
                    onClick: () =>
                      c.path ? onOpenFile(c.path, c.line ?? undefined) : undefined,
                  }))}
                />
                <GraphCol
                  title="Related"
                  empty="Needs embeddings — run analysis."
                  items={graph.related.map((c, i) => ({
                    key: i,
                    label: c.name,
                    sub: c.path,
                    onClick: () => onOpenFile(c.path),
                  }))}
                />
              </div>
            )}
          </div>
        )}

        {section === "changes" && changes && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{changes.message || ""}</p>
            {!changes.baseline && (
              <div className="grid gap-3 sm:grid-cols-2">
                <DiffList title="Added symbols" items={changes.added || []} />
                <DiffList title="Removed symbols" items={changes.removed || []} />
              </div>
            )}
            <Button variant="outline" size="sm" onClick={() => void loadSection()}>
              Refresh
            </Button>
          </div>
        )}

        {section === "deadends" && deadEnds && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Files that are unlikely to teach you the product core — vendor paths, empty symbol
              files, or stubs.
            </p>
            <p className="text-xs text-muted-foreground">{deadEnds.files.length} flagged</p>
            <ul className="divide-y rounded-xl border">
              {deadEnds.files.map((it) => (
                <li key={it.path} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                  <button
                    type="button"
                    className="font-mono text-xs hover:underline"
                    onClick={() => onOpenFile(it.path)}
                  >
                    {it.path}
                  </button>
                  <span className="text-xs text-muted-foreground">{it.reason}</span>
                </li>
              ))}
            </ul>
            {(deadEnds.tiny_file_folders?.length || 0) > 0 && (
              <div className="rounded-xl border p-3">
                <h4 className="mb-2 text-sm font-medium">Folders with many tiny files</h4>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  {deadEnds.tiny_file_folders!.map((f) => (
                    <li key={f.folder}>
                      {f.folder} · {f.file_count} files · avg {f.avg_size}B
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {section === "quiz" && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={() => void runQuiz()} disabled={busy}>
                {busy ? <Loader2 className="size-4 animate-spin" /> : "Generate quiz"}
              </Button>
              {quiz && !quizResult && (
                <Button variant="outline" onClick={() => void submitQuiz()} disabled={busy}>
                  Submit answers
                </Button>
              )}
            </div>
            {quiz && (
              <div className="space-y-4">
                {quiz.questions.map((q, qi) => (
                  <div key={q.id} className="rounded-xl border p-3">
                    <p className="mb-2 text-sm font-medium">
                      {qi + 1}. {q.prompt}
                    </p>
                    <div className="space-y-1.5">
                      {q.options.map((opt, oi) => (
                        <label
                          key={oi}
                          className={`flex cursor-pointer items-start gap-2 rounded-md border px-2.5 py-2 text-sm ${
                            answers[qi] === oi ? "border-foreground bg-muted/50" : "hover:bg-muted/30"
                          }`}
                        >
                          <input
                            type="radio"
                            className="mt-1"
                            name={`q-${q.id}`}
                            checked={answers[qi] === oi}
                            onChange={() =>
                              setAnswers((prev) => {
                                const next = [...prev]
                                next[qi] = oi
                                return next
                              })
                            }
                            disabled={!!quizResult}
                          />
                          <span>{opt}</span>
                        </label>
                      ))}
                    </div>
                    {quizResult?.results?.[qi] && (
                      <p className="mt-2 text-xs text-muted-foreground">
                        {quizResult.results[qi].is_correct ? "Correct. " : "Incorrect. "}
                        {quizResult.results[qi].explanation || ""}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
            {quizResult && (
              <p className="text-sm font-medium">
                Score: {quizResult.score}% ({quizResult.correct}/{quizResult.total})
              </p>
            )}
          </div>
        )}

        {section === "notes" && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              Sticky mental-model notes. Add them from the Code tab while reading a file.
            </p>
            {notes.length === 0 && (
              <p className="text-sm text-muted-foreground">No notes yet.</p>
            )}
            <ul className="space-y-2">
              {notes.map((n) => (
                <li key={n.id} className="rounded-xl border p-3">
                  <button
                    type="button"
                    className="font-mono text-xs text-teal-800 hover:underline dark:text-teal-300"
                    onClick={() => onOpenFile(n.path, n.start_line || undefined)}
                  >
                    {n.path}
                    {n.start_line ? `:${n.start_line}` : ""}
                  </button>
                  <p className="mt-1 whitespace-pre-wrap text-sm">{n.content}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border px-3 py-2">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
    </div>
  )
}

function Pill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div
      className={`rounded-lg border px-3 py-2 text-sm ${
        ok ? "border-emerald-500/30 bg-emerald-500/10" : "border-dashed text-muted-foreground"
      }`}
    >
      {ok ? "✓" : "○"} {label}
    </div>
  )
}

function DiffList({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-xl border p-3">
      <h4 className="mb-2 text-sm font-medium">
        {title} <span className="text-muted-foreground">({items.length})</span>
      </h4>
      <ul className="max-h-48 space-y-1 overflow-y-auto font-mono text-[11px] text-muted-foreground">
        {items.slice(0, 40).map((x) => (
          <li key={x}>{x}</li>
        ))}
        {!items.length && <li>None</li>}
      </ul>
    </div>
  )
}

function GraphCol({
  title,
  empty,
  items,
}: {
  title: string
  empty: string
  items: Array<{ key: number; label: string; sub: string; onClick?: () => void }>
}) {
  return (
    <div className="rounded-xl border p-3">
      <h4 className="mb-2 text-sm font-medium">{title}</h4>
      {!items.length && <p className="text-xs text-muted-foreground">{empty}</p>}
      <ul className="space-y-1.5">
        {items.map((it) => (
          <li key={it.key}>
            <button
              type="button"
              disabled={!it.onClick}
              onClick={it.onClick}
              className="block w-full text-left font-mono text-xs hover:underline disabled:no-underline"
            >
              {it.label}
              {it.sub ? <span className="ml-1 text-muted-foreground">{it.sub}</span> : null}
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
