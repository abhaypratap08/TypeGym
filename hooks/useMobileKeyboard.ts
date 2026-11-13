'use client'

import { useEffect, useState } from 'react'

/**
 * Detects the native mobile software keyboard and mirrors that state onto
 * <body> as `.keyboard-open`, so global CSS can strip all chrome immediately.
 *
 * A focused typing input on a touch device is the primary signal: browsers
 * disagree about which viewport shrinks when the keyboard appears (and Safari
 * animates it in), so measuring the shrink alone left the header, metrics and
 * footer visible on real phones. The visualViewport ratio is kept as a second
 * opinion for keyboards that open without a focus event.
 *
 * The visible height is published as `--app-height` so focus mode can size the
 * typing surface to the area above the keyboard instead of the layout viewport.
 */
export function useMobileKeyboard(isInputFocused: boolean): boolean {
  const [open, setOpen] = useState(false)

  // Mirror focus mode onto the body element so CSS can act on it globally.
  useEffect(() => {
    const body = document.body
    body.classList.toggle('keyboard-open', open)
    return () => body.classList.remove('keyboard-open')
  }, [open])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const isMobile =
      window.matchMedia('(max-width: 767px)').matches &&
      (window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0)

    if (!isMobile) {
      setOpen(false)
      return
    }

    const vv = window.visualViewport
    const root = document.documentElement

    const sync = () => {
      const visible = vv ? vv.height : window.innerHeight
      root.style.setProperty('--app-height', `${Math.round(visible)}px`)

      // visualViewport is the most reliable way to spot a keyboard that takes
      // most of the screen. Focus still wins, because some browsers resize
      // window.innerHeight along with it and the ratio never drops.
      const keyboardShrunk = vv ? visible < window.innerHeight * 0.75 : false
      setOpen(isInputFocused || keyboardShrunk)
    }

    sync()
    vv?.addEventListener('resize', sync)
    vv?.addEventListener('scroll', sync)
    window.addEventListener('resize', sync)
    window.addEventListener('orientationchange', sync)

    return () => {
      vv?.removeEventListener('resize', sync)
      vv?.removeEventListener('scroll', sync)
      window.removeEventListener('resize', sync)
      window.removeEventListener('orientationchange', sync)
      root.style.removeProperty('--app-height')
    }
  }, [isInputFocused])

  return open
}
