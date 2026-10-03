'use client'

import { memo, useId } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import type { TestMode } from '@/hooks/useTypingEngine'
import type { CodeLanguage } from '@/lib/datasets'
import { UI_SPRING } from '@/lib/motion'

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

interface PillOption<T extends string | number> {
  value: T
  label: string
  accessibleLabel?: string
}

const TIME_OPTIONS: PillOption<number>[] = [15, 30, 60, 120].map(value => ({
  value,
  label: `${value} s`,
  accessibleLabel: `${value} seconds`,
}))
const WORD_OPTIONS: PillOption<number>[] = [25, 50, 100].map(value => ({
  value,
  label: `${value} words`,
}))
const CODE_OPTIONS: PillOption<CodeLanguage>[] = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'c', label: 'C' },
  { value: 'cpp', label: 'C++' },
]
const MODE_OPTIONS: PillOption<TestMode>[] = [
  { value: 'time', label: 'Timed' },
  { value: 'words', label: 'Words' },
  { value: 'quote', label: 'Quotes' },
  { value: 'code', label: 'Code' },
]

// ── Pill segment group ────────────────────────────────────────────────────────

interface PillGroupProps<T extends string | number> {
  options:   PillOption<T>[]
  active:    T
  onChange:  (v: T) => void
  layoutId:  string
  label:     string
  className: 'mode-bar-primary' | 'mode-bar-sub'
}

function PillGroup<T extends string | number>({
  options, active, onChange, layoutId, label, className,
}: PillGroupProps<T>) {
  const reduceMotion = useReducedMotion()

  return (
    <div className={className} role="group" aria-label={label}>
      {options.map(({ value, label: optionLabel, accessibleLabel }) => {
        const isActive = value === active
        return (
          <button
            key={String(value)}
            type="button"
            className={`mode-btn ${isActive ? 'active' : ''}`}
            aria-label={accessibleLabel}
            aria-pressed={isActive}
            onClick={() => {
              if (!isActive) onChange(value)
            }}
          >
            {isActive && (reduceMotion ? (
              <span className="mode-selection" aria-hidden="true" />
            ) : (
              <motion.span
                className="mode-selection"
                layoutId={layoutId}
                initial={false}
                transition={UI_SPRING}
                aria-hidden="true"
              />
            ))}
            <span className="mode-option-label">{optionLabel}</span>
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

  return (
    <div className="mode-bar">
      <PillGroup
        options={MODE_OPTIONS}
        active={mode}
        onChange={onMode}
        layoutId={`${uid}-mode`}
        label="Practice mode"
        className="mode-bar-primary"
      />

      {/* Keep a reserved row even when the selected mode has no options. */}
      <div className="mode-options-slot">
        {mode === 'time' && (
          <PillGroup
            options={TIME_OPTIONS}
            active={timeSetting}
            onChange={onTime}
            layoutId={`${uid}-time`}
            label="Test duration"
            className="mode-bar-sub"
          />
        )}
        {mode === 'words' && (
          <PillGroup
            options={WORD_OPTIONS}
            active={wordSetting}
            onChange={onWord}
            layoutId={`${uid}-words`}
            label="Word count"
            className="mode-bar-sub"
          />
        )}
        {mode === 'code' && (
          <PillGroup
            options={CODE_OPTIONS}
            active={codeLanguage}
            onChange={onCodeLanguage}
            layoutId={`${uid}-code`}
            label="Code language"
            className="mode-bar-sub"
          />
        )}
      </div>
    </div>
  )
})

export default ModeBar
