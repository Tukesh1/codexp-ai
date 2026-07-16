"use client"

import { AppShell } from "@/components/app-shell"
import { useAuth } from "@/lib/auth"

export default function SettingsPage() {
  const { user } = useAuth()

  return (
    <AppShell title="Settings">
      <div className="mx-auto w-full max-w-lg space-y-4 rounded-xl border bg-card p-6">
        <h2 className="text-lg font-semibold">Account</h2>
        <div className="space-y-2 text-sm">
          <Row label="Email" value={user?.email} />
          <Row label="Plan" value={user?.plan} />
          <Row label="User ID" value={user?.id} />
        </div>
        <p className="text-xs text-muted-foreground">
          Production auth uses Clerk webhooks. Locally you are using the development login.
        </p>
      </div>
    </AppShell>
  )
}

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex justify-between gap-4 border-b py-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="truncate font-medium">{value || "—"}</span>
    </div>
  )
}
