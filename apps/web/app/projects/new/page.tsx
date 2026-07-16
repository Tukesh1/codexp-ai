"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AppShell } from "@/components/app-shell"
import { api } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"

export default function NewProjectPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [name, setName] = useState("")
  const [repoUrl, setRepoUrl] = useState("")
  const [analyzeNow, setAnalyzeNow] = useState(true)
  const [hasKey, setHasKey] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    api
      .getSettings()
      .then((s) => setHasKey(s.has_api_key))
      .catch(() => setHasKey(user?.has_api_key ?? false))
  }, [user?.has_api_key])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const project = await api.createProject(name, repoUrl)
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
      {hasKey === false && (
        <div className="mx-auto w-full max-w-xl rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm">
          Add your OpenAI or Gemini API key in{" "}
          <Link href="/settings" className="font-medium underline">
            Settings
          </Link>{" "}
          before starting AI analysis.
        </div>
      )}

      <form onSubmit={onSubmit} className="mx-auto w-full max-w-xl space-y-5 rounded-xl border bg-card p-6">
        <div>
          <h2 className="text-lg font-semibold">Analyze a GitHub repository</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            AI will clone the repo, extract structure, then generate an overview and architecture diagram with your API key.
          </p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="name">
            Project name
          </label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="My API"
            required
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="repo">
            GitHub URL
          </label>
          <Input
            id="repo"
            value={repoUrl}
            onChange={(e) => setRepoUrl(e.target.value)}
            placeholder="https://github.com/owner/repo"
            required
          />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={analyzeNow}
            onChange={(e) => setAnalyzeNow(e.target.checked)}
          />
          Start AI analysis immediately
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

        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? "Creating…" : "Create project"}
        </Button>
      </form>
    </AppShell>
  )
}
