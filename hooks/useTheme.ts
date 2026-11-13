'use client'

/**
 * useTheme.ts
 * ===========
 * Manages the active TypeGym theme (graphite, olive, light, midnight, legacy).
 *
 * Priority order:
 *   1. localStorage 'tg-theme'  (explicit user choice, persists across sessions)
 *   2. prefers-color-scheme     (OS setting, used when no stored pref)
 *   3. 'graphite'               (hardcoded fallback)
 *
 * Applies data-theme immediately; CSS owns the interruptible color transition.
 * Only an explicit selection writes a preference to storage.
 */

import { useState, useEffect, useCallback } from 'react'

export type Theme = 'graphite' | 'olive' | 'light' | 'midnight' | 'legacy'

const STORAGE_KEY = 'tg-theme'
const THEME_CHANGE_EVENT = 'tg-theme-change'
const VALID: Theme[] = ['graphite', 'olive', 'light', 'midnight', 'legacy']

function isTheme(v: string | null): v is Theme {
  return v !== null && (VALID as string[]).includes(v)
}

function getSystemTheme(): Theme {
  if (typeof window === 'undefined') return 'graphite'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'graphite' : 'light'
}

function getStoredTheme(): Theme | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    if (isTheme(v)) return v
  } catch {}
  return null
}

function applyTheme(theme: Theme) {
  const root = document.documentElement
  root.setAttribute('data-theme', theme)
  // Tailwind dark: variants rely on a .dark class.
  if (theme === 'light' || theme === 'legacy') root.classList.remove('dark')
  else root.classList.add('dark')
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>('graphite')

  useEffect(() => {
    const syncTheme = (next: Theme) => {
      applyTheme(next)
      setTheme(next)
    }

    syncTheme(getStoredTheme() ?? getSystemTheme())

    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onSystemChange = (e: MediaQueryListEvent) => {
      if (getStoredTheme() === null) syncTheme(e.matches ? 'graphite' : 'light')
    }
    const onStorageChange = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY && e.key !== null) return
      const v = getStoredTheme()
      if (v) syncTheme(v)
    }
    const onThemeChange = () => {
      const current = document.documentElement.getAttribute('data-theme')
      if (isTheme(current)) setTheme(current)
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

  const set = useCallback((next: Theme) => {
    applyTheme(next)
    setTheme(next)
    try { localStorage.setItem(STORAGE_KEY, next) } catch {}
    window.dispatchEvent(new Event(THEME_CHANGE_EVENT))
  }, [])

  return { theme, setTheme: set }
}