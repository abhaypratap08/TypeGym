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
 * Applies data-theme immediately; CSS owns the interruptible color transition.
 * Only an explicit toggle writes a preference to storage.
 */

import { useState, useEffect, useCallback } from 'react'

export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'tg-theme'
const THEME_CHANGE_EVENT = 'tg-theme-change'

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
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('light')

  useEffect(() => {
    const syncTheme = (next: Theme) => {
      applyTheme(next)
      setTheme(next)
    }

    syncTheme(getStoredTheme() ?? getSystemTheme())

    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onSystemChange = (e: MediaQueryListEvent) => {
      if (getStoredTheme() === null) syncTheme(e.matches ? 'dark' : 'light')
    }
    const onStorageChange = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY && e.key !== null) return
      syncTheme(getStoredTheme() ?? getSystemTheme())
    }
    const onThemeChange = () => {
      const current = document.documentElement.getAttribute('data-theme')
      if (current === 'light' || current === 'dark') setTheme(current)
    }

    window.addEventListener('storage', onStorageChange)
    window.addEventListener(THEME_CHANGE_EVENT, onThemeChange)
    if (typeof mq.addEventListener === 'function') {
      mq.addEventListener('change', onSystemChange)
    } else {
      mq.addListener(onSystemChange)
    }

    return () => {
      window.removeEventListener('storage', onStorageChange)
      window.removeEventListener(THEME_CHANGE_EVENT, onThemeChange)
      if (typeof mq.removeEventListener === 'function') {
        mq.removeEventListener('change', onSystemChange)
      } else {
        mq.removeListener(onSystemChange)
      }
    }
  }, [])

  const toggle = useCallback(() => {
    // Read the immediately applied value so rapid toggles never use stale state.
    const current = document.documentElement.getAttribute('data-theme')
      ?? getStoredTheme() ?? getSystemTheme()
    const next: Theme = current === 'dark' ? 'light' : 'dark'
    applyTheme(next)
    setTheme(next)
    try { localStorage.setItem(STORAGE_KEY, next) } catch {}
    // Storage events only reach other documents; keep local consumers in sync too.
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT))
  }, [])

  return { theme, toggle }
}
