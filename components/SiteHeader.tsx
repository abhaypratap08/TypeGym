'use client'

import type { ReactNode } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import ThemeToggle from './ThemeToggle'

interface SiteHeaderProps {
  active: 'practice' | 'race'
  right?: ReactNode
}

export default function SiteHeader({ active, right }: SiteHeaderProps) {
  return (
    <>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <header className="site-header">
        <Link href="/" className="site-brand" aria-label="TypeGym home">
          <Image
            src="/logo.svg"
            alt=""
            className="brand-mark"
            width={32}
            height={32}
            aria-hidden="true"
            priority
          />
          <span className="brand-title">TypeGym</span>
        </Link>

        <nav className="site-nav" aria-label="Main navigation">
          <Link href="/" className="site-nav-link" aria-current={active === 'practice' ? 'page' : undefined}>
            Practice
          </Link>
          <Link href="/multiplayer" className="site-nav-link" aria-current={active === 'race' ? 'page' : undefined}>
            Race
          </Link>
        </nav>

        <div className="site-header-actions">
          {right}
          <ThemeToggle />
        </div>
      </header>
    </>
  )
}
