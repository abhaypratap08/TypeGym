'use client'

import type { ReactNode } from 'react'
import { MotionConfig } from 'framer-motion'
import { UI_SPRING } from '@/lib/motion'

export default function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user" transition={UI_SPRING}>
      {children}
    </MotionConfig>
  )
}
