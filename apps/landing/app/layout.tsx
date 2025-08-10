import { fontSans, fontMono } from "@/lib/fonts"
import { Metadata } from "next"
import "@workspace/ui/globals.css"
import { Providers } from "@/components/ui/providers"
import { SiteMetadata } from "@/config/site"

export const metadata: Metadata = {
  ...SiteMetadata
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${fontSans.variable} ${fontMono.variable} font-sans antialiased text-white bg-[#0D0C0D]`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
