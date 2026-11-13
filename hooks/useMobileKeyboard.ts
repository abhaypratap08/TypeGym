'use client'

import { useEffect, useState } from 'react'

/**
 * Detects whether the native mobile software keyboard is likely open.
 * Uses the Visual Viewport API combined with input focus + a mobile heuristic.
 * Returns false on desktop/tablet (non-touch) environments.
 */
export function useMobileKeyboard(isInputFocused: boolean): boolean {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const isMobile = window.matchMedia('(max-width: 767px)').matches &&
      (window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0)
    if (!isMobile) return

    const vv = window.visualViewport
    if (!vv) {
      // Fallback: treat focus on mobile as keyboard open.
      setOpen(isInputFocused)
      return
    }

    let baseline = vv.height
    const onResize = () => {
      const h = vv.height
      // Keyboard open typically shrinks visual viewport by > 120px.
      const shrunk = baseline - h > 120
      setOpen(isInputFocused && shrunk)
    }
    const onScroll = () => { /* no-op, keep baseline stable */ }

    // Recompute baseline on orientation change.
    const onOrientation = () => { baseline = vv.height; setOpen(false) }

    vv.addEventListener('resize', onResize)
    vv.addEventListener('scroll', onScroll)
    window.addEventListener('orientationchange', onOrientation)
    return () => {
      vv.removeEventListener('resize', onResize)
      vv.removeEventListener('scroll', onScroll)
      window.removeEventListener('orientationchange', onOrientation)
    }
  }, [isInputFocused])

  // When input loses focus, close focus mode.
  useEffect(() => {
    if (!isInputFocused) setOpen(false)
  }, [isInputFocused])

  return open
}