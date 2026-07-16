const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"

export type User = {
  id: string
  clerk_id: string
  email: string
  plan: string
  created_at: string
  updated_at: string
}

export type Project = {
  id: string
  user_id: string
  name: string
  repo_url?: string | null
  github_repo_id?: number | null
  status: string
  settings?: unknown
  created_at: string
  updated_at: string
}

export type ProjectSummary = {
  project_id: string
  status: string
  file_count: number
  function_count: number
  class_count: number
  languages: Record<string, number>
  summary?: string | null
  last_analysis_at?: string | null
}

export type FileRecord = {
  id: string
  project_id: string
  path: string
  language?: string | null
  size_bytes?: number | null
  last_analyzed?: string | null
  created_at: string
}

export type Job = {
  id: string
  project_id?: string
  type: string
  status: string
  progress: number
  error_message?: string | null
  created_at: string
  updated_at: string
}

function getToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem("codeexp_token")
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return
  if (token) localStorage.setItem("codeexp_token", token)
  else localStorage.removeItem("codeexp_token")
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  }
  if (token) {
    ;(headers as Record<string, string>)["Authorization"] = `Bearer ${token}`
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  })

  if (!res.ok) {
    let message = `Request failed (${res.status})`
    try {
      const body = await res.json()
      message = body.error || body.detail || message
    } catch {
      /* ignore */
    }
    throw new Error(message)
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export const api = {
  async devLogin(email: string, name?: string) {
    return request<{ token: string; user: User }>("/api/v1/auth/dev-login", {
      method: "POST",
      body: JSON.stringify({ email, name }),
    })
  },

  async me() {
    return request<User>("/api/v1/auth/me")
  },

  async listProjects() {
    return request<{ projects: Project[] }>("/api/v1/projects")
  },

  async createProject(name: string, repo_url: string) {
    return request<Project>("/api/v1/projects", {
      method: "POST",
      body: JSON.stringify({ name, repo_url }),
    })
  },

  async getProject(id: string) {
    return request<Project>(`/api/v1/projects/${id}`)
  },

  async deleteProject(id: string) {
    return request<{ message: string }>(`/api/v1/projects/${id}`, {
      method: "DELETE",
    })
  },

  async analyzeProject(id: string, force = false) {
    return request<{ message: string; job_id: string; status: string }>(
      `/api/v1/projects/${id}/analyze`,
      {
        method: "POST",
        body: JSON.stringify({ force_reanalysis: force }),
      }
    )
  },

  async getStatus(id: string) {
    return request<{ jobs: Job[] }>(`/api/v1/projects/${id}/status`)
  },

  async getSummary(id: string) {
    return request<ProjectSummary>(`/api/v1/projects/${id}/summary`)
  },

  async getFiles(id: string) {
    return request<{ files: FileRecord[] }>(`/api/v1/projects/${id}/files`)
  },

  async searchCode(id: string, q: string) {
    return request<{ results: Array<Record<string, unknown>> }>(
      `/api/v1/projects/${id}/search?q=${encodeURIComponent(q)}`
    )
  },

  async ask(id: string, question: string) {
    return request<{ answer: string; sources: Array<Record<string, unknown>>; question: string }>(
      `/api/v1/projects/${id}/ask`,
      {
        method: "POST",
        body: JSON.stringify({ question }),
      }
    )
  },

  async getDocs(id: string) {
    return request<{ format: string; content: string }>(`/api/v1/projects/${id}/docs`)
  },

  async getDiagram(id: string) {
    return request<{
      format: string
      nodes: Array<{ id: string; label: string; type: string }>
      edges: Array<{ from: string; to: string; type: string }>
    }>(`/api/v1/projects/${id}/diagram`)
  },
}
