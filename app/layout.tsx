import type { Metadata, Viewport } from 'next'
import MotionProvider from '@/components/MotionProvider'
import './globals.css'

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
      <body>
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  )
}
