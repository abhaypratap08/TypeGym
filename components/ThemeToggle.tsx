'use client'

import { motion, useReducedMotion } from 'framer-motion'
import { useTheme } from '@/hooks/useTheme'
import { FADE_TRANSITION } from '@/lib/motion'

// ── Icon components ───────────────────────────────────────────────────────────

function SunIcon() {
  return (
    <svg
      width="18" height="18" viewBox="0 0 24 24"
      fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1"  x2="12" y2="3"  />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22"  y1="4.22"  x2="5.64"  y2="5.64"  />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1"  y1="12" x2="3"  y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22"  y1="19.78" x2="5.64"  y2="18.36" />
      <line x1="18.36" y1="5.64"  x2="19.78" y2="4.22"  />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg
      width="18" height="18" viewBox="0 0 24 24"
      fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}

interface ThemeToggleProps {
  /** Extra class names forwarded to the button */
  className?: string
}

export default function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, toggle } = useTheme()
  const reducedMotion = useReducedMotion()
  const transition = reducedMotion ? { ...FADE_TRANSITION, duration: 0.1 } : FADE_TRANSITION

  const isDark  = theme === 'dark'
  const label   = isDark ? 'Switch to light theme' : 'Switch to dark theme'

  return (
    <button
      className={`theme-toggle${className ? ` ${className}` : ''}`}
      onClick={toggle}
      aria-label={label}
      title={label}
      type="button"
    >
      <motion.span
        className="theme-toggle-icon"
        initial={false}
        animate={{ opacity: isDark ? 1 : 0 }}
        transition={transition}
        aria-hidden="true"
      >
        <SunIcon />
      </motion.span>
      <motion.span
        className="theme-toggle-icon"
        initial={false}
        animate={{ opacity: isDark ? 0 : 1 }}
        transition={transition}
        aria-hidden="true"
      >
        <MoonIcon />
      </motion.span>
    </button>
  )
}
