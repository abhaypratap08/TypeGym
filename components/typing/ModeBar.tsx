'use client'

import { memo, useRef, useId } from 'react'
import { motion } from 'framer-motion'
import type { TestMode } from '@/hooks/useTypingEngine'
import type { CodeLanguage } from '@/lib/datasets'

interface ModeBarProps {
  mode:           TestMode
  codeLanguage:   CodeLanguage
  timeSetting:    number
  wordSetting:    number
  onMode:         (m: TestMode) => void
  onCodeLanguage: (l: CodeLanguage) => void
  onTime:         (t: number) => void
  onWord:         (w: number) => void
}

const TIME_OPTIONS:  number[]       = [15, 30, 60, 120]
const WORD_OPTIONS:  number[]       = [25, 50, 100]
const CODE_OPTIONS:  CodeLanguage[] = ['javascript', 'python', 'java', 'c', 'cpp']
const MODE_OPTIONS:  TestMode[]     = ['time', 'words', 'quote', 'code']

// ── Pill segment group ────────────────────────────────────────────────────────

interface PillGroupProps<T extends string | number> {
  options:   { value: T; label: string }[]
  active:    T
  onChange:  (v: T) => void
  layoutId?: string
}

function PillGroup<T extends string | number>({
  options, active, onChange, layoutId,
}: PillGroupProps<T>) {
  return (
    <div className="mode-bar-primary" role="group">
      {options.map(({ value, label }) => {
        const isActive = value === active
        return (
          <button
            key={String(value)}
            className={`mode-btn ${isActive ? 'active' : ''}`}
            onClick={() => onChange(value)}
            style={{ position: 'relative' }}
          >
            {/* Sliding background pill — only rendered on active item */}
            {isActive && layoutId && (
              <motion.span
                layoutId={layoutId}
                style={{
                  position: 'absolute',
                  inset: 0,
                  borderRadius: 'var(--r-pill)',
                  background: 'var(--teal)',
                  zIndex: 0,
                }}
                transition={{ type: 'spring', stiffness: 420, damping: 34, mass: 0.7 }}
              />
            )}
            <span style={{ position: 'relative', zIndex: 1 }}>{label}</span>
          </button>
        )
      })}
    </div>
  )
}

const ModeBar = memo(function ModeBar({
  mode, codeLanguage, timeSetting, wordSetting,
  onMode, onCodeLanguage, onTime, onWord,
}: ModeBarProps) {
  const uid = useId()

  const modeOptions = MODE_OPTIONS.map(m => ({ value: m, label: m }))

  const timeOptions  = TIME_OPTIONS.map(t => ({ value: t, label: String(t) }))
  const wordOptions  = WORD_OPTIONS.map(w => ({ value: w, label: String(w) }))
  const codeOptions  = CODE_OPTIONS.map(l => ({ value: l, label: l === 'cpp' ? 'c++' : l }))

  return (
    <div className="mode-bar">
      {/* Primary mode row */}
      <PillGroup
        options={modeOptions}
        active={mode}
        onChange={onMode}
        layoutId={`${uid}-mode`}
      />

      {/* Sub-options */}
      {mode === 'time' && (
        <PillGroup
          options={timeOptions}
          active={timeSetting}
          onChange={onTime}
          layoutId={`${uid}-time`}
        />
      )}
      {mode === 'words' && (
        <PillGroup
          options={wordOptions}
          active={wordSetting}
          onChange={onWord}
          layoutId={`${uid}-words`}
        />
      )}
      {mode === 'code' && (
        <PillGroup
          options={codeOptions}
          active={codeLanguage}
          onChange={onCodeLanguage}
          layoutId={`${uid}-code`}
        />
      )}
    </div>
  )
})

export default ModeBar
