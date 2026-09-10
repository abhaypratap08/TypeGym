'use client'

import type { ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { SiteFooter } from '@/components/icons'

/** Shared traffic-light titlebar for multiplayer screens. */
export function MultiplayerHeader({ right }: { right?: ReactNode }) {
  return (
    <div className="app-titlebar">
      {/* Traffic lights */}
      <div className="titlebar-lights">
        <span className="traffic-light tl-close" aria-hidden="true" />
        <span className="traffic-light tl-min"   aria-hidden="true" />
        <span className="traffic-light tl-max"   aria-hidden="true" />
      </div>

      {/* Centered title + logo */}
      <Link
        href="/"
        className="titlebar-title"
        style={{
          display: 'flex', alignItems: 'center', gap: 7,
          textDecoration: 'none', color: 'inherit',
          pointerEvents: 'auto',
        }}
      >
        <span className="brand-logo" style={{ flexShrink: 0 }}>
          <Image src="/logo.svg" alt="TypeGym" width={18} height={18} />
        </span>
        <span style={{ fontWeight: 500, fontSize: 13, letterSpacing: 0 }}>
          TypeGym{' '}
          <span style={{ color: 'var(--ink-tertiary)', fontWeight: 400 }}>
            multiplayer
          </span>
        </span>
      </Link>

      {/* Right slot */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {right}
      </div>
    </div>
  )
}

export function MultiplayerFooter() {
  return <SiteFooter />
}
