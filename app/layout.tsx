import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import MotionProvider from '@/components/MotionProvider'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' })
const jetbrainsMono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-jetbrains-mono', display: 'swap' })

export const viewport: Viewport = {
  width:             'device-width',
  initialScale:      1,
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
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <head>
        {/*
          Blocking inline script: reads localStorage / prefers-color-scheme
          and applies data-theme="dark"|"light" before the first paint.
          This prevents the flash-of-wrong-theme on hard reload.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem('tg-theme');var ok=['graphite','olive','light','midnight','legacy'];if(s&&ok.indexOf(s)>=0){document.documentElement.setAttribute('data-theme',s);if(s!=='light')document.documentElement.classList.add('dark');return;}document.documentElement.setAttribute('data-theme','graphite');document.documentElement.classList.add('dark');}catch(e){document.documentElement.setAttribute('data-theme','graphite');document.documentElement.classList.add('dark');}})();`,
          }}
        />
      </head>
      <body>
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  )
}
