"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth"

export default function HomePage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (loading) return
    router.replace(user ? "/dashboard" : "/login")
  }, [user, loading, router])

  return (
    <div className="flex min-h-svh items-center justify-center text-sm text-muted-foreground">
      Redirecting…
    </div>
  )
}
