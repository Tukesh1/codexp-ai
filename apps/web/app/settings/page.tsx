"use client"

import { useEffect, useState } from "react"
import { AppShell } from "@/components/app-shell"
import { api, type UserSettings } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"

const OPENAI_MODELS = [
  { value: "gpt-4o-mini", label: "gpt-4o-mini (recommended)" },
  { value: "gpt-4o", label: "gpt-4o" },
  { value: "gpt-4.1-mini", label: "gpt-4.1-mini" },
  { value: "gpt-4.1", label: "gpt-4.1" },
]

const GEMINI_MODELS = [
  { value: "gemini-2.0-flash", label: "gemini-2.0-flash (recommended)" },
  { value: "gemini-2.5-flash", label: "gemini-2.5-flash" },
  { value: "gemini-1.5-flash", label: "gemini-1.5-flash" },
  { value: "gemini-1.5-pro", label: "gemini-1.5-pro" },
]

export default function SettingsPage() {
  const { refresh } = useAuth()
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [provider, setProvider] = useState<"openai" | "gemini">("openai")
  const [openaiKey, setOpenaiKey] = useState("")
  const [geminiKey, setGeminiKey] = useState("")
  const [githubToken, setGithubToken] = useState("")
  const [model, setModel] = useState("gpt-4o-mini")
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)
  const [githubBusy, setGithubBusy] = useState(false)
  const [githubSaved, setGithubSaved] = useState(false)
  const [githubError, setGithubError] = useState<string | null>(null)

  useEffect(() => {
    api
      .getSettings()
      .then((s) => {
        setSettings(s)
        const p = (s.ai_provider === "gemini" ? "gemini" : "openai") as "openai" | "gemini"
        setProvider(p)
        setModel(s.ai_model || (p === "gemini" ? "gemini-2.0-flash" : "gpt-4o-mini"))
      })
      .catch((e) => setError(e.message))
  }, [])

  function onProviderChange(next: "openai" | "gemini") {
    setProvider(next)
    setModel(next === "gemini" ? "gemini-2.0-flash" : "gpt-4o-mini")
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setSaved(false)
    try {
      const payload: {
        ai_provider: string
        ai_model: string
        openai_api_key?: string
        gemini_api_key?: string
      } = {
        ai_provider: provider,
        ai_model: model,
      }
      if (openaiKey.trim()) payload.openai_api_key = openaiKey.trim()
      if (geminiKey.trim()) payload.gemini_api_key = geminiKey.trim()

      const next = await api.updateSettings(payload)
      setSettings(next)
      setOpenaiKey("")
      setGeminiKey("")
      setSaved(true)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save")
    } finally {
      setBusy(false)
    }
  }

  async function onClearActive() {
    if (!confirm(`Remove your ${provider === "gemini" ? "Gemini" : "OpenAI"} API key?`)) return
    setBusy(true)
    try {
      const next = await api.updateSettings(
        provider === "gemini" ? { clear_gemini_key: true } : { clear_openai_key: true }
      )
      setSettings(next)
      setSaved(true)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to clear key")
    } finally {
      setBusy(false)
    }
  }

  async function onSaveGithub(e: React.FormEvent) {
    e.preventDefault()
    if (!githubToken.trim()) {
      if (settings?.has_github_token) {
        setGithubSaved(true)
        setGithubError(null)
        return
      }
      setGithubError("Paste a GitHub personal access token to save.")
      return
    }
    setGithubBusy(true)
    setGithubError(null)
    setGithubSaved(false)
    try {
      const next = await api.updateSettings({ github_token: githubToken.trim() })
      setSettings(next)
      setGithubToken("")
      setGithubSaved(true)
      await refresh()
    } catch (err) {
      setGithubError(err instanceof Error ? err.message : "Failed to save GitHub token")
    } finally {
      setGithubBusy(false)
    }
  }

  async function onClearGithub() {
    if (!confirm("Remove your saved GitHub personal access token?")) return
    setGithubBusy(true)
    setGithubError(null)
    try {
      const next = await api.updateSettings({ clear_github_token: true })
      setSettings(next)
      setGithubSaved(true)
      await refresh()
    } catch (err) {
      setGithubError(err instanceof Error ? err.message : "Failed to clear GitHub token")
    } finally {
      setGithubBusy(false)
    }
  }

  const models = provider === "gemini" ? GEMINI_MODELS : OPENAI_MODELS
  const activeConfigured =
    provider === "gemini" ? settings?.has_gemini_key : settings?.has_openai_key

  return (
    <AppShell title="Settings">
      <div className="mx-auto w-full max-w-lg space-y-6">
        <div className="space-y-4 rounded-xl border bg-card p-6">
          <div>
            <h2 className="text-lg font-semibold">AI provider</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Use your own OpenAI or Gemini API key. Analysis, overview, diagrams, docs, and Q&A use the active provider.
            </p>
          </div>

          <form onSubmit={onSave} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="provider">
                Provider
              </label>
              <select
                id="provider"
                className="flex h-9 w-full rounded-md border bg-transparent px-3 text-sm"
                value={provider}
                onChange={(e) => onProviderChange(e.target.value as "openai" | "gemini")}
              >
                <option value="openai">OpenAI</option>
                <option value="gemini">Google Gemini</option>
              </select>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="text-sm font-medium" htmlFor="openai-key">
                  OpenAI API key
                </label>
                {settings?.has_openai_key && (
                  <span className="text-xs font-medium text-emerald-600">
                    Saved · {settings.openai_key_preview}
                  </span>
                )}
              </div>
              <Input
                id="openai-key"
                type="password"
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
                placeholder={
                  settings?.has_openai_key
                    ? "Leave blank to keep saved key"
                    : "sk-..."
                }
                autoComplete="off"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="text-sm font-medium" htmlFor="gemini-key">
                  Gemini API key
                </label>
                {settings?.has_gemini_key && (
                  <span className="text-xs font-medium text-emerald-600">
                    Saved · {settings.gemini_key_preview}
                  </span>
                )}
              </div>
              <Input
                id="gemini-key"
                type="password"
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                placeholder={
                  settings?.has_gemini_key
                    ? "Leave blank to keep saved key"
                    : "AIza..."
                }
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground">
                Keys are stored server-side and never shown again for security. Empty fields mean keep the existing key — not that it was deleted. Active provider must have a key before analysis.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="model">
                Model
              </label>
              <select
                id="model"
                className="flex h-9 w-full rounded-md border bg-transparent px-3 text-sm"
                value={model}
                onChange={(e) => setModel(e.target.value)}
              >
                {models.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
            {saved && <p className="text-sm text-emerald-600">Settings saved.</p>}

            <div className="flex gap-2">
              <Button type="submit" disabled={busy} className="flex-1">
                {busy ? "Saving…" : "Save settings"}
              </Button>
              {activeConfigured && (
                <Button type="button" variant="outline" disabled={busy} onClick={onClearActive}>
                  Clear {provider} key
                </Button>
              )}
            </div>
          </form>
        </div>

        <div className="space-y-4 rounded-xl border bg-card p-6">
          <div>
            <h2 className="text-lg font-semibold">GitHub token</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Paste a personal access token so Overview can load languages, commits, contributors, and releases without hitting GitHub rate limits. Classic PAT with <code className="text-xs">repo</code> (private) or public-repo read access is enough.
            </p>
          </div>
          <form onSubmit={onSaveGithub} className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="text-sm font-medium" htmlFor="github-token">
                  Personal access token
                </label>
                {settings?.has_github_token && (
                  <span className="text-xs font-medium text-emerald-600">
                    Saved · {settings.github_token_preview}
                  </span>
                )}
              </div>
              <Input
                id="github-token"
                type="password"
                value={githubToken}
                onChange={(e) => setGithubToken(e.target.value)}
                placeholder={
                  settings?.has_github_token
                    ? "Leave blank to keep saved token"
                    : "ghp_… or github_pat_…"
                }
                autoComplete="off"
              />
              <p className="text-xs text-muted-foreground">
                Stored server-side and never shown in full again. Used only for GitHub API calls on your projects.
              </p>
            </div>
            {githubError && <p className="text-sm text-destructive">{githubError}</p>}
            {githubSaved && <p className="text-sm text-emerald-600">GitHub token saved.</p>}
            <div className="flex gap-2">
              <Button type="submit" disabled={githubBusy} className="flex-1">
                {githubBusy ? "Saving…" : "Save GitHub token"}
              </Button>
              {settings?.has_github_token && (
                <Button type="button" variant="outline" disabled={githubBusy} onClick={onClearGithub}>
                  Clear token
                </Button>
              )}
            </div>
          </form>
        </div>

        <div className="space-y-2 rounded-xl border bg-card p-6 text-sm">
          <h3 className="font-medium">Account</h3>
          <Row label="Email" value={settings?.email} />
          <Row label="Plan" value={settings?.plan} />
          <Row label="Active provider" value={settings?.ai_provider} />
          <Row label="OpenAI key" value={settings?.has_openai_key ? `Configured (${settings.openai_key_preview})` : "Missing"} />
          <Row label="Gemini key" value={settings?.has_gemini_key ? `Configured (${settings.gemini_key_preview})` : "Missing"} />
          <Row label="GitHub token" value={settings?.has_github_token ? `Configured (${settings.github_token_preview})` : "Missing"} />
        </div>
      </div>
    </AppShell>
  )
}

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex justify-between gap-4 border-b py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate font-medium capitalize">{value || "—"}</span>
    </div>
  )
}
