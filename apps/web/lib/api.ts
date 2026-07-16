const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"

export type User = {
  id: string
  clerk_id: string
  email: string
  plan: string
  ai_provider?: string
  ai_model?: string
  has_api_key?: boolean
  created_at: string
  updated_at: string
}

export type UserSettings = {
  email: string
  plan: string
  ai_provider: string
  ai_model: string
  has_api_key: boolean
  has_openai_key: boolean
  has_gemini_key: boolean
  has_github_token: boolean
  api_key_preview?: string
  openai_key_preview?: string
  gemini_key_preview?: string
  github_token_preview?: string
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
  overview?: string | null
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

export type FileContent = {
  id: string
  path: string
  language?: string | null
  size_bytes?: number | null
  content?: string
  html_url?: string
  source?: string
  message?: string
  symbols?: Array<{
    id: string
    name: string
    entity_type: string
    signature?: string | null
    summary?: string | null
    start_line?: number
  }>
}

export type ChatMessage = {
  id: string
  role: string
  content: string
  metadata?: unknown
  created_at: string
}

export type ProjectInsights = {
  languages: Array<{ language: string; file_count: number; bytes: number }>
  extensions?: Array<{ extension: string; file_count: number; bytes: number }>
  folders: Array<{ folder: string; file_count: number; bytes: number }>
  largest_files?: Array<{ path: string; language: string; size_bytes: number }>
  key_files?: Array<{ path: string; language: string; size_bytes: number; kind: string }>
  top_functions?: Array<{ name: string; signature?: string; path: string; start_line?: number }>
  top_classes?: Array<{ name: string; path: string; start_line?: number }>
  activity: Array<{ date: string; jobs: number; completed: number; failed: number }>
  total_bytes: number
  total_files?: number
  function_count?: number
  class_count?: number
  embedding_count?: number
  chat_count?: number
  artifacts?: { overview?: boolean; diagram?: boolean; docs?: boolean }
  last_job_status?: string
  last_job_at?: string
  github?: {
    full_name: string
    description?: string
    default_branch?: string
    stars: number
    watchers?: number
    forks: number
    open_issues: number
    subscribers?: number
    network_count?: number
    size_kb?: number
    language?: string
    homepage?: string
    topics?: string[]
    license?: string
    license_name?: string
    created_at?: string
    updated_at?: string
    pushed_at?: string
    html_url: string
    clone_url?: string
    private?: boolean
    fork?: boolean
    archived?: boolean
    has_wiki?: boolean
    has_issues?: boolean
    has_projects?: boolean
    has_pages?: boolean
    visibility?: string
  }
  github_error?: string
  github_languages?: Array<{ language: string; bytes: number; percent: number }>
  github_languages_error?: string
  contributors?: Array<{
    login: string
    avatar_url?: string
    url?: string
    contributions: number
    type?: string
  }>
  contributors_error?: string
  releases?: Array<{
    tag: string
    name: string
    url: string
    published_at?: string
    prerelease?: boolean
    draft?: boolean
  }>
  releases_error?: string
  readme?: {
    name?: string
    path?: string
    url?: string
    size?: number
    excerpt?: string
  }
  readme_error?: string
  open_prs?: number
  open_prs_error?: string
  commits?: Array<{
    sha: string
    message: string
    author: string
    login?: string
    avatar_url?: string
    date: string
    url: string
  }>
  commits_error?: string
  commit_activity?: Array<{ date: string; count: number }>
  recent_authors?: Array<{ name: string; count: number }>
  github_token_configured?: boolean
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

  async getSettings() {
    return request<UserSettings>("/api/v1/settings")
  },

  async updateSettings(payload: {
    ai_provider?: string
    openai_api_key?: string
    gemini_api_key?: string
    github_token?: string
    ai_model?: string
    clear_api_key?: boolean
    clear_openai_key?: boolean
    clear_gemini_key?: boolean
    clear_github_token?: boolean
  }) {
    return request<UserSettings>("/api/v1/settings", {
      method: "PUT",
      body: JSON.stringify(payload),
    })
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

  async getFileContent(id: string, path: string) {
    return request<FileContent>(
      `/api/v1/projects/${id}/files/content?path=${encodeURIComponent(path)}`
    )
  },

  async getInsights(id: string, opts?: { github?: boolean }) {
    const q = opts?.github ? "?github=1" : ""
    return request<ProjectInsights>(`/api/v1/projects/${id}/insights${q}`)
  },

  async refreshGithubSection(id: string, section: string) {
    return request<Record<string, unknown>>(
      `/api/v1/projects/${id}/insights/github/${encodeURIComponent(section)}`
    )
  },

  async getChat(id: string) {
    return request<{ messages: ChatMessage[] }>(`/api/v1/projects/${id}/chat`)
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
    return request<{ format: string; content: string; status?: string; message?: string }>(
      `/api/v1/projects/${id}/docs`
    )
  },

  async generateDocs(id: string, force = false) {
    return request<{ format: string; content: string; cached?: boolean }>(
      `/api/v1/projects/${id}/docs`,
      {
        method: "POST",
        body: JSON.stringify({ force }),
      }
    )
  },

  async getDiagram(id: string) {
    return request<{
      format: string
      content?: string
      source?: string
      nodes?: Array<{ id: string; label: string; type: string }>
      edges?: Array<{ from: string; to: string; type: string }>
    }>(`/api/v1/projects/${id}/diagram`)
  },
}
