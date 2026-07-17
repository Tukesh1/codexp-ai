"use client"

import { useState } from "react"
import Link from "next/link"
import { Menu, X } from "lucide-react"
import { APP_URL, GITHUB_URL } from "@/config/site"

const nav = [
  { href: "#tour", label: "Product" },
  { href: "#how", label: "How it works" },
  { href: "#pricing", label: "Pricing" },
]

export function Header() {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--line)] bg-[var(--bg)]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 md:px-6">
        <Link href="/" className="font-[family-name:var(--font-display)] text-xl font-bold tracking-tight text-[var(--fg)]">
          Codexp
        </Link>

        <nav className="hidden items-center gap-9 md:flex">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-base text-[var(--fg-muted)] transition hover:text-[var(--fg)]"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-5 md:flex">
          <Link
            href={GITHUB_URL}
            className="text-base text-[var(--fg-muted)] transition hover:text-[var(--fg)]"
          >
            GitHub
          </Link>
          <Link
            href={`${APP_URL}/login`}
            className="bg-[var(--fg)] px-4 py-2.5 text-base font-medium text-[var(--inverse)] transition hover:opacity-85"
          >
            Open app
          </Link>
        </div>

        <button
          type="button"
          className="text-[var(--fg)] md:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-[var(--line)] bg-[var(--bg-elevated)] px-4 py-6 md:hidden">
          <nav className="flex flex-col gap-4">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="text-[var(--fg-muted)]"
              >
                {item.label}
              </Link>
            ))}
            <Link href={GITHUB_URL} className="text-[var(--fg-muted)]">
              GitHub
            </Link>
            <Link
              href={`${APP_URL}/login`}
              className="mt-2 bg-[var(--fg)] px-4 py-3 text-center text-sm font-medium text-[var(--inverse)]"
            >
              Open app
            </Link>
          </nav>
        </div>
      )}
    </header>
  )
}
