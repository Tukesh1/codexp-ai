/** @type {import('next').NextConfig} */
const appUrl = (
  process.env.NEXT_PUBLIC_APP_URL || "https://codexp-ai-web.vercel.app"
).replace(/\/$/, "")

const nextConfig = {
  transpilePackages: ["@workspace/ui"],
  env: {
    NEXT_PUBLIC_APP_URL: appUrl,
  },
}

export default nextConfig
