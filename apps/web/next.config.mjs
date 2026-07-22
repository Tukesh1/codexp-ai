/** @type {import('next').NextConfig} */
const apiUrl = (
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.API_URL ||
  "https://codexp-ai.onrender.com"
).replace(/\/$/, "")

const nextConfig = {
  transpilePackages: ["@workspace/ui"],
  // Force-inline so client bundles never miss the API host on Vercel
  env: {
    NEXT_PUBLIC_API_URL: apiUrl,
  },
  async rewrites() {
    return [
      {
        source: "/backend-api/:path*",
        destination: `${apiUrl}/:path*`,
      },
    ]
  },
}

export default nextConfig
