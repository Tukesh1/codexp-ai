"use client"

import ReactMarkdown from "react-markdown"

export function MarkdownBody({
  content,
  className = "",
}: {
  content: string
  className?: string
}) {
  const text = content.trim()
  if (!text) return null

  return (
    <div
      className={`markdown-body max-h-[360px] overflow-y-auto text-sm leading-relaxed text-muted-foreground ${className}`}
    >
      <ReactMarkdown
        components={{
          h1: ({ children }) => (
            <h1 className="mb-2 mt-3 text-base font-semibold text-foreground first:mt-0">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="mb-2 mt-3 text-sm font-semibold text-foreground first:mt-0">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="mb-1.5 mt-2.5 text-sm font-semibold text-foreground first:mt-0">{children}</h3>
          ),
          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
          ul: ({ children }) => (
            <ul className="mb-2 list-disc space-y-1 pl-5 last:mb-0">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-2 list-decimal space-y-1 pl-5 last:mb-0">{children}</ol>
          ),
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-teal-700 underline-offset-2 hover:underline dark:text-teal-400"
            >
              {children}
            </a>
          ),
          code: ({ children, className: codeClass }) => {
            const isBlock = Boolean(codeClass)
            if (isBlock) {
              return (
                <code className="block overflow-x-auto rounded-md bg-muted px-2 py-1.5 font-mono text-[11px] text-foreground">
                  {children}
                </code>
              )
            }
            return (
              <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px] text-foreground">
                {children}
              </code>
            )
          },
          pre: ({ children }) => (
            <pre className="mb-2 overflow-x-auto rounded-lg border bg-muted/50 p-2 last:mb-0">
              {children}
            </pre>
          ),
          blockquote: ({ children }) => (
            <blockquote className="mb-2 border-l-2 border-teal-600/40 pl-3 italic last:mb-0">
              {children}
            </blockquote>
          ),
          hr: () => <hr className="my-3 border-border" />,
          strong: ({ children }) => (
            <strong className="font-semibold text-foreground">{children}</strong>
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  )
}
