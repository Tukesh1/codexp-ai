"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useTheme } from "next-themes"
import { Highlight, themes } from "prism-react-renderer"
import {
  Bookmark,
  Bug,
  Check,
  Copy,
  ExternalLink,
  FolderPlus,
  GripVertical,
  HelpCircle,
  Lightbulb,
  Loader2,
  Maximize2,
  Minimize2,
  Pin,
  PinOff,
  Sparkles,
  Wand2,
  X,
} from "lucide-react"
import { MarkdownBody } from "@/components/markdown-body"
import { api, type FileContent, type Note } from "@/lib/api"
import { useWorkspace } from "@/lib/workspace"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"

function formatBytes(n?: number | null) {
  if (n == null) return "—"
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

function toPrismLanguage(lang?: string | null, path?: string | null): string {
  const fromPath = path?.split(".").pop()?.toLowerCase() || ""
  const raw = (lang || fromPath || "").toLowerCase().replace(/[\s_+]/g, "")
  const map: Record<string, string> = {
    js: "javascript",
    javascript: "javascript",
    jsx: "jsx",
    ts: "typescript",
    typescript: "typescript",
    tsx: "tsx",
    py: "python",
    python: "python",
    go: "go",
    golang: "go",
    rs: "rust",
    rust: "rust",
    java: "java",
    c: "c",
    h: "c",
    cpp: "cpp",
    cc: "cpp",
    cxx: "cpp",
    hpp: "cpp",
    cs: "csharp",
    csharp: "csharp",
    rb: "ruby",
    ruby: "ruby",
    php: "php",
    swift: "swift",
    kt: "kotlin",
    kotlin: "kotlin",
    scala: "scala",
    sh: "bash",
    bash: "bash",
    zsh: "bash",
    shell: "bash",
    json: "json",
    yaml: "yaml",
    yml: "yaml",
    toml: "toml",
    md: "markdown",
    markdown: "markdown",
    html: "markup",
    xml: "markup",
    css: "css",
    scss: "scss",
    sql: "sql",
    dockerfile: "docker",
    docker: "docker",
  }
  return map[raw] || "clike"
}

type SelectionState = {
  text: string
  startLine: number
  endLine: number
  x: number
  y: number
}

type PanelSize = { w: number; h: number }

const SIZE_KEY = "codeexp.askPanel.size"
const DEFAULT_SIZE: PanelSize = { w: 400, h: 420 }
const MIN_W = 300
const MAX_W = 720
const MIN_H = 280
const MAX_H = 780

const QUICK_PROMPTS = [
  {
    id: "explain",
    label: "Explain",
    icon: Lightbulb,
    question:
      "Explain this code clearly — what it does, how it works, key inputs/outputs, and how it fits in the project.",
  },
  {
    id: "simplify",
    label: "Simplify",
    icon: Wand2,
    question:
      "Explain this like I'm new to the codebase. Use plain language and a short step-by-step.",
  },
  {
    id: "bugs",
    label: "Risks",
    icon: Bug,
    question:
      "What bugs, edge cases, or risks should I watch for in this selection? Be specific.",
  },
  {
    id: "why",
    label: "Why?",
    icon: HelpCircle,
    question:
      "Why might this code be written this way? What design intent or tradeoffs does it suggest?",
  },
] as const

const LENSES = [
  { id: "", label: "Default" },
  { id: "beginner", label: "Beginner" },
  { id: "reviewer", label: "Reviewer" },
  { id: "security", label: "Security" },
  { id: "performance", label: "Perf" },
  { id: "architect", label: "Architect" },
] as const

function loadSize(): PanelSize {
  if (typeof window === "undefined") return DEFAULT_SIZE
  try {
    const raw = localStorage.getItem(SIZE_KEY)
    if (!raw) return DEFAULT_SIZE
    const parsed = JSON.parse(raw) as PanelSize
    return {
      w: Math.min(MAX_W, Math.max(MIN_W, parsed.w || DEFAULT_SIZE.w)),
      h: Math.min(MAX_H, Math.max(MIN_H, parsed.h || DEFAULT_SIZE.h)),
    }
  } catch {
    return DEFAULT_SIZE
  }
}

export function CodeViewer({
  projectId,
  path,
  focusLine = null,
}: {
  projectId: string
  path: string | null
  focusLine?: number | null
}) {
  const { resolvedTheme } = useTheme()
  const { explainBasket, addToExplainBasket, removeFromExplainBasket, clearExplainBasket } =
    useWorkspace()
  const [data, setData] = useState<FileContent | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notes, setNotes] = useState<Note[]>([])
  const [noteDraft, setNoteDraft] = useState("")
  const [savingNote, setSavingNote] = useState(false)
  const [lens, setLens] = useState("")

  const codeAreaRef = useRef<HTMLDivElement>(null)
  const popupRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(
    null
  )
  const resizeRef = useRef<{
    startX: number
    startY: number
    origW: number
    origH: number
  } | null>(null)

  const [selection, setSelection] = useState<SelectionState | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [size, setSize] = useState<PanelSize>(DEFAULT_SIZE)
  const sizeRef = useRef(size)
  sizeRef.current = size
  const [pinned, setPinned] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [showSnippet, setShowSnippet] = useState(true)
  const [question, setQuestion] = useState("")
  const [answer, setAnswer] = useState<string | null>(null)
  const [asking, setAsking] = useState(false)
  const [askError, setAskError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [activeQuick, setActiveQuick] = useState<string | null>(null)

  const prismLang = useMemo(
    () => toPrismLanguage(data?.language, path),
    [data?.language, path]
  )

  useEffect(() => {
    setSize(loadSize())
  }, [])

  useEffect(() => {
    if (!path) {
      setData(null)
      setError(null)
      setSelection(null)
      setAnswer(null)
      setNotes([])
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    setSelection(null)
    setAnswer(null)
    setDragOffset({ x: 0, y: 0 })
    setPinned(false)
    setExpanded(false)
    Promise.all([
      api.getFileContent(projectId, path),
      api.listNotes(projectId, path).catch(() => ({ notes: [] as Note[] })),
    ])
      .then(([res, notesRes]) => {
        if (!cancelled) {
          setData(res)
          setNotes(notesRes.notes || [])
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load file")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [projectId, path])

  useEffect(() => {
    if (!focusLine || !data?.content || loading) return
    const t = window.setTimeout(() => {
      const el = codeAreaRef.current?.querySelector(`[data-line="${focusLine}"]`)
      el?.scrollIntoView({ block: "center", behavior: "smooth" })
    }, 80)
    return () => window.clearTimeout(t)
  }, [focusLine, data?.content, loading, path])

  const persistSize = useCallback((next: PanelSize) => {
    setSize(next)
    try {
      localStorage.setItem(SIZE_KEY, JSON.stringify(next))
    } catch {
      /* ignore */
    }
  }, [])

  const clearPopup = useCallback(() => {
    setSelection(null)
    setDragOffset({ x: 0, y: 0 })
    setQuestion("")
    setAnswer(null)
    setAskError(null)
    setAsking(false)
    setPinned(false)
    setExpanded(false)
    setActiveQuick(null)
    setCopied(false)
  }, [])

  const captureSelection = useCallback(() => {
    const root = codeAreaRef.current
    if (!root) return

    const sel = window.getSelection()
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) return

    const text = sel.toString().replace(/\u00a0/g, " ").trimEnd()
    if (!text.trim() || text.trim().length < 2) return

    const range = sel.getRangeAt(0)
    if (!root.contains(range.commonAncestorContainer)) return

    const startEl =
      range.startContainer.nodeType === Node.ELEMENT_NODE
        ? (range.startContainer as Element)
        : range.startContainer.parentElement
    const endEl =
      range.endContainer.nodeType === Node.ELEMENT_NODE
        ? (range.endContainer as Element)
        : range.endContainer.parentElement
    const startRow = startEl?.closest("[data-line]") as HTMLElement | null
    const endRow = endEl?.closest("[data-line]") as HTMLElement | null
    if (!startRow || !endRow) return

    const startLine = Number(startRow.dataset.line || 0)
    const endLine = Number(endRow.dataset.line || 0)
    if (!startLine || !endLine) return

    const rect = range.getBoundingClientRect()
    const areaRect = root.getBoundingClientRect()
    const panelW = size.w

    const spaceRight = areaRect.right - rect.right
    const maxX = Math.max(root.clientWidth + root.scrollLeft - panelW - 12, 12)
    let x: number
    if (spaceRight >= panelW + 16) {
      x = rect.right - areaRect.left + root.scrollLeft + 12
    } else {
      x = rect.left - areaRect.left + root.scrollLeft - panelW - 12
    }
    x = Math.min(Math.max(x, 12), maxX)

    const preferredY = rect.top - areaRect.top + root.scrollTop - 4
    const y = Math.max(preferredY, root.scrollTop + 8)

    setSelection({
      text: text.trimEnd(),
      startLine: Math.min(startLine, endLine),
      endLine: Math.max(startLine, endLine),
      x,
      y,
    })
    setDragOffset({ x: 0, y: 0 })
    setQuestion("")
    setAnswer(null)
    setAskError(null)
    setActiveQuick(null)
    setExpanded(false)
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [size.w])

  const onDragStart = useCallback(
    (e: React.PointerEvent) => {
      if (!selection) return
      e.preventDefault()
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        origX: dragOffset.x,
        origY: dragOffset.y,
      }
    },
    [selection, dragOffset]
  )

  const onDragMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return
    setDragOffset({
      x: dragRef.current.origX + (e.clientX - dragRef.current.startX),
      y: dragRef.current.origY + (e.clientY - dragRef.current.startY),
    })
  }, [])

  const onDragEnd = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return
    try {
      ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
    } catch {
      /* ignore */
    }
    dragRef.current = null
  }, [])

  const onResizeStart = useCallback(
    (e: React.PointerEvent) => {
      e.preventDefault()
      e.stopPropagation()
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
      resizeRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        origW: size.w,
        origH: size.h,
      }
    },
    [size]
  )

  const onResizeMove = useCallback(
    (e: React.PointerEvent) => {
      if (!resizeRef.current) return
      const next = {
        w: Math.min(
          MAX_W,
          Math.max(MIN_W, resizeRef.current.origW + (e.clientX - resizeRef.current.startX))
        ),
        h: Math.min(
          MAX_H,
          Math.max(MIN_H, resizeRef.current.origH + (e.clientY - resizeRef.current.startY))
        ),
      }
      setSize(next)
    },
    []
  )

  const onResizeEnd = useCallback(
    (e: React.PointerEvent) => {
      if (!resizeRef.current) return
      try {
        ;(e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId)
      } catch {
        /* ignore */
      }
      resizeRef.current = null
      persistSize(sizeRef.current)
    },
    [persistSize]
  )

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !pinned) clearPopup()
    }
    function onPointerDown(e: MouseEvent) {
      if (!selection || pinned) return
      const target = e.target as Node
      if (popupRef.current?.contains(target)) return
      if (codeAreaRef.current?.contains(target)) return
      clearPopup()
    }
    window.addEventListener("keydown", onKey)
    window.addEventListener("mousedown", onPointerDown)
    return () => {
      window.removeEventListener("keydown", onKey)
      window.removeEventListener("mousedown", onPointerDown)
    }
  }, [selection, pinned, clearPopup])

  const runAsk = useCallback(
    async (q: string, quickId?: string) => {
      if (!selection || !path || asking) return
      setAsking(true)
      setAskError(null)
      setAnswer(null)
      setActiveQuick(quickId || null)
      setExpanded(true)
      try {
        const res = await api.ask(
          projectId,
          q,
          {
            path,
            code: selection.text,
            language: data?.language || undefined,
            start_line: selection.startLine,
            end_line: selection.endLine,
          },
          {
            lens: lens || undefined,
            files: explainBasket.length ? explainBasket : undefined,
          }
        )
        setAnswer(res.answer)
      } catch (err) {
        setAskError(err instanceof Error ? err.message : "Ask failed")
      } finally {
        setAsking(false)
      }
    },
    [selection, path, asking, projectId, data?.language, lens, explainBasket]
  )

  async function saveNote() {
    if (!path || !noteDraft.trim()) return
    setSavingNote(true)
    try {
      const note = await api.createNote(projectId, {
        path,
        content: noteDraft.trim(),
        start_line: selection?.startLine,
        end_line: selection?.endLine,
      })
      setNotes((prev) => [note, ...prev])
      setNoteDraft("")
    } catch (err) {
      setAskError(err instanceof Error ? err.message : "Failed to save note")
    } finally {
      setSavingNote(false)
    }
  }

  function addSelectionToBasket() {
    if (!selection || !path) return
    addToExplainBasket({
      path,
      code: selection.text,
      language: data?.language || undefined,
      start_line: selection.startLine,
      end_line: selection.endLine,
    })
  }

  async function submitAsk(e?: React.FormEvent) {
    e?.preventDefault()
    const q =
      question.trim() ||
      QUICK_PROMPTS[0].question
    await runAsk(q, question.trim() ? "custom" : "explain")
  }

  async function copyAnswer() {
    if (!answer) return
    try {
      await navigator.clipboard.writeText(answer)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1400)
    } catch {
      /* ignore */
    }
  }

  const lineCount = selection
    ? selection.endLine - selection.startLine + 1
    : 0

  if (!path) {
    return (
      <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Browse the repository</p>
        <p>Select a file, then highlight code to ask AI about it.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex min-h-[320px] items-center justify-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        Loading {path}…
      </div>
    )
  }

  if (error) {
    return <p className="p-4 text-sm text-destructive">{error}</p>
  }

  const content = data?.content || ""
  const empty = !content
  const panelH = expanded || answer || asking ? size.h : Math.min(size.h, 340)

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b bg-muted/30 px-3 py-2">
        <div className="min-w-0">
          <p className="truncate font-mono text-xs font-medium">{path}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {data?.language || "unknown"} · {formatBytes(data?.size_bytes)}
            {data?.source === "github" ? " · from GitHub" : ""}
            {" · "}
            <span className="text-teal-700 dark:text-teal-400">highlight → ask AI</span>
            {explainBasket.length > 0 && (
              <span className="ml-2 text-foreground">
                · basket {explainBasket.length}
                <button
                  type="button"
                  className="ml-1 underline"
                  onClick={clearExplainBasket}
                >
                  clear
                </button>
              </span>
            )}
          </p>
        </div>
        {data?.html_url && (
          <a
            href={data.html_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            Open on GitHub <ExternalLink className="size-3" />
          </a>
        )}
      </div>

      {notes.length > 0 && (
        <div className="shrink-0 space-y-1 border-b px-3 py-2">
          {notes.slice(0, 4).map((n) => (
            <div key={n.id} className="flex items-start gap-2 text-xs">
              <Bookmark className="mt-0.5 size-3 shrink-0 text-amber-600" />
              <p className="min-w-0 flex-1 whitespace-pre-wrap text-muted-foreground">
                {n.start_line ? `L${n.start_line}: ` : ""}
                {n.content}
              </p>
              <button
                type="button"
                className="text-muted-foreground hover:text-destructive"
                onClick={() => {
                  void api.deleteNote(projectId, n.id).then(() => {
                    setNotes((prev) => prev.filter((x) => x.id !== n.id))
                  })
                }}
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b px-3 py-2">
        <Input
          value={noteDraft}
          onChange={(e) => setNoteDraft(e.target.value)}
          placeholder="Sticky note for this file…"
          className="h-8 max-w-md text-xs"
        />
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={savingNote || !noteDraft.trim()}
          onClick={() => void saveNote()}
        >
          {savingNote ? <Loader2 className="size-3.5 animate-spin" /> : "Save note"}
        </Button>
      </div>

      {data?.symbols && data.symbols.length > 0 && (
        <div className="flex shrink-0 flex-wrap gap-1.5 border-b px-3 py-2">
          {data.symbols.slice(0, 24).map((s) => (
            <span
              key={s.id}
              className="rounded-md bg-muted px-2 py-0.5 font-mono text-[10px] text-muted-foreground"
              title={s.summary || s.signature || undefined}
            >
              <span className="opacity-60">{s.entity_type === "class" ? "C" : "ƒ"}</span> {s.name}
              {s.start_line != null ? `:${s.start_line}` : ""}
            </span>
          ))}
        </div>
      )}

      {empty ? (
        <p className="p-4 text-sm text-muted-foreground">
          {data?.message || "No content available for this file."}
        </p>
      ) : (
        <div
          ref={codeAreaRef}
          className="relative min-h-0 flex-1 overflow-auto overscroll-contain bg-[#f6f8fa] dark:bg-[#0d1117]"
          onMouseUp={() => {
            window.setTimeout(captureSelection, 0)
          }}
        >
          <Highlight
            code={content}
            language={prismLang}
            theme={resolvedTheme === "dark" ? themes.nightOwl : themes.github}
          >
            {({ className, style, tokens, getLineProps, getTokenProps }) => (
              <pre
                className={`${className} m-0 min-w-full p-0 font-mono text-[12.5px] leading-[1.55]`}
                style={{ ...style, background: "transparent", margin: 0 }}
              >
                {tokens.map((line, i) => {
                  const lineNo = i + 1
                  const inSelection =
                    selection &&
                    lineNo >= selection.startLine &&
                    lineNo <= selection.endLine
                  const isFocus = focusLine === lineNo
                  return (
                    <div
                      key={i}
                      {...getLineProps({ line })}
                      data-line={lineNo}
                      className={`flex ${
                        inSelection
                          ? "bg-teal-500/15 dark:bg-teal-400/10"
                          : isFocus
                            ? "bg-amber-500/20 dark:bg-amber-400/15"
                            : "hover:bg-black/[0.03] dark:hover:bg-white/[0.04]"
                      }`}
                    >
                      <span className="w-12 shrink-0 select-none border-r border-black/5 px-2 text-right text-muted-foreground/60 dark:border-white/10">
                        {lineNo}
                      </span>
                      <span className="flex-1 whitespace-pre px-3">
                        {line.length === 0
                          ? " "
                          : line.map((token, key) => (
                              <span key={key} {...getTokenProps({ token })} />
                            ))}
                      </span>
                    </div>
                  )
                })}
              </pre>
            )}
          </Highlight>

          {selection && (
            <div
              ref={popupRef}
              className="absolute z-20 flex flex-col overflow-hidden rounded-2xl border border-teal-600/20 bg-card/95 shadow-2xl backdrop-blur-md"
              style={{
                left: selection.x + dragOffset.x,
                top: selection.y + dragOffset.y,
                width: size.w,
                height: panelH,
              }}
              onMouseDown={(e) => e.stopPropagation()}
            >
              {/* Header — drag */}
              <div
                className="flex shrink-0 cursor-grab items-center justify-between gap-2 border-b bg-gradient-to-r from-teal-500/10 via-transparent to-blue-500/10 px-2 py-2 active:cursor-grabbing"
                onPointerDown={onDragStart}
                onPointerMove={onDragMove}
                onPointerUp={onDragEnd}
                onPointerCancel={onDragEnd}
              >
                <div className="flex min-w-0 items-center gap-1.5 text-xs font-medium">
                  <GripVertical className="size-3.5 shrink-0 text-muted-foreground" />
                  <Sparkles className="size-3.5 shrink-0 text-teal-700 dark:text-teal-400" />
                  <span className="truncate">
                    Understand{" "}
                    <span className="font-mono text-muted-foreground">
                      :{selection.startLine}
                      {selection.endLine !== selection.startLine
                        ? `–${selection.endLine}`
                        : ""}
                    </span>
                  </span>
                  <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    {lineCount} line{lineCount === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="flex items-center gap-0.5">
                  <IconBtn
                    label={pinned ? "Unpin" : "Pin open"}
                    onClick={() => setPinned((p) => !p)}
                  >
                    {pinned ? <PinOff className="size-3.5" /> : <Pin className="size-3.5" />}
                  </IconBtn>
                  <IconBtn
                    label={expanded ? "Compact" : "Expand"}
                    onClick={() => setExpanded((v) => !v)}
                  >
                    {expanded ? (
                      <Minimize2 className="size-3.5" />
                    ) : (
                      <Maximize2 className="size-3.5" />
                    )}
                  </IconBtn>
                  <IconBtn label="Close" onClick={clearPopup}>
                    <X className="size-3.5" />
                  </IconBtn>
                </div>
              </div>

              {/* Snippet */}
              {showSnippet && (
                <button
                  type="button"
                  className="max-h-16 shrink-0 overflow-hidden border-b bg-muted/30 px-3 py-1.5 text-left"
                  onClick={() => setShowSnippet(false)}
                  title="Click to hide snippet"
                >
                  <pre className="font-mono text-[10px] leading-relaxed text-muted-foreground">
                    {selection.text.length > 280
                      ? `${selection.text.slice(0, 280)}…`
                      : selection.text}
                  </pre>
                </button>
              )}
              {!showSnippet && (
                <button
                  type="button"
                  className="shrink-0 border-b px-3 py-1 text-[10px] text-muted-foreground hover:bg-muted/40"
                  onClick={() => setShowSnippet(true)}
                >
                  Show selected snippet
                </button>
              )}

              {/* Quick actions */}
              <div className="flex shrink-0 flex-wrap gap-1.5 border-b px-3 py-2">
                {QUICK_PROMPTS.map((p) => {
                  const Icon = p.icon
                  const active = activeQuick === p.id
                  return (
                    <button
                      key={p.id}
                      type="button"
                      disabled={asking}
                      onClick={() => {
                        setQuestion("")
                        void runAsk(p.question, p.id)
                      }}
                      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
                        active
                          ? "border-teal-600/40 bg-teal-500/15 text-teal-800 dark:text-teal-300"
                          : "hover:bg-muted"
                      } disabled:opacity-50`}
                    >
                      <Icon className="size-3" />
                      {p.label}
                    </button>
                  )
                })}
                <button
                  type="button"
                  onClick={addSelectionToBasket}
                  className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium hover:bg-muted"
                >
                  <FolderPlus className="size-3" />
                  Basket
                </button>
              </div>

              <div className="flex shrink-0 flex-wrap gap-1 border-b px-3 py-1.5">
                {LENSES.map((l) => (
                  <button
                    key={l.id || "default"}
                    type="button"
                    onClick={() => setLens(l.id)}
                    className={`rounded-md px-2 py-0.5 text-[10px] ${
                      lens === l.id
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
                {explainBasket.length > 0 && (
                  <span className="ml-auto text-[10px] text-muted-foreground">
                    +{explainBasket.length} file
                    {explainBasket.length === 1 ? "" : "s"} in basket
                    {explainBasket.map((f) => (
                      <button
                        key={`${f.path}:${f.start_line}`}
                        type="button"
                        className="ml-1 underline"
                        onClick={() => f.path && removeFromExplainBasket(f.path)}
                      >
                        {f.path?.split("/").pop()}
                      </button>
                    ))}
                  </span>
                )}
              </div>

              {/* Answer area */}
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-2">
                {asking && (
                  <div className="flex h-full flex-col items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="size-5 animate-spin text-teal-600" />
                    <p>Reading your selection…</p>
                  </div>
                )}
                {!asking && askError && (
                  <p className="text-xs text-destructive">
                    {askError}{" "}
                    {askError.toLowerCase().includes("api key") && (
                      <Link href="/settings" className="underline">
                        Settings
                      </Link>
                    )}
                  </p>
                )}
                {!asking && answer && (
                  <div className="space-y-2">
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={copyAnswer}
                        className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        {copied ? (
                          <>
                            <Check className="size-3 text-emerald-600" /> Copied
                          </>
                        ) : (
                          <>
                            <Copy className="size-3" /> Copy
                          </>
                        )}
                      </button>
                    </div>
                    <MarkdownBody content={answer} className="max-h-none" />
                  </div>
                )}
                {!asking && !answer && !askError && (
                  <div className="flex h-full flex-col justify-center gap-1 text-center text-xs text-muted-foreground">
                    <p className="font-medium text-foreground">Ask about this selection</p>
                    <p>Pick a quick action above, or type your own question and hit Enter.</p>
                  </div>
                )}
              </div>

              {/* Input */}
              <form
                onSubmit={submitAsk}
                className="flex shrink-0 items-center gap-2 border-t bg-muted/20 px-3 py-2"
              >
                <Input
                  ref={inputRef}
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Ask follow-up… Enter to send"
                  disabled={asking}
                  className="h-8 flex-1 text-sm"
                />
                <Button type="submit" size="sm" disabled={asking}>
                  {asking ? <Loader2 className="size-3.5 animate-spin" /> : "Ask"}
                </Button>
              </form>

              {/* Resize handle */}
              <div
                className="absolute bottom-0 right-0 z-10 flex size-5 cursor-se-resize items-end justify-end p-0.5"
                onPointerDown={onResizeStart}
                onPointerMove={onResizeMove}
                onPointerUp={onResizeEnd}
                onPointerCancel={onResizeEnd}
                title="Drag to resize"
              >
                <svg width="10" height="10" viewBox="0 0 10 10" className="text-muted-foreground/70">
                  <path
                    d="M9 1L1 9M9 5L5 9M9 9H9"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    fill="none"
                  />
                </svg>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function IconBtn({
  children,
  onClick,
  label,
}: {
  children: React.ReactNode
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      onPointerDown={(e) => e.stopPropagation()}
      className="rounded-md p-1 text-muted-foreground transition hover:bg-muted hover:text-foreground"
    >
      {children}
    </button>
  )
}
