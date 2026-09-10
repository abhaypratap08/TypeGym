'use client'

/**
 * ThemeToggle.tsx
 * ===============
 * Circular button in the titlebar that switches between light and dark theme.
 *
 * Animation:
 *   - The icon morphs between ☀ and ☾ using Framer Motion AnimatePresence
 *     with a small scale + rotate exit/enter so it feels like a flip.
 *   - On click it reads its own bounding rect and passes the center coords
 *     to useTheme.toggle() so the View Transitions reveal originates from
 *     the button itself.
 */

import { useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme, type Theme } from '@/hooks/useTheme'

// ── Icon components ───────────────────────────────────────────────────────────

function SunIcon() {
  return (
    <svg
      width="14" height="14" viewBox="0 0 24 24"
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
      width="13" height="13" viewBox="0 0 24 24"
      fill="none" stroke="currentColor"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}

// ── Framer Motion icon variants ───────────────────────────────────────────────

const iconEnter = {
  initial:  { opacity: 0, scale: 0.4, rotate: -30 },
  animate:  { opacity: 1, scale: 1,   rotate: 0,
    transition: { type: 'spring', stiffness: 420, damping: 24, mass: 0.6 } },
  exit:     { opacity: 0, scale: 0.4, rotate: 30,
    transition: { duration: 0.16, ease: 'easeIn' } },
}

// ── Component ─────────────────────────────────────────────────────────────────

interface ThemeToggleProps {
  /** Extra class names forwarded to the button */
  className?: string
}

export default function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, toggle } = useTheme()
  const btnRef = useRef<HTMLButtonElement>(null)

  const handleClick = () => {
    const rect = btnRef.current?.getBoundingClientRect()
    const x = rect ? rect.left + rect.width  / 2 : window.innerWidth  / 2
    const y = rect ? rect.top  + rect.height / 2 : window.innerHeight / 2
    toggle(x, y)
  }

  const isDark  = theme === 'dark'
  const label   = isDark ? 'Switch to light theme' : 'Switch to dark theme'

  return (
    <button
      ref={btnRef}
      className={`theme-toggle${className ? ` ${className}` : ''}`}
      onClick={handleClick}
      aria-label={label}
      title={label}
      type="button"
    >
      <AnimatePresence mode="wait" initial={false}>
        {isDark ? (
          <motion.span
            key="sun"
            {...iconEnter}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <SunIcon />
          </motion.span>
        ) : (
          <motion.span
            key="moon"
            {...iconEnter}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <MoonIcon />
          </motion.span>
        )}
      </AnimatePresence>
    </button>
  )
}
