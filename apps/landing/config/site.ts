/** Site config for Codexp landing. */

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

/** Web app base URL (dashboard / login). */
export const APP_URL = (
  process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
).replace(/\/$/, "")

export const GITHUB_URL = "https://github.com/Tukesh1/codexp-ai"
