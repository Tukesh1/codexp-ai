"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/lib/auth"
import { Button } from "@workspace/ui/components/button"
import { Input } from "@workspace/ui/components/input"

export default function LoginPage() {
  const { login, user, loading } = useAuth()
  const router = useRouter()
  const [email, setEmail] = useState("dev@codeexp.ai")
  const [name, setName] = useState("Developer")
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
      await login(email, name)
      router.push("/dashboard")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-6">
      <div className="w-full max-w-md space-y-8">
        <div className="space-y-2 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground text-lg font-bold">
            CE
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Sign in to CodeExp AI</h1>
          <p className="text-sm text-muted-foreground">
            Dev login for local development. Connect Clerk in production.
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
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="name">
              Name
            </label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Signing in…" : "Continue"}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          API must be running at{" "}
          <code className="rounded bg-muted px-1 py-0.5">
            {process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080"}
          </code>
          .{" "}
          <Link href="http://localhost:3002" className="underline">
            Back to landing
          </Link>
        </p>
      </div>
    </div>
  )
}
