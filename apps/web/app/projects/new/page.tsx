"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { AppShell } from "@/components/app-shell"
import { api } from "@/lib/api"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"

export default function NewProjectPage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [repoUrl, setRepoUrl] = useState("")
  const [analyzeNow, setAnalyzeNow] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

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
      <form onSubmit={onSubmit} className="mx-auto w-full max-w-xl space-y-5 rounded-xl border bg-card p-6">
        <div>
          <h2 className="text-lg font-semibold">Analyze a GitHub repository</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Provide a public repo URL. Analysis runs in the background via the AI worker.
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
          Start analysis immediately
        </label>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <Button type="submit" disabled={submitting} className="w-full">
          {submitting ? "Creating…" : "Create project"}
        </Button>
      </form>
    </AppShell>
  )
}
