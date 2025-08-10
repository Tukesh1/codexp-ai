import { Geist, Geist_Mono, Gugi } from "next/font/google"

export const fontSans = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
})

export const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

export const gugi = Gugi({ 
  weight: ['400'], 
  subsets: ['latin'] 
})