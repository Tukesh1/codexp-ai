"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { AppShell } from "@/components/app-shell"
import { api, type Project } from "@/lib/api"
import { Button } from "@workspace/ui/components/button"
import { Plus, Trash2 } from "lucide-react"

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  async function load() {
    setLoading(true)
    try {
      const res = await api.listProjects()
      setProjects(res.projects || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
  }, [])

  async function onDelete(id: string) {
    if (!confirm("Delete this project?")) return
    await api.deleteProject(id)
    await load()
  }

  return (
    <AppShell title="Projects">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          All repositories connected to your workspace.
        </p>
        <Button asChild>
          <Link href="/projects/new">
            <Plus className="size-4" />
            New project
          </Link>
        </Button>
      </div>

      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="overflow-hidden rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Repository</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Created</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p.id} className="border-t">
                <td className="px-4 py-3">
                  <Link href={`/projects/${p.id}`} className="font-medium hover:underline">
                    {p.name}
                  </Link>
                </td>
                <td className="max-w-[240px] truncate px-4 py-3 text-muted-foreground">
                  {p.repo_url}
                </td>
                <td className="px-4 py-3 capitalize">{p.status}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(p.created_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-right">
                  <Button variant="ghost" size="icon" onClick={() => onDelete(p.id)}>
                    <Trash2 className="size-4" />
                  </Button>
                </td>
              </tr>
            ))}
            {!loading && projects.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-muted-foreground">
                  No projects yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AppShell>
  )
}
