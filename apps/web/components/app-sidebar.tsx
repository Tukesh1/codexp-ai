"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  FolderGit2,
  LayoutDashboard,
  LogOut,
  Plus,
  Settings,
} from "lucide-react"
import { useAuth } from "@/lib/auth"
import { Button } from "@workspace/ui/components/button"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@workspace/ui/components/sidebar"

const nav = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Projects", href: "/projects", icon: FolderGit2 },
  { title: "New Project", href: "/projects/new", icon: Plus },
  { title: "Settings", href: "/settings", icon: Settings },
]

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, logout } = useAuth()

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border px-3 py-4">
        <Link href="/dashboard" className="flex items-center gap-2 px-1">
          <div className="flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground text-sm font-bold">
            CE
          </div>
          <div className="flex flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-semibold tracking-tight">CodeExp AI</span>
            <span className="text-xs text-muted-foreground">Code intelligence</span>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Workspace</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {nav.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + "/")
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                      <Link href={item.href}>
                        <item.icon />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border p-3">
        <div className="flex items-center justify-between gap-2 group-data-[collapsible=icon]:flex-col">
          <div className="min-w-0 group-data-[collapsible=icon]:hidden">
            <p className="truncate text-sm font-medium">{user?.email || "Guest"}</p>
            <p className="text-xs text-muted-foreground capitalize">{user?.plan || "free"} plan</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Log out"
            onClick={() => {
              logout()
              router.push("/login")
            }}
          >
            <LogOut className="size-4" />
          </Button>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
