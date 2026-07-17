"use client"

import { useEffect, useState } from "react"
import {
  CheckCircle2,
  CircleDashed,
  Github,
  KeyRound,
  Shield,
  Sparkles,
} from "lucide-react"
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

type Provider = "openai" | "gemini"

export default function SettingsPage() {
  const { refresh } = useAuth()
  const [settings, setSettings] = useState<UserSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [provider, setProvider] = useState<Provider>("openai")
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
        const p = (s.ai_provider === "gemini" ? "gemini" : "openai") as Provider
        setProvider(p)
        setModel(s.ai_model || (p === "gemini" ? "gemini-2.0-flash" : "gpt-4o-mini"))
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  function onProviderChange(next: Provider) {
    setProvider(next)
    setModel(next === "gemini" ? "gemini-2.0-flash" : "gpt-4o-mini")
    setSaved(false)
    setError(null)
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

  async function onClearProviderKey(which: Provider) {
    if (!confirm(`Remove your ${which === "gemini" ? "Gemini" : "OpenAI"} API key?`)) return
    setBusy(true)
    setError(null)
    try {
      const next = await api.updateSettings(
        which === "gemini" ? { clear_gemini_key: true } : { clear_openai_key: true }
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
  const activeKeyReady =
    provider === "gemini" ? Boolean(settings?.has_gemini_key) : Boolean(settings?.has_openai_key)

  return (
    <AppShell title="Settings">
      <div className="mx-auto w-full max-w-8xl space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Settings</h2>
            <p className="text-sm text-muted-foreground">
              Keys stay server-side and are never shown in full again.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-base text-muted-foreground">
            <span className="max-w-[200px] truncate">
              <span className="text-muted-foreground/80">Account</span>{" "}
              <span className="font-medium text-foreground">{settings?.email || "—"}</span>
            </span>
            <span>
              <span className="text-muted-foreground/80">Plan</span>{" "}
              <span className="font-medium capitalize text-foreground">{settings?.plan || "—"}</span>
            </span>
            <ReadyPill ready={activeKeyReady} label="AI" />
            <ReadyPill ready={Boolean(settings?.has_github_token)} label="GitHub" />
          </div>
        </div>

        <div className="grid items-start gap-3 lg:grid-cols-2">
          {/* AI */}
          <section className="rounded-xl border bg-card">
            <div className="flex items-center justify-between gap-2 border-b px-4 py-2.5">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-teal-700 dark:text-teal-400" />
                <div>
                  <h3 className="text-base font-semibold">AI provider</h3>
                  <p className="text-sm text-muted-foreground">
                    Analysis, overview, diagrams, docs, Ask
                  </p>
                </div>
              </div>
              <ReadyPill ready={activeKeyReady} label={activeKeyReady ? "Ready" : "Needed"} />
            </div>

            <form onSubmit={onSave} className="space-y-3 p-4">
              <div className="grid grid-cols-2 gap-2">
                <ProviderCard
                  active={provider === "openai"}
                  title="OpenAI"
                  configured={Boolean(settings?.has_openai_key)}
                  preview={settings?.openai_key_preview}
                  onClick={() => onProviderChange("openai")}
                />
                <ProviderCard
                  active={provider === "gemini"}
                  title="Gemini"
                  configured={Boolean(settings?.has_gemini_key)}
                  preview={settings?.gemini_key_preview}
                  onClick={() => onProviderChange("gemini")}
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-sm font-medium" htmlFor="active-key">
                    {provider === "gemini" ? "Gemini" : "OpenAI"} API key
                  </label>
                  {activeKeyReady && (
                    <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                      Saved ·{" "}
                      {provider === "gemini"
                        ? settings?.gemini_key_preview
                        : settings?.openai_key_preview}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <KeyRound className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  {provider === "openai" ? (
                    <Input
                      id="active-key"
                      type="password"
                      value={openaiKey}
                      onChange={(e) => setOpenaiKey(e.target.value)}
                      placeholder={settings?.has_openai_key ? "Leave blank to keep key" : "sk-…"}
                      autoComplete="off"
                      className="h-8 pl-8 text-sm"
                    />
                  ) : (
                    <Input
                      id="active-key"
                      type="password"
                      value={geminiKey}
                      onChange={(e) => setGeminiKey(e.target.value)}
                      placeholder={settings?.has_gemini_key ? "Leave blank to keep key" : "AIza…"}
                      autoComplete="off"
                      className="h-8 pl-8 text-sm"
                    />
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium" htmlFor="model">
                  Model
                </label>
                <select
                  id="model"
                  className="flex h-10 w-full rounded-md border bg-transparent px-2.5 text-base"
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
              {saved && (
                <p className="text-sm text-emerald-600 dark:text-emerald-400">AI settings saved.</p>
              )}

              <div className="flex flex-wrap gap-2 pt-1">
                <Button type="submit" size="sm" disabled={busy || loading}>
                  {busy ? "Saving…" : "Save AI"}
                </Button>
                {activeKeyReady && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => onClearProviderKey(provider)}
                  >
                    Clear key
                  </Button>
                )}
              </div>
            </form>
          </section>

          {/* GitHub */}
          <section className="rounded-xl border bg-card">
            <div className="flex items-center justify-between gap-2 border-b px-4 py-2.5">
              <div className="flex items-center gap-2">
                <Github className="size-4" />
                <div>
                  <h3 className="text-sm font-semibold">GitHub access</h3>
                  <p className="text-[11px] text-muted-foreground">
                    Overview stats · avoids rate limits
                  </p>
                </div>
              </div>
              <ReadyPill
                ready={Boolean(settings?.has_github_token)}
                label={settings?.has_github_token ? "Saved" : "Optional"}
              />
            </div>

            <form onSubmit={onSaveGithub} className="space-y-3 p-4">
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                Classic PAT with{" "}
                <code className="rounded bg-muted px-1 py-0.5">public_repo</code> or{" "}
                <code className="rounded bg-muted px-1 py-0.5">repo</code> for private repos.
              </p>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-medium" htmlFor="github-token">
                    Personal access token
                  </label>
                  {settings?.has_github_token && (
                    <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                      Saved · {settings.github_token_preview}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <Shield className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="github-token"
                    type="password"
                    value={githubToken}
                    onChange={(e) => setGithubToken(e.target.value)}
                    placeholder={
                      settings?.has_github_token ? "Leave blank to keep token" : "ghp_… or github_pat_…"
                    }
                    autoComplete="off"
                    className="h-10 pl-8 text-base"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 rounded-lg border bg-muted/20 px-3 py-2 text-[11px]">
                <MiniStat
                  label="OpenAI"
                  ok={Boolean(settings?.has_openai_key)}
                  value={settings?.has_openai_key ? settings.openai_key_preview : "—"}
                />
                <MiniStat
                  label="Gemini"
                  ok={Boolean(settings?.has_gemini_key)}
                  value={settings?.has_gemini_key ? settings.gemini_key_preview : "—"}
                />
                <MiniStat
                  label="GitHub"
                  ok={Boolean(settings?.has_github_token)}
                  value={settings?.has_github_token ? settings.github_token_preview : "—"}
                />
              </div>

              {githubError && <p className="text-sm text-destructive">{githubError}</p>}
              {githubSaved && (
                <p className="text-sm text-emerald-600 dark:text-emerald-400">GitHub token saved.</p>
              )}

              <div className="flex flex-wrap gap-2 pt-1">
                <Button type="submit" size="sm" disabled={githubBusy || loading}>
                  {githubBusy ? "Saving…" : "Save token"}
                </Button>
                {settings?.has_github_token && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={githubBusy}
                    onClick={onClearGithub}
                  >
                    Clear token
                  </Button>
                )}
              </div>
            </form>
          </section>
        </div>
      </div>
    </AppShell>
  )
}

function ReadyPill({ ready, label }: { ready: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-sm font-medium ${
        ready
          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
          : "bg-muted text-muted-foreground"
      }`}
    >
      {ready ? <CheckCircle2 className="size-3" /> : <CircleDashed className="size-3" />}
      {label}
    </span>
  )
}

function ProviderCard({
  active,
  title,
  configured,
  preview,
  onClick,
}: {
  active: boolean
  title: string
  configured: boolean
  preview?: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-3 py-2 text-left transition ${
        active
          ? "border-teal-600/50 bg-teal-500/10 ring-1 ring-teal-600/30"
          : "hover:bg-muted/40"
      }`}
    >
      <div className="flex items-center justify-between gap-1">
        <p className="text-sm font-semibold">{title}</p>
        {active && (
          <span className="text-[10px] font-medium text-teal-800 dark:text-teal-300">Active</span>
        )}
      </div>
      <p className="mt-0.5 truncate text-sm text-muted-foreground">
        {configured ? (
          <span className="text-emerald-700 dark:text-emerald-400">Key · {preview}</span>
        ) : (
          "No key"
        )}
      </p>
    </button>
  )
}

function MiniStat({
  label,
  value,
  ok,
}: {
  label: string
  value?: string
  ok?: boolean
}) {
  return (
    <div className="min-w-0">
      <p className="text-muted-foreground">{label}</p>
      <p
        className={`truncate font-medium ${
          ok ? "text-emerald-700 dark:text-emerald-400" : "text-foreground"
        }`}
      >
        {value || "—"}
      </p>
    </div>
  )
}
