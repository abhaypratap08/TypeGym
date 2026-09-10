'use client'

/**
 * useTheme.ts
 * ===========
 * Manages light ↔ dark theme preference.
 *
 * Priority order:
 *   1. localStorage 'tg-theme'  (explicit user choice, persists across sessions)
 *   2. prefers-color-scheme     (OS setting, used when no stored pref)
 *   3. 'light'                  (hardcoded fallback)
 *
 * Applies the theme by setting data-theme="dark" | "light" on <html>.
 * The toggle uses the View Transitions API (document.startViewTransition)
 * so the CSS clip-path reveal animation fires on every switch.
 */

import { useState, useEffect, useCallback } from 'react'

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'tg-theme'

function getSystemTheme(): Theme {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function getStoredTheme(): Theme | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (v === 'dark' || v === 'light') return v
  } catch {}
  return null
}

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme)
  try { localStorage.setItem(STORAGE_KEY, theme) } catch {}
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('light')

  // On mount: read stored pref or system pref
  useEffect(() => {
    const initial = getStoredTheme() ?? getSystemTheme()
    setTheme(initial)
    applyTheme(initial)

    // Keep in sync if OS preference changes while no explicit user pref exists
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onSystemChange = (e: MediaQueryListEvent) => {
      if (getStoredTheme() !== null) return   // user has made an explicit choice
      const next: Theme = e.matches ? 'dark' : 'light'
      setTheme(next)
      applyTheme(next)
    }

    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', onSystemChange)
      return () => mq.removeEventListener('change', onSystemChange)
    }
    mq.addListener(onSystemChange)
    return () => mq.removeListener(onSystemChange)
  }, [])

  /**
   * toggle — switches theme and triggers a View Transitions circle-reveal.
   * @param originX  X position of the toggle button (px from left) for the reveal origin
   * @param originY  Y position of the toggle button (px from top)  for the reveal origin
   */
  const toggle = useCallback((originX: number, originY: number) => {
    const next: Theme = theme === 'light' ? 'dark' : 'light'

    // Plant the reveal origin as CSS custom properties on <html>
    document.documentElement.style.setProperty('--vt-x', `${originX}px`)
    document.documentElement.style.setProperty('--vt-y', `${originY}px`)

    if (!('startViewTransition' in document)) {
      // Fallback: no animation, just switch
      setTheme(next)
      applyTheme(next)
      return
    }

    // View Transitions API — the CSS ::view-transition-new(root) does the reveal
    ;(document as any).startViewTransition(() => {
      setTheme(next)
      applyTheme(next)
    })
  }, [theme])

  return { theme, toggle }
}
