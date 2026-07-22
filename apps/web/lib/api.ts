const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080").replace(
  /\/$/,
  ""
)

export function getApiUrl(): string {
  return API_BASE
}

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

export type Note = {
  id: string
  project_id: string
  user_id: string
  path: string
  start_line?: number | null
  end_line?: number | null
  symbol_name?: string | null
  content: string
  created_at: string
  updated_at: string
}

export type AskContext = {
  path?: string
  code: string
  language?: string
  start_line?: number
  end_line?: number
}

export type Readiness = {
  file_count: number
  function_count: number
  class_count: number
  embedding_count: number
  embedded_functions?: number
  embedded_classes?: number
  has_overview: boolean
  has_diagram: boolean
  has_docs: boolean
  coverage_pct: number
  dead_end_files?: Array<{ path: string; reason: string; size_bytes?: number }>
  vendor_paths?: string[]
  score: number
  label: string
  detail?: string
}

export type ConceptCluster = {
  id: string
  name: string
  size: number
  method?: string
  symbols: Array<{ id?: string; name: string; path: string; kind: string }>
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

  let res: Response
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
    })
  } catch {
    throw new Error(
      `Failed to fetch, cannot reach API at ${API_BASE}. Set NEXT_PUBLIC_API_URL on Vercel and redeploy.`
    )
  }

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

  async ask(
    id: string,
    question: string,
    context?: AskContext,
    opts?: { lens?: string; files?: AskContext[] }
  ) {
    return request<{ answer: string; sources: Array<Record<string, unknown>>; question: string }>(
      `/api/v1/projects/${id}/ask`,
      {
        method: "POST",
        body: JSON.stringify({
          question,
          ...(opts?.lens ? { lens: opts.lens } : {}),
          ...(opts?.files?.length
            ? {
                files: opts.files.map((f) => ({
                  path: f.path || "",
                  code: f.code,
                  language: f.language || "",
                  start_line: f.start_line || 0,
                  end_line: f.end_line || 0,
                })),
              }
            : {}),
          ...(context?.code
            ? {
                context: {
                  path: context.path || "",
                  code: context.code,
                  language: context.language || "",
                  start_line: context.start_line || 0,
                  end_line: context.end_line || 0,
                },
              }
            : {}),
        }),
      }
    )
  },

  async getReadiness(id: string) {
    return request<Readiness>(`/api/v1/projects/${id}/readiness`)
  },

  async getConcepts(id: string) {
    return request<{
      clusters: ConceptCluster[]
      method?: string
      message?: string
      cached?: boolean
    }>(`/api/v1/projects/${id}/concepts`)
  },

  async getDeadEnds(id: string) {
    return request<{
      files: Array<{ path: string; reason: string; size_bytes?: number; language?: string }>
      tiny_file_folders?: Array<{ folder: string; file_count: number; avg_size: number }>
    }>(`/api/v1/projects/${id}/dead-ends`)
  },

  async getChanges(id: string) {
    return request<{
      baseline?: boolean
      message?: string
      added?: string[]
      removed?: string[]
      cached?: boolean
      generated_at?: string
    }>(`/api/v1/projects/${id}/changes`)
  },

  async getSymbolGraph(id: string, name: string, path?: string) {
    const q = new URLSearchParams({ name })
    if (path) q.set("path", path)
    return request<{
      symbol: { name: string; path: string; kind?: string; id?: string; start_line?: number }
      callers: Array<{ name?: string; path?: string; kind?: string; line?: number; url?: string; source?: string }>
      callees: Array<{ name?: string; path?: string; kind?: string; line?: number; url?: string; source?: string }>
      related: Array<{ name: string; path: string; kind?: string; id?: string }>
    }>(`/api/v1/projects/${id}/graph?${q.toString()}`)
  },

  async listNotes(id: string, path?: string) {
    const q = path ? `?path=${encodeURIComponent(path)}` : ""
    return request<{ notes: Note[] }>(`/api/v1/projects/${id}/notes${q}`)
  },

  async createNote(
    id: string,
    payload: {
      path: string
      content: string
      start_line?: number
      end_line?: number
      symbol_name?: string
    }
  ) {
    return request<Note>(`/api/v1/projects/${id}/notes`, {
      method: "POST",
      body: JSON.stringify(payload),
    })
  },

  async updateNote(id: string, noteId: string, payload: { content?: string }) {
    return request<Note>(`/api/v1/projects/${id}/notes/${noteId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    })
  },

  async deleteNote(id: string, noteId: string) {
    return request<void>(`/api/v1/projects/${id}/notes/${noteId}`, {
      method: "DELETE",
    })
  },

  async generateQuiz(id: string) {
    return request<{
      id: string
      project_id: string
      quiz: {
        questions: Array<{
          question: string
          options: string[]
          correct_index?: number
          explanation?: string
        }>
      }
      created_at: string
    }>(`/api/v1/projects/${id}/quiz/generate`, { method: "POST" })
  },

  async submitQuiz(id: string, attemptId: string, answers: number[]) {
    return request<{
      attempt_id: string
      score: number
      correct: number
      total: number
      results: Array<{
        question: string
        user_answer: number
        correct_answer: number
        is_correct: boolean
        explanation: string
        correct_option?: string
        selected_option?: string
      }>
    }>(`/api/v1/projects/${id}/quiz/${attemptId}/submit`, {
      method: "POST",
      body: JSON.stringify({ answers }),
    })
  },

  async latestQuiz(id: string) {
    return request<{
      id: string
      quiz: unknown
      answers?: unknown
      score?: number
      created_at: string
    }>(`/api/v1/projects/${id}/quiz/latest`)
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
