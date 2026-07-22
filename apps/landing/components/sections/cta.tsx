import Link from "next/link"
import { GITHUB_URL } from "@/config/site"
import { RepoCta } from "@/components/sections/repo-cta"

export function CTA() {
  return (
    <section className="relative overflow-hidden border-t border-[var(--line)]">
      <div
        aria-hidden
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_30%_0%,rgba(245,245,245,0.05),transparent_50%)]"
      />
      <div className="relative mx-auto max-w-6xl px-4 py-24 md:px-6 md:py-32">
        <h2 className="max-w-2xl font-[family-name:var(--font-display)] text-4xl font-bold tracking-tight text-[var(--fg)] md:text-6xl md:leading-[1.1]">
          Paste a repo. Highlight a line. Know what it does.
        </h2>
        <p className="mt-4 max-w-md text-lg text-[var(--fg-muted)]">
          Same flow as New Project. Drop a GitHub URL and jump straight into Codexp.
        </p>
        <div className="mt-10 max-w-xl">
          <RepoCta />
        </div>
        <p className="mt-6 font-[family-name:var(--font-mono)] text-sm text-[var(--fg-muted)]">
          Prefer browsing first?{" "}
          <Link
            href={GITHUB_URL}
            className="text-[var(--fg)] underline-offset-4 hover:underline"
          >
            Star the source on GitHub
          </Link>
        </p>
      </div>
    </section>
  )
}
