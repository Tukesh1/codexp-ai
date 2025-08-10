import { fontSans, fontMono } from "@/lib/fonts"
import { Metadata } from "next"
import "@workspace/ui/globals.css"
import { Providers } from "@/components/providers"

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
        className={`${fontSans.variable} ${fontMono.variable} font-sans antialiased `}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
