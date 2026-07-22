/** Production defaults when env vars are missing on Vercel builds. */
export const PROD_API_URL = "https://codexp-ai.onrender.com"
export const PROD_WEB_URL = "https://codexp-ai-web.vercel.app"
export const PROD_LANDING_URL = "https://codexp-ai-landing.vercel.app"

export function resolveApiUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_URL
  if (fromEnv) return fromEnv.replace(/\/$/, "")
  // Vercel / production builds must never fall back to localhost
  if (process.env.VERCEL || process.env.NODE_ENV === "production") {
    return PROD_API_URL
  }
  return "http://localhost:8080"
}
