"use client"

import { useEffect, useId, useState } from "react"
import { Maximize2, Minimize2, RotateCcw, ZoomIn, ZoomOut } from "lucide-react"

function stripFences(source: string): string {
  let text = source.trim()
  if (text.startsWith("```")) {
    text = text.replace(/^```(?:mermaid)?\s*/i, "").replace(/\s*```$/, "")
  }
  return text.trim()
}

/** Fix common LLM Mermaid mistakes so diagrams actually render. */
function sanitizeMermaid(source: string): string {
  let text = stripFences(source)
  // Ensure a diagram type exists
  if (!/^\s*(flowchart|graph|sequenceDiagram|classDiagram|stateDiagram|erDiagram|journey|gantt|pie|mindmap)\b/i.test(text)) {
    text = `flowchart TD\n${text}`
  }
  // Normalize graph LR/TD → flowchart
  text = text.replace(/^\s*graph\s+(TD|TB|BT|RL|LR)/im, "flowchart $1")
  // subgraph Core Application Logic  →  subgraph s1["Core Application Logic"]
  let subgraphIdx = 0
  text = text.replace(
    /^(\s*subgraph\s+)(?!["\[])([^\n]+)$/gim,
    (_match, prefix: string, label: string) => {
      const trimmed = label.trim()
      if (!trimmed || /^[\w-]+$/.test(trimmed)) return `${prefix}${trimmed}`
      subgraphIdx += 1
      const id = `sg${subgraphIdx}`
      return `${prefix}${id}["${trimmed.replace(/"/g, "'")}"]`
    }
  )
  // Drop style lines that often break rendering with bad colors
  text = text
    .split("\n")
    .filter((line) => !/^\s*style\s+/i.test(line) && !/^\s*classDef\s+/i.test(line))
    .join("\n")
  return text.trim()
}

export function MermaidDiagram({
  chart,
  caption,
}: {
  chart: string
  caption?: string
}) {
  const reactId = useId().replace(/:/g, "")
  const [svg, setSvg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    let cancelled = false
    const source = sanitizeMermaid(chart)
    if (!source) {
      setSvg(null)
      setError("Empty diagram")
      return
    }

    ;(async () => {
      try {
        const mermaid = (await import("mermaid")).default
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "loose",
          theme: "base",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
          flowchart: {
            curve: "basis",
            padding: 16,
            htmlLabels: true,
            nodeSpacing: 36,
            rankSpacing: 48,
          },
          themeVariables: {
            primaryColor: "#ccfbf1",
            primaryTextColor: "#134e4a",
            primaryBorderColor: "#0d9488",
            secondaryColor: "#dbeafe",
            secondaryTextColor: "#1e3a8a",
            secondaryBorderColor: "#2563eb",
            tertiaryColor: "#f1f5f9",
            lineColor: "#64748b",
            textColor: "#0f172a",
            mainBkg: "#f8fafc",
            nodeBorder: "#0d9488",
            clusterBkg: "#f1f5f9",
            clusterBorder: "#94a3b8",
            titleColor: "#0f172a",
            edgeLabelBackground: "#ffffff",
          },
        })
        const { svg: rendered } = await mermaid.render(`mermaid-${reactId}-${Date.now()}`, source)
        if (!cancelled) {
          setSvg(rendered)
          setError(null)
          setZoom(1)
        }
      } catch (err) {
        if (!cancelled) {
          setSvg(null)
          setError(err instanceof Error ? err.message : "Failed to render diagram")
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [chart, reactId])

  if (error) {
    return (
      <div className="flex h-full flex-col gap-3 overflow-auto p-4">
        <p className="text-sm text-destructive">Could not render diagram: {error}</p>
        <pre className="overflow-auto whitespace-pre-wrap rounded-lg bg-muted/40 p-4 font-mono text-xs">
          {sanitizeMermaid(chart)}
        </pre>
      </div>
    )
  }

  if (!svg) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Rendering diagram…
      </div>
    )
  }

  return (
    <div className={`relative flex h-full min-h-0 flex-col ${expanded ? "fixed inset-4 z-50 rounded-xl border bg-card shadow-2xl" : ""}`}>
      <div className="flex shrink-0 items-center justify-between gap-2 border-b bg-muted/20 px-3 py-2">
        <p className="truncate text-xs text-muted-foreground">
          {caption || "Drag / scroll inside the canvas · use zoom controls"}
        </p>
        <div className="flex items-center gap-1">
          <ToolBtn label="Zoom out" onClick={() => setZoom((z) => Math.max(0.4, +(z - 0.15).toFixed(2)))}>
            <ZoomOut className="size-3.5" />
          </ToolBtn>
          <span className="min-w-10 text-center text-[11px] tabular-nums text-muted-foreground">
            {Math.round(zoom * 100)}%
          </span>
          <ToolBtn label="Zoom in" onClick={() => setZoom((z) => Math.min(2.5, +(z + 0.15).toFixed(2)))}>
            <ZoomIn className="size-3.5" />
          </ToolBtn>
          <ToolBtn label="Reset zoom" onClick={() => setZoom(1)}>
            <RotateCcw className="size-3.5" />
          </ToolBtn>
          <ToolBtn label={expanded ? "Exit fullscreen" : "Fullscreen"} onClick={() => setExpanded((v) => !v)}>
            {expanded ? <Minimize2 className="size-3.5" /> : <Maximize2 className="size-3.5" />}
          </ToolBtn>
        </div>
      </div>
      <div
        className="min-h-0 flex-1 overflow-auto overscroll-contain p-6"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, oklch(0.7 0 0 / 0.18) 1px, transparent 0)",
          backgroundSize: "18px 18px",
        }}
      >
        <div
          className="origin-top-left transition-transform duration-200 [&_svg]:max-w-none"
          style={{ transform: `scale(${zoom})`, width: `${100 / zoom}%` }}
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </div>
    </div>
  )
}

function ToolBtn({
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
      className="inline-flex size-7 items-center justify-center rounded-md border bg-background text-muted-foreground transition hover:bg-muted hover:text-foreground"
    >
      {children}
    </button>
  )
}
