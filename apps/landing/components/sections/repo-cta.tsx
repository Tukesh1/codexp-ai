"use client"

import { useMemo, useState } from "react"
import { ArrowRight } from "lucide-react"
import { APP_URL } from "@/config/site"

function parseGitHubRepo(input: string): { owner: string; repo: string; url: string } | null {
  const raw = input.trim().replace(/\.git$/i, "")
  if (!raw) return null

  if (/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(raw)) {
    const [owner, repo] = raw.split("/")
    if (!owner || !repo) return null
    return { owner, repo, url: `https://github.com/${owner}/${repo}` }
  }

  try {
    const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
    const u = new URL(withProtocol)
    if (!/^(www\.)?github\.com$/i.test(u.hostname)) return null
    const parts = u.pathname.split("/").filter(Boolean)
    if (parts.length < 2) return null
    const [owner, repo] = parts
    if (!owner || !repo) return null
    return { owner, repo, url: `https://github.com/${owner}/${repo}` }
  } catch {
    return null
  }
}

export function RepoCta() {
  const [repoInput, setRepoInput] = useState("")
  const parsed = useMemo(() => parseGitHubRepo(repoInput), [repoInput])

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!parsed) return
    const dest = `${APP_URL}/projects/new?repo=${encodeURIComponent(parsed.url)}`
    window.location.href = dest
  }

  return (
    <form onSubmit={onSubmit}>
      <label
        className="mb-2 block font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.2em] text-[var(--fg-muted)]"
        htmlFor="landing-repo"
      >
        GitHub repository
      </label>

      <div className="flex h-12 items-stretch border border-[var(--line)] bg-[var(--bg-elevated)] focus-within:border-[var(--fg)]">
        <input
          id="landing-repo"
          value={repoInput}
          onChange={(e) => setRepoInput(e.target.value)}
          placeholder="owner/repo"
          autoComplete="off"
          spellCheck={false}
          className="min-w-0 flex-1 bg-transparent px-3.5 font-[family-name:var(--font-mono)] text-sm text-[var(--fg)] placeholder:text-[var(--fg-muted)]/45 outline-none"
        />
        <button
          type="submit"
          disabled={!parsed}
          className="inline-flex shrink-0 items-center gap-1.5 border-l border-[var(--line)] bg-[var(--fg)] px-4 text-sm font-semibold text-[var(--inverse)] transition hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-25"
        >
          Analyze
          <ArrowRight className="size-3.5" />
        </button>
      </div>

      {parsed ? (
        <p className="mt-2 font-[family-name:var(--font-mono)] text-xs text-[var(--fg-muted)]">
          <span className="text-[var(--fg)]">{parsed.repo}</span>
          <span className="mx-1.5 opacity-30">·</span>
          {parsed.owner}/{parsed.repo}
        </p>
      ) : (
        <p className="mt-2 font-[family-name:var(--font-mono)] text-xs text-[var(--fg-muted)]">
          {repoInput.trim() ? "Waiting for a valid URL" : "e.g. pytorch/pytorch"}
        </p>
      )}
    </form>
  )
}
