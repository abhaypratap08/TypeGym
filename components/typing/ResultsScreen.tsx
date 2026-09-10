'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import type { FinalResults } from '@/hooks/useTypingEngine'
import { RestartIcon } from '@/components/icons'

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
  delay?: number
}

function StatCard({ label, value, color, large = false, delay = 0 }: StatCardProps) {
  return (
    <motion.div
      className="result-stat"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.28, ease: 'easeOut' }}
    >
      <div className="result-stat-label">{label}</div>
      <div
        className={`result-stat-value${large ? ' is-large' : ''}`}
        style={{ color }}
      >
        {value}
      </div>
    </motion.div>
  )
}

export default function ResultsScreen({
  results,
  onRestart,
  showKeyboardHint = true,
}: ResultsScreenProps) {
  const { wpm, accuracy, errors, correctChars, totalChars, duration } = results

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

  return (
    <motion.div
      className="result-card"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.32, ease: 'easeOut' }}
      role="region"
      aria-label={`Results: ${wpm} wpm, ${accuracy}% accuracy, ${perf.label}`}
    >
      {/* Screen-reader announcement */}
      <span className="sr-only" role="status" aria-live="polite">
        Test complete. {wpm} words per minute, {accuracy}% accuracy, {perf.label}.
      </span>

      {/* Header */}
      <div className="results-header">
        <h2 className="result-title">Session Results</h2>
        <motion.span
          initial={{ opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.45 }}
          className="result-badge"
          style={{
            color:      perf.color,
            background: `${perf.color}18`,
            border:     `1px solid ${perf.color}28`,
          }}
        >
          {perf.label}
        </motion.span>
      </div>

      {/* Stats grid */}
      <div className="results-grid">
        <StatCard label="wpm"           value={wpm}              color="var(--teal)"  large delay={0.05} />
        <StatCard label="accuracy"      value={`${accuracy}%`}   color={accColor}     large delay={0.10} />
        <StatCard label="errors"        value={errors}           color={errors === 0 ? 'var(--teal)' : 'var(--coral)'} delay={0.14} />
        <StatCard label="duration"      value={`${duration}s`}   color="var(--ink-secondary)" delay={0.18} />
        <StatCard label="correct chars" value={correctChars}     color="var(--teal)"  delay={0.22} />
        <StatCard label="total chars"   value={totalChars}       color="var(--ink-tertiary)" delay={0.26} />
      </div>

      {/* Accuracy bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.30 }}
        style={{ marginBottom: 20 }}
      >
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          marginBottom: 7, fontSize: 11,
          color: 'var(--ink-tertiary)',
          fontFamily: 'var(--font-geist), system-ui, sans-serif',
          textTransform: 'uppercase', letterSpacing: '0.07em',
        }}>
          <span>Accuracy</span>
          <span style={{ color: accColor }}>{accuracy}%</span>
        </div>
        <div style={{
          height: 3, background: 'rgba(180,168,148,0.22)',
          borderRadius: 3, overflow: 'hidden',
        }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${accuracy}%` }}
            transition={{ duration: 0.9, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
            style={{
              height: '100%', borderRadius: 3,
              background: `linear-gradient(90deg, var(--teal), ${accColor})`,
            }}
          />
        </div>
      </motion.div>

      {/* Coaching note */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.42 }}
        style={{
          fontFamily: 'var(--font-geist), system-ui, sans-serif',
          fontSize: 13.5,
          color: 'var(--ink-tertiary)',
          lineHeight: 1.6,
          marginBottom: 20,
        }}
      >
        {tip}
      </motion.p>

      {/* Restart */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.38 }}
      >
        <button
          className="restart-btn"
          onClick={onRestart}
          style={{ width: '100%', justifyContent: 'center', padding: '10px 20px', minHeight: 40 }}
        >
          <RestartIcon />
          Restart
          {showKeyboardHint && (
            <span style={{ opacity: 0.38, fontSize: 10, marginLeft: 2 }}>tab</span>
          )}
        </button>
      </motion.div>
    </motion.div>
  )
}
