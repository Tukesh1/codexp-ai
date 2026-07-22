"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/lib/auth"
import { getApiUrl } from "@/lib/api"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"

export default function LoginPage() {
  const { login, user, loading } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
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
      await login(email.trim(), name.trim() || undefined)
      router.push("/dashboard")
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Sign in failed"
      if (msg === "Failed to fetch" || msg.includes("NetworkError")) {
        setError(
          "Can't reach the API. Check that NEXT_PUBLIC_API_URL points to your backend and CORS allows this site."
        )
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
          <h1 className="text-2xl font-semibold tracking-tight">Sign in to Codexp</h1>
          <p className="text-sm text-muted-foreground">
            Enter your email to sign in or create an account.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 rounded-xl border bg-card p-6 shadow-sm">
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
            <label className="text-sm font-medium" htmlFor="name">
              Name <span className="font-normal text-muted-foreground">(for new accounts)</span>
            </label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              autoComplete="name"
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={submitting || !email.trim()}>
            {submitting ? "Continuing…" : "Continue"}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            New here? We’ll create your account automatically on first sign-in.
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
