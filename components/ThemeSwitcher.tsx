'use client'

import { useCallback } from 'react'
import { useTheme, type Theme } from '@/hooks/useTheme'

const ORDER: Theme[] = ['graphite', 'olive', 'light', 'midnight', 'legacy']

const META: Record<Theme, { label: string; swatch: string }> = {
  graphite: { label: 'Graphite', swatch: '#A78BFA' },
  olive: { label: 'Olive', swatch: '#E8DFC5' },
  light: { label: 'Light', swatch: '#7255C7' },
  midnight: { label: 'Midnight', swatch: '#65C7DB' },
  legacy: { label: 'Legacy', swatch: '#21735f' },
}

export default function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()

  const advance = useCallback(() => {
    const idx = ORDER.indexOf(theme)
    const next = ORDER[(idx + 1) % ORDER.length]
    setTheme(next)
  }, [theme, setTheme])

  const meta = META[theme]

  return (
    <button
      type="button"
      className="theme-switcher-btn"
      onClick={advance}
      aria-label={`Switch theme, current theme: ${meta.label}`}
      title={`Switch theme, current: ${meta.label}`}
    >
      <span className="theme-switcher-label">{meta.label}</span>
    </button>
  )
}