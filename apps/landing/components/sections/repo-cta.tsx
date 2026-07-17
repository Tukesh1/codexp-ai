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

export function RepoCta({ compact = false }: { compact?: boolean }) {
  const [repoInput, setRepoInput] = useState("")
  const parsed = useMemo(() => parseGitHubRepo(repoInput), [repoInput])

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!parsed) return
    const dest = `${APP_URL}/projects/new?repo=${encodeURIComponent(parsed.url)}`
    window.location.href = dest
  }

  return (
    <form
      onSubmit={onSubmit}
      className={`border border-[var(--line)] bg-[var(--bg-elevated)] ${
        compact ? "p-4" : "p-5"
      }`}
    >
      <label
        className="block font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.18em] text-[var(--fg-muted)]"
        htmlFor="landing-repo"
      >
        GitHub repository
      </label>
      <div className="mt-2.5 flex flex-col gap-2 sm:flex-row">
        <input
          id="landing-repo"
          value={repoInput}
          onChange={(e) => setRepoInput(e.target.value)}
          placeholder="owner/repo or github.com/…"
          autoComplete="off"
          spellCheck={false}
          className="h-11 flex-1 border border-[var(--line)] bg-[var(--bg)] px-3 font-[family-name:var(--font-mono)] text-sm text-[var(--fg)] placeholder:text-[var(--fg-muted)]/50 outline-none transition focus:border-[var(--fg)]"
        />
        <button
          type="submit"
          disabled={!parsed}
          className="inline-flex h-11 items-center justify-center gap-2 bg-[var(--fg)] px-5 text-sm font-semibold text-[var(--inverse)] transition hover:opacity-85 disabled:cursor-not-allowed disabled:opacity-30"
        >
          Analyze
          <ArrowRight className="size-4" />
        </button>
      </div>

      {parsed ? (
        <p className="mt-2.5 font-[family-name:var(--font-mono)] text-[11px] text-[var(--fg-muted)]">
          <span className="text-[var(--fg)]">{parsed.repo}</span>
          <span className="mx-1.5 opacity-30">·</span>
          {parsed.owner}/{parsed.repo}
        </p>
      ) : repoInput.trim() ? (
        <p className="mt-2.5 font-[family-name:var(--font-mono)] text-[11px] text-[var(--fg-muted)]">
          Waiting for a valid URL…
        </p>
      ) : (
        <p className="mt-2.5 font-[family-name:var(--font-mono)] text-[11px] text-[var(--fg-muted)]">
          e.g. pytorch/pytorch
        </p>
      )}
    </form>
  )
}
