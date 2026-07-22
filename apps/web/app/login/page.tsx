"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/lib/auth"
import { getApiUrl } from "@/lib/api"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"

type Mode = "signin" | "signup"

export default function LoginPage() {
  const { login, signup, user, loading } = useAuth()
  const router = useRouter()
  const [mode, setMode] = useState<Mode>("signin")
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (!loading && user) {
    router.replace("/dashboard")
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      if (mode === "signup") {
        if (password.length < 8) {
          throw new Error("Password must be at least 8 characters")
        }
        if (password !== confirm) {
          throw new Error("Passwords do not match")
        }
        await signup(email.trim(), password, name.trim() || undefined)
      } else {
        await login(email.trim(), password)
      }
      router.push("/dashboard")
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong"
      if (msg.includes("Failed to fetch") || msg.includes("NetworkError") || msg.includes("cannot reach API")) {
        setError("Can't reach the API. Check your connection and try again.")
      } else {
        setError(msg)
      }
    } finally {
      setSubmitting(false)
    }
  }

  const landingUrl = (
    process.env.NEXT_PUBLIC_LANDING_URL || "https://codexp-ai-landing.vercel.app"
  ).replace(/\/$/, "")

  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-6">
      <div className="w-full max-w-md space-y-8">
        <div className="space-y-2 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground text-lg font-bold">
            CE
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {mode === "signin" ? "Sign in to Codexp" : "Create your account"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {mode === "signin"
              ? "Welcome back — use your email and password."
              : "Get started with a free account in under a minute."}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-1 rounded-lg border bg-muted/40 p-1">
          <button
            type="button"
            onClick={() => {
              setMode("signin")
              setError(null)
            }}
            className={`rounded-md px-3 py-2 text-sm font-medium transition ${
              mode === "signin"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("signup")
              setError(null)
            }}
            className={`rounded-md px-3 py-2 text-sm font-medium transition ${
              mode === "signup"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Sign up
          </button>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 rounded-xl border bg-card p-6 shadow-sm">
          {mode === "signup" ? (
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="name">
                Name
              </label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                autoComplete="name"
              />
            </div>
          ) : null}

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="email">
              Email
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              autoComplete="email"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="password">
              Password
            </label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={mode === "signup" ? "At least 8 characters" : "Your password"}
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              required
              minLength={mode === "signup" ? 8 : undefined}
            />
          </div>

          {mode === "signup" ? (
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="confirm">
                Confirm password
              </label>
              <Input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="Repeat password"
                autoComplete="new-password"
                required
                minLength={8}
              />
            </div>
          ) : null}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <Button
            type="submit"
            className="w-full"
            disabled={submitting || !email.trim() || !password}
          >
            {submitting
              ? mode === "signup"
                ? "Creating account…"
                : "Signing in…"
              : mode === "signup"
                ? "Create account"
                : "Sign in"}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            {mode === "signin" ? (
              <>
                No account?{" "}
                <button
                  type="button"
                  className="underline underline-offset-2 hover:text-foreground"
                  onClick={() => {
                    setMode("signup")
                    setError(null)
                  }}
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  className="underline underline-offset-2 hover:text-foreground"
                  onClick={() => {
                    setMode("signin")
                    setError(null)
                  }}
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          <Link href={landingUrl} className="underline underline-offset-2 hover:text-foreground">
            Back to landing
          </Link>
        </p>

        {process.env.NODE_ENV === "development" ? (
          <p className="text-center text-[10px] text-muted-foreground/70">
            API: {getApiUrl()}
          </p>
        ) : null}
      </div>
    </div>
  )
}
