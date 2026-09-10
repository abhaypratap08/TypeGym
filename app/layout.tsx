import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono, JetBrains_Mono } from 'next/font/google'
import './globals.css'

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-geist',
  display: 'swap',
})

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-geist-mono',
  display: 'swap',
})

// Kept as a fallback mono stack; Geist Mono is preferred
const jetBrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
})

export const viewport: Viewport = {
  width:             'device-width',
  initialScale:      1,
  maximumScale:      1,
  interactiveWidget: 'resizes-content',
  viewportFit:       'cover',
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
      <head>
        {/*
          Blocking inline script: reads localStorage / prefers-color-scheme
          and applies data-theme="dark"|"light" before the first paint.
          This prevents the flash-of-wrong-theme on hard reload.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem('tg-theme');if(s==='dark'||s==='light'){document.documentElement.setAttribute('data-theme',s);return;}if(window.matchMedia('(prefers-color-scheme: dark)').matches){document.documentElement.setAttribute('data-theme','dark');}}catch(e){}})();`,
          }}
        />
      </head>
      <body className={`${geist.variable} ${geistMono.variable} ${jetBrainsMono.variable}`}>
        {children}
      </body>
    </html>
  )
}
