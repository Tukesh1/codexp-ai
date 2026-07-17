"use client"

import { useEffect } from "react"
import { usePathname, useRouter } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import { GlobalAskPanel } from "@/components/global-ask-panel"
import { useAuth } from "@/lib/auth"
import { Separator } from "@workspace/ui/components/separator"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@workspace/ui/components/sidebar"

export function AppShell({
  children,
  title,
}: {
  children: React.ReactNode
  title?: string
}) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!loading && !user && pathname !== "/login") {
      router.replace("/login")
    }
  }, [loading, user, pathname, router])

  if (loading) {
    return (
      <div className="flex min-h-svh items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    )
  }

  if (!user) return null

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <h1 className="text-sm font-medium">{title || "CodeExp AI"}</h1>
        </header>
        <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-auto p-6">{children}</div>
      </SidebarInset>
      <GlobalAskPanel />
    </SidebarProvider>
  )
}
