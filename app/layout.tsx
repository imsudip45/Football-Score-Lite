import type React from "react"
import type { Metadata, Viewport } from "next"
import { Inter, Geist_Mono, Oswald, Bebas_Neue } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import "./globals.css"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" })
const oswald = Oswald({
  subsets: ["latin"],
  // Oswald only supports up to 700 (plus "variable") in next/font/google
  weight: ["400", "500", "600", "700"],
  variable: "--font-oswald",
})
const bebasNeue = Bebas_Neue({ subsets: ["latin"], weight: ["400"], variable: "--font-bebas" })

export const metadata: Metadata = {
  title: "Football Score Lite - Football Graphics Control",
  description: "Professional football graphics management for local tournaments",
  generator: "v0.app",
}

export const viewport: Viewport = {
  themeColor: "#14b8a6",
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${geistMono.variable} ${oswald.variable} ${bebasNeue.variable}`}
    >
      <body className={`${inter.className} font-sans antialiased overflow-hidden`} suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          forcedTheme="light"
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
