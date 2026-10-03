'use client'

import type { ReactNode } from 'react'
import { SiteFooter } from '@/components/icons'
import SiteHeader from '@/components/SiteHeader'

export function MultiplayerHeader({ right }: { right?: ReactNode }) {
  return <SiteHeader active="race" right={right} />
}

export function MultiplayerFooter() {
  return <SiteFooter />
}
