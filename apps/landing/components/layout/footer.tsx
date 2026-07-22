import Link from "next/link"
import { APP_URL, GITHUB_URL } from "@/config/site"

export function Footer() {
  return (
    <footer className="border-t border-[var(--line)]">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-4 py-14 md:flex-row md:items-end md:justify-between md:px-6">
        <div>
          <p className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-tight text-[var(--fg)]">
            Codexp
          </p>
          <p className="mt-2 max-w-sm text-base text-[var(--fg-muted)]">
            Codebase understanding for developers who inherit repos they did not write.
          </p>
        </div>
        <nav className="flex flex-wrap gap-x-7 gap-y-2 text-base text-[var(--fg-muted)]">
          <Link href="#tour" className="hover:text-[var(--fg)]">
            Product
          </Link>
          <Link href="#pricing" className="hover:text-[var(--fg)]">
            Pricing
          </Link>
          <Link href={GITHUB_URL} className="hover:text-[var(--fg)]">
            GitHub
          </Link>
          <Link href={`${APP_URL}/login`} className="hover:text-[var(--fg)]">
            App
          </Link>
        </nav>
      </div>
      <div className="border-t border-[var(--line)]">
        <p className="mx-auto max-w-6xl px-4 py-4 font-[family-name:var(--font-mono)] text-[11px] text-[var(--fg-muted)] md:px-6">
          © {new Date().getFullYear()} Codexp
        </p>
      </div>
    </footer>
  )
}
