/** Site config for Codexp landing. */

export const SiteMetadata = {
  title: "Codexp AI — Understand any codebase",
  description:
    "Connect a GitHub repo. Get overviews, diagrams, select-to-explain, Explore tools, and Ask — powered by your own API keys.",
  authors: [{ name: "Codexp AI" }],
  keywords: [
    "Codexp AI",
    "codebase understanding",
    "AI documentation",
    "repository analysis",
    "developer tools",
  ],
  openGraph: {
    title: "Codexp AI — Understand any codebase",
    description:
      "Connect a GitHub repo. Get overviews, diagrams, select-to-explain, Explore tools, and Ask — powered by your own API keys.",
    url: "https://github.com/Tukesh1/codexp-ai",
    siteName: "Codexp AI",
    images: [
      {
        url: "/images/logo.png",
        width: 1200,
        height: 630,
      },
    ],
  },
}

/** Web app base URL (dashboard / login). */
export const APP_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "http://localhost:3000"

export const GITHUB_URL = "https://github.com/Tukesh1/codexp-ai"
