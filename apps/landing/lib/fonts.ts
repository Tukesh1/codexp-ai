import { IBM_Plex_Mono, Space_Grotesk } from "next/font/google"

export const fontDisplay = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600", "700"],
})

export const fontMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500"],
})
