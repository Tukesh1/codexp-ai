import { fontDisplay, fontMono } from "@/lib/fonts"
import { Metadata } from "next"
import "@workspace/ui/globals.css"
import "./landing.css"
import { Providers } from "@/components/ui/providers"
import { SiteMetadata } from "@/config/site"

export const metadata: Metadata = {
  ...SiteMetadata,
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_LANDING_URL || "http://localhost:3002"
  ),
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${fontDisplay.variable} ${fontMono.variable} font-[family-name:var(--font-display)] antialiased bg-[#050505] text-[#f5f5f5] font-normal`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
