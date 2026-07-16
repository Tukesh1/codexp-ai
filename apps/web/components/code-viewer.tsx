"use client"

import { useEffect, useState } from "react"
import { ExternalLink, Loader2 } from "lucide-react"
import { api, type FileContent } from "@/lib/api"

function formatBytes(n?: number | null) {
  if (n == null) return "—"
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

export function CodeViewer({
  projectId,
  path,
}: {
  projectId: string
  path: string | null
}) {
  const [data, setData] = useState<FileContent | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!path) {
      setData(null)
      setError(null)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)
    api
      .getFileContent(projectId, path)
      .then((res) => {
        if (!cancelled) setData(res)
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

  if (!path) {
    return (
      <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Browse the repository</p>
        <p>Select a file in the tree to view source, like on GitHub.</p>
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

  const lines = (data?.content || "").split("\n")
  const empty = !data?.content

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/30 px-3 py-2">
        <div className="min-w-0">
          <p className="truncate font-mono text-xs font-medium">{path}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {data?.language || "unknown"} · {formatBytes(data?.size_bytes)}
            {data?.source === "github" ? " · from GitHub" : ""}
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

      {data?.symbols && data.symbols.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-b px-3 py-2">
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
        <div className="min-h-0 flex-1 overflow-auto bg-[oklch(0.98_0_0)] dark:bg-[oklch(0.18_0_0)]">
          <table className="w-full border-collapse font-mono text-[12px] leading-5">
            <tbody>
              {lines.map((line, i) => (
                <tr key={i} className="hover:bg-black/[0.03] dark:hover:bg-white/[0.04]">
                  <td className="w-12 select-none border-r px-2 py-0 text-right text-muted-foreground/70 align-top">
                    {i + 1}
                  </td>
                  <td className="whitespace-pre px-3 py-0 text-foreground/90">{line || " "}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
