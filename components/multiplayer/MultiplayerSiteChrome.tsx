'use client'

import type { ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { SiteFooter } from '@/components/icons'

/** Header aligned with TypingApp: logo, brand title, optional right actions. */
export function MultiplayerHeader({ right }: { right?: ReactNode }) {
  return (
    <header className="app-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, flexWrap: 'wrap', minWidth: 0 }}>
        <Link
          href="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 18,
            textDecoration: 'none',
            color: 'inherit',
            minWidth: 0,
          }}
        >
          <div className="brand-logo">
            <Image src="/logo.svg" alt="TypeGym logo" width={72} height={72} priority />
          </div>
          <span
            className="brand-title"
            style={{
              fontFamily: 'var(--font-outfit), sans-serif',
              fontWeight: 700,
              color: 'var(--text-primary)',
              letterSpacing: 0,
            }}
          >
            Type<span style={{ color: 'var(--accent-blue)' }}>Gym</span>
          </span>
        </Link>
        <span
          style={{
            fontFamily: 'var(--font-outfit), sans-serif',
            fontWeight: 500,
            fontSize: 22,
            color: 'var(--text-muted)',
            letterSpacing: '-0.02em',
          }}
        >
          multiplayer
        </span>
      </div>

      <div style={{ flex: 1, minWidth: 12 }} />

      {right != null && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 12, flexWrap: 'wrap' }}>
          {right}
        </div>
      )}
    </header>
  )
}

export function MultiplayerFooter() {
  return <SiteFooter />
}
