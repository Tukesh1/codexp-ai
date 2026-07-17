"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowRight, Github, Loader2 } from "lucide-react"
import { AppShell } from "@/components/app-shell"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"

/** Parse owner/repo from common GitHub URL shapes. */
function parseGitHubRepo(input: string): { owner: string; repo: string; url: string } | null {
  const raw = input.trim().replace(/\.git$/i, "")
  if (!raw) return null

  // owner/repo shorthand
  if (/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(raw)) {
    const [owner, repo] = raw.split("/")
    return {
      owner,
      repo,
      url: `https://github.com/${owner}/${repo}`,
    }
  }

  try {
    const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`
    const u = new URL(withProtocol)
    if (!/^(www\.)?github\.com$/i.test(u.hostname)) return null
    const parts = u.pathname.split("/").filter(Boolean)
    if (parts.length < 2) return null
    const owner = parts[0]
    const repo = parts[1]
    if (!owner || !repo) return null
    return {
      owner,
      repo,
      url: `https://github.com/${owner}/${repo}`,
    }
  } catch {
    return null
  }
}

export default function NewProjectPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [repoInput, setRepoInput] = useState("")
  const [analyzeNow, setAnalyzeNow] = useState(true)
  const [hasKey, setHasKey] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const parsed = useMemo(() => parseGitHubRepo(repoInput), [repoInput])

  useEffect(() => {
    api
      .getSettings()
      .then((s) => setHasKey(s.has_api_key))
      .catch(() => setHasKey(user?.has_api_key ?? false))
  }, [user?.has_api_key])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!parsed) {
      setError("Enter a valid GitHub URL or owner/repo.")
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const project = await api.createProject(parsed.repo, parsed.url)
      if (analyzeNow) {
        await api.analyzeProject(project.id)
      }
      router.push(`/projects/${project.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create project")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AppShell title="New project">
      <div className="mx-auto flex w-full max-w-lg flex-col justify-center gap-4 py-6">
        {hasKey === false && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
            Add an API key in{" "}
            <Link href="/settings" className="font-medium underline">
              Settings
            </Link>{" "}
            before analysis can run.
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4 rounded-xl border bg-card p-5">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
              <Github className="size-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold tracking-tight">Add a repository</h2>
              <p className="text-xs text-muted-foreground">
                Paste a GitHub link — we name the project from the repo.
              </p>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium" htmlFor="repo">
              GitHub repository
            </label>
            <Input
              id="repo"
              value={repoInput}
              onChange={(e) => {
                setRepoInput(e.target.value)
                setError(null)
              }}
              placeholder="https://github.com/owner/repo or owner/repo"
              autoFocus
              autoComplete="off"
              spellCheck={false}
              className="h-10 font-mono text-sm"
              required
            />
            {parsed ? (
              <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
                <span>
                  Project name:{" "}
                  <span className="font-medium text-foreground">{parsed.repo}</span>
                </span>
                <span className="text-muted-foreground/50">·</span>
                <span className="font-mono text-[11px]">
                  {parsed.owner}/{parsed.repo}
                </span>
              </p>
            ) : repoInput.trim() ? (
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Waiting for a valid GitHub URL…
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Example: <span className="font-mono">pytorch/pytorch</span>
              </p>
            )}
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={analyzeNow}
              onChange={(e) => setAnalyzeNow(e.target.checked)}
              className="size-3.5 rounded border"
            />
            Start analysis after creating
          </label>

          {error && (
            <p className="text-sm text-destructive">
              {error}{" "}
              {error.toLowerCase().includes("api key") && (
                <Link href="/settings" className="underline">
                  Open Settings
                </Link>
              )}
            </p>
          )}

          <Button
            type="submit"
            disabled={submitting || !parsed}
            className="w-full"
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Creating…
              </>
            ) : (
              <>
                {analyzeNow ? "Create & analyze" : "Create project"}
                <ArrowRight className="size-4" />
              </>
            )}
          </Button>
        </form>
      </div>
    </AppShell>
  )
}
