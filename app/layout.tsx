import type { Metadata, Viewport } from 'next'
import { JetBrains_Mono, Outfit } from 'next/font/google'
import './globals.css'

const jetBrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
})

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
})

export const viewport: Viewport = {
  width:         'device-width',
  initialScale:  1,
}

export const metadata: Metadata = {
  title: 'TypeGym — Typing Practice for Developers',
  description: 'A fast, elegant typing practice platform. Measure your WPM, track accuracy, and improve your typing speed.',
  keywords: ['typing test', 'wpm', 'typing speed', 'developer tools', 'monkeytype alternative'],
  openGraph: {
    title: 'TypeGym',
    description: 'Typing practice for developers',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${jetBrainsMono.variable} ${outfit.variable}`}>{children}</body>
    </html>
  )
}
