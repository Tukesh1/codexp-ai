/** Site config for Codexp landing. */

/** Production defaults when env vars are missing on Vercel builds. */
const PROD_WEB_URL = "https://codexp-ai-web.vercel.app"

export const SiteMetadata = {
  title: "Codexp",
  description:
    "Connect a GitHub repo. Get overviews, diagrams, select-to-explain, and Ask with your own API keys.",
  authors: [{ name: "Codexp" }],
  keywords: [
    "Codexp",
    "codebase understanding",
    "AI documentation",
    "repository analysis",
    "developer tools",
  ],
  openGraph: {
    title: "Codexp",
    description:
      "Connect a GitHub repo. Get overviews, diagrams, select-to-explain, and Ask with your own API keys.",
    url: "https://github.com/Tukesh1/codexp-ai",
    siteName: "Codexp",
    images: [
      {
        url: "/images/logo.png",
        width: 1200,
        height: 630,
      },
    ],
  },
}

/**
 * Web app base URL (dashboard / login).
 * Access env as a full static path so Next can inline it into client bundles.
 */
export function getAppUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL
  if (fromEnv) return fromEnv.replace(/\/$/, "")
  if (process.env.VERCEL || process.env.NODE_ENV === "production") {
    return PROD_WEB_URL
  }
  return "http://localhost:3000"
}

export const GITHUB_URL = "https://github.com/Tukesh1/codexp-ai"
