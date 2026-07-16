"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { AppShell } from "@/components/app-shell"
import { api, type Project } from "@/lib/api"
import { Button } from "@workspace/ui/components/button"
import { FolderGit2, Plus } from "lucide-react"

function statusColor(status: string) {
  switch (status) {
    case "completed":
      return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
    case "analyzing":
    case "running":
      return "bg-amber-500/15 text-amber-700 dark:text-amber-400"
    case "failed":
      return "bg-red-500/15 text-red-600 dark:text-red-400"
    default:
      return "bg-muted text-muted-foreground"
  }
}

export default function DashboardPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api
      .listProjects()
      .then((res) => setProjects(res.projects || []))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const completed = projects.filter((p) => p.status === "completed").length
  const analyzing = projects.filter((p) => p.status === "analyzing").length

  return (
    <AppShell title="Dashboard">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Projects" value={projects.length} />
        <StatCard label="Analyzed" value={completed} />
        <StatCard label="In progress" value={analyzing} />
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Recent projects</h2>
        <Button asChild>
          <Link href="/projects/new">
            <Plus className="size-4" />
            New project
          </Link>
        </Button>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Loading projects…</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}

      {!loading && !error && projects.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-16 text-center">
          <FolderGit2 className="size-10 text-muted-foreground" />
          <div>
            <p className="font-medium">No projects yet</p>
            <p className="text-sm text-muted-foreground">
              Paste a GitHub repo URL to start analyzing.
            </p>
          </div>
          <Button asChild>
            <Link href="/projects/new">Create your first project</Link>
          </Button>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {projects.slice(0, 6).map((project) => (
          <Link
            key={project.id}
            href={`/projects/${project.id}`}
            className="rounded-xl border bg-card p-4 transition-colors hover:bg-accent/40"
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-medium">{project.name}</h3>
              <span className={`rounded-full px-2 py-0.5 text-xs capitalize ${statusColor(project.status)}`}>
                {project.status}
              </span>
            </div>
            <p className="mt-2 truncate text-xs text-muted-foreground">
              {project.repo_url || "No repo URL"}
            </p>
          </Link>
        ))}
      </div>
    </AppShell>
  )
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-3xl font-semibold tracking-tight">{value}</p>
    </div>
  )
}
