'use client'

import { useEffect, useId, useMemo, useRef } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import type { FinalResults } from '@/hooks/useTypingEngine'
import { RestartIcon } from '@/components/icons'
import { FADE_TRANSITION, UI_SPRING } from '@/lib/motion'

interface ResultsScreenProps {
  results:          FinalResults
  onRestart:        () => void
  showKeyboardHint?: boolean
}

interface StatCardProps {
  label: string
  value: string | number
  color: string
  large?: boolean
}

function StatCard({ label, value, color, large = false }: StatCardProps) {
  return (
    <div className="result-stat">
      <dt className="result-stat-label">{label}</dt>
      <dd
        className={`result-stat-value${large ? ' is-large' : ''}`}
        style={{ color }}
      >
        {value}
      </dd>
    </div>
  )
}

export default function ResultsScreen({
  results,
  onRestart,
  showKeyboardHint = true,
}: ResultsScreenProps) {
  const { wpm, accuracy, errors, correctChars, totalChars, duration } = results
  const reduceMotion = useReducedMotion()
  const headingRef = useRef<HTMLHeadingElement>(null)
  const headingId = useId()
  const summaryId = useId()

  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true })
  }, [])

  const perf = useMemo(() => {
    if (wpm >= 100) return { label: 'elite',     color: 'var(--lavender)' }
    if (wpm >= 70)  return { label: 'advanced',  color: 'var(--teal)'    }
    if (wpm >= 50)  return { label: 'proficient',color: 'var(--teal)'    }
    if (wpm >= 30)  return { label: 'building',  color: 'var(--accent-orange)' }
    return               { label: 'baseline',  color: 'var(--ink-tertiary)' }
  }, [wpm])

  const accColor =
    accuracy >= 95 ? 'var(--teal)'   :
    accuracy >= 80 ? 'var(--accent-orange)' :
                     'var(--coral)'

  const tip =
    accuracy < 90
      ? 'Prioritise accuracy. Speed follows naturally.'
      : wpm < 40
      ? 'Good accuracy. Daily short sessions compound quickly.'
      : 'Solid session. Consistency is the long game.'

  const accuracyFraction = Math.min(Math.max(accuracy, 0), 100) / 100

  return (
    <motion.section
      className="result-card"
      initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={reduceMotion ? FADE_TRANSITION : { ...UI_SPRING, opacity: FADE_TRANSITION }}
      aria-labelledby={headingId}
    >
      <p className="sr-only" id={summaryId}>
        Test complete. {wpm} words per minute, {accuracy}% accuracy, {perf.label}.
      </p>

      <div className="results-header">
        <h2
          className="result-title"
          id={headingId}
          ref={headingRef}
          tabIndex={-1}
          aria-describedby={summaryId}
        >
          Session Results
        </h2>
        <span
          className="result-badge"
          style={{ color: perf.color }}
        >
          {perf.label}
        </span>
      </div>

      <dl className="results-grid">
        <StatCard label="Words per minute"   value={wpm}            color="var(--teal)" large />
        <StatCard label="Accuracy"           value={`${accuracy}%`} color={accColor}    large />
        <StatCard label="Word errors"        value={errors}         color={errors === 0 ? 'var(--teal)' : 'var(--coral)'} />
        <StatCard label="Duration"           value={`${duration} s`} color="var(--ink-secondary)" />
        <StatCard label="Correct characters" value={correctChars}   color="var(--teal)" />
        <StatCard label="Total characters"   value={totalChars}     color="var(--ink-tertiary)" />
      </dl>

      <div className="result-accuracy" aria-hidden="true">
        <div className="result-summary">
          <span>Accuracy</span>
          <span style={{ color: accColor }}>{accuracy}%</span>
        </div>
        <div className="result-track">
          <motion.div
            className="result-progress"
            initial={{ scaleX: reduceMotion ? accuracyFraction : 0 }}
            animate={{ scaleX: accuracyFraction }}
            transition={reduceMotion ? { duration: 0 } : UI_SPRING}
            style={{
              background: `linear-gradient(90deg, var(--teal), ${accColor})`,
            }}
          />
        </div>
      </div>

      <p className="result-tip">{tip}</p>

      <div className="result-actions">
        <button
          type="button"
          className="restart-btn"
          onClick={onRestart}
          aria-keyshortcuts="Escape"
        >
          <RestartIcon />
          Restart
          {showKeyboardHint && (
            <kbd aria-hidden="true">Escape</kbd>
          )}
        </button>
      </div>
    </motion.section>
  )
}
