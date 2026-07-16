"use client"

import { useEffect, useId, useState } from "react"

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
  return text
}

export function MermaidDiagram({ chart }: { chart: string }) {
  const reactId = useId().replace(/:/g, "")
  const [svg, setSvg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

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
          theme: "neutral",
          fontFamily: "inherit",
        })
        const { svg: rendered } = await mermaid.render(`mermaid-${reactId}`, source)
        if (!cancelled) {
          setSvg(rendered)
          setError(null)
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
      <div className="space-y-3">
        <p className="text-sm text-destructive">Could not render diagram: {error}</p>
        <pre className="overflow-auto whitespace-pre-wrap rounded-lg bg-muted/40 p-4 font-mono text-xs">
          {sanitizeMermaid(chart)}
        </pre>
      </div>
    )
  }

  if (!svg) {
    return <p className="text-sm text-muted-foreground">Rendering diagram…</p>
  }

  return (
    <div
      className="overflow-auto rounded-lg bg-muted/20 p-4 [&_svg]:mx-auto [&_svg]:max-w-full"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}
