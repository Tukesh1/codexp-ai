"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { MessageSquare, Send, Sparkles } from "lucide-react"
import { api, type Project } from "@/lib/api"
import { useWorkspace } from "@/lib/workspace"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@workspace/ui/components/sheet"

type ChatMessage = {
  id?: string
  role: "user" | "assistant"
  content: string
}

export function GlobalAskPanel() {
  const { activeProjectId, setActiveProjectId, askOpen, setAskOpen } = useWorkspace()
  const [projects, setProjects] = useState<Project[]>([])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [question, setQuestion] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!askOpen) return
    api
      .listProjects()
      .then((res) => {
        const list = res.projects || []
        setProjects(list)
        if (!activeProjectId && list[0]) {
          setActiveProjectId(list[0].id)
        }
      })
      .catch(() => undefined)
  }, [askOpen, activeProjectId, setActiveProjectId])

  useEffect(() => {
    if (!askOpen || !activeProjectId) {
      setMessages([])
      return
    }
    setError(null)
    api
      .getChat(activeProjectId)
      .then((res) => {
        setMessages(
          (res.messages || []).map((m) => ({
            id: m.id,
            role: m.role === "assistant" ? "assistant" : "user",
            content: m.content,
          }))
        )
      })
      .catch(() => setMessages([]))
  }, [askOpen, activeProjectId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, busy])

  const activeName = useMemo(
    () => projects.find((p) => p.id === activeProjectId)?.name || "Select a project",
    [projects, activeProjectId]
  )

  async function onAsk(e?: React.FormEvent) {
    e?.preventDefault()
    if (!activeProjectId || !question.trim() || busy) return
    const q = question.trim()
    setQuestion("")
    setBusy(true)
    setError(null)
    setMessages((prev) => [...prev, { role: "user", content: q }])
    try {
      const res = await api.ask(activeProjectId, q)
      setMessages((prev) => [...prev, { role: "assistant", content: res.answer }])
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Ask failed"
      setError(msg)
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Could not answer: ${msg}` },
      ])
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setAskOpen(true)}
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-lg transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Open Ask AI"
      >
        <MessageSquare className="size-4" />
        Ask AI
      </button>

      <Sheet open={askOpen} onOpenChange={setAskOpen}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md">
          <SheetHeader className="border-b px-4 py-4 text-left">
            <SheetTitle className="flex items-center gap-2">
              <Sparkles className="size-4" />
              Ask about your code
            </SheetTitle>
            <SheetDescription className="mt-1">
              Available from anywhere. Answers use your configured AI key and project analysis.
            </SheetDescription>
            <div className="mt-3 space-y-1">
              <label className="text-xs font-medium text-muted-foreground" htmlFor="ask-project">
                Project
              </label>
              <select
                id="ask-project"
                className="flex h-9 w-full rounded-md border bg-transparent px-3 text-sm"
                value={activeProjectId || ""}
                onChange={(e) => setActiveProjectId(e.target.value || null)}
              >
                <option value="" disabled>
                  Select a project…
                </option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </SheetHeader>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {projects.length === 0 && (
              <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                No projects yet.{" "}
                <Link href="/projects/new" className="underline" onClick={() => setAskOpen(false)}>
                  Create one
                </Link>{" "}
                to start asking questions.
              </div>
            )}

            {activeProjectId && messages.length === 0 && !busy && (
              <div className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">{activeName}</p>
                <p className="mt-1">
                  Try: “What does the auth flow do?” or “Where are API routes defined?”
                </p>
              </div>
            )}

            {messages.map((m, i) => (
              <div
                key={m.id || `${m.role}-${i}`}
                className={`rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                  m.role === "user"
                    ? "ml-6 bg-primary text-primary-foreground"
                    : "mr-4 border bg-card text-muted-foreground"
                }`}
              >
                {m.content}
              </div>
            ))}
            {busy && (
              <p className="text-xs text-muted-foreground animate-pulse">Thinking…</p>
            )}
            {error && (
              <p className="text-xs text-destructive">
                {error.toLowerCase().includes("api key") ? (
                  <>
                    {error}{" "}
                    <Link href="/settings" className="underline" onClick={() => setAskOpen(false)}>
                      Open Settings
                    </Link>
                  </>
                ) : (
                  error
                )}
              </p>
            )}
            <div ref={bottomRef} />
          </div>

          <form onSubmit={onAsk} className="border-t p-4">
            <div className="flex gap-2">
              <Input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder={activeProjectId ? "Ask a question…" : "Select a project first"}
                disabled={!activeProjectId || busy}
              />
              <Button type="submit" size="icon" disabled={!activeProjectId || busy || !question.trim()}>
                <Send className="size-4" />
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </>
  )
}
