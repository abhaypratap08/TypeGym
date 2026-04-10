'use client'

import { useMemo } from 'react'
import { motion } from 'framer-motion'
import type { FinalResults } from '@/hooks/useTypingEngine'

interface ResultsScreenProps {
  results:   FinalResults
  onRestart: () => void
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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3, ease: 'easeOut' }}
    >
      <div style={{
        fontFamily:    'Outfit, sans-serif',
        fontSize:      10,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color:         'var(--text-muted)',
        marginBottom:  5,
      }}>
        {label}
      </div>
      <div style={{
        fontFamily: 'JetBrains Mono, monospace',
        fontSize:   large ? 42 : 26,
        fontWeight: 700,
        color,
        lineHeight: 1,
      }}>
        {value}
      </div>
    </motion.div>
  )
}

/**
 * ResultsScreen — shown after each completed test.
 * Displays WPM, accuracy, errors, timing, and a performance tier badge.
 */
export default function ResultsScreen({ results, onRestart }: ResultsScreenProps) {
  const { wpm, accuracy, errors, correctChars, totalChars, duration } = results

  const perf = useMemo(() => {
    if (wpm >= 100) return { label: 'Elite',      color: 'var(--accent-purple)' }
    if (wpm >= 70)  return { label: 'Advanced',   color: 'var(--accent-blue)'   }
    if (wpm >= 50)  return { label: 'Proficient', color: 'var(--accent-neon)'   }
    if (wpm >= 30)  return { label: 'Developing', color: 'var(--accent-green)'  }
    return               { label: 'Beginner',   color: 'var(--accent-orange)' }
  }, [wpm])

  const accColor =
    accuracy >= 95 ? 'var(--accent-green)'  :
    accuracy >= 80 ? 'var(--accent-orange)' :
                     'var(--accent-red)'

  const tip =
    accuracy < 90
      ? '💡 Focus on accuracy first — speed will follow naturally.'
      : wpm < 40
      ? '💡 Great accuracy! Practice daily to build lasting muscle memory.'
      : '✨ Solid session. Consistency is the key to long-term improvement.'

  return (
    <motion.div
      className="result-card"
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
    >
      {/* Header row */}
      <div style={{
        display:        'flex',
        justifyContent: 'space-between',
        alignItems:     'center',
        marginBottom:   30,
      }}>
        <h2 style={{
          fontFamily:    'Outfit, sans-serif',
          fontWeight:    700,
          fontSize:      22,
          letterSpacing: '-0.02em',
          color:         'var(--text-primary)',
        }}>
          Test Complete
        </h2>

        <motion.span
          initial={{ opacity: 0, x: 10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          style={{
            fontFamily: 'JetBrains Mono, monospace',
            fontSize:   11,
            color:      perf.color,
            background: `${perf.color}18`,
            border:     `1px solid ${perf.color}30`,
            padding:    '4px 12px',
            borderRadius: 20,
          }}
        >
          {perf.label}
        </motion.span>
      </div>

      {/* Stats grid: 2 columns */}
      <div style={{
        display:               'grid',
        gridTemplateColumns:   '1fr 1fr',
        gap:                   12,
        marginBottom:          22,
      }}>
        <StatCard label="wpm"          value={wpm}          color="var(--accent-blue)"  large delay={0.05} />
        <StatCard label="accuracy"     value={`${accuracy}%`} color={accColor}          large delay={0.10} />
        <StatCard label="errors"       value={errors}       color={errors === 0 ? 'var(--accent-green)' : 'var(--accent-red)'} delay={0.15} />
        <StatCard label="duration"     value={`${duration}s`} color="var(--text-secondary)" delay={0.20} />
        <StatCard label="correct chars" value={correctChars} color="var(--accent-green)"  delay={0.25} />
        <StatCard label="total chars"  value={totalChars}   color="var(--text-muted)"    delay={0.30} />
      </div>

      {/* Accuracy progress bar */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.35 }}
        style={{ marginBottom: 22 }}
      >
        <div style={{
          display:        'flex',
          justifyContent: 'space-between',
          marginBottom:   8,
          fontSize:       11,
          color:          'var(--text-muted)',
          fontFamily:     'Outfit, sans-serif',
        }}>
          <span>Accuracy</span>
          <span style={{ color: accColor }}>{accuracy}%</span>
        </div>
        <div style={{
          height:       4,
          background:   'rgba(48, 54, 61, 0.4)',
          borderRadius: 4,
          overflow:     'hidden',
        }}>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${accuracy}%` }}
            transition={{ duration: 1, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
            style={{
              height:       '100%',
              background:   accColor,
              borderRadius: 4,
            }}
            className="progress-fill"
          />
        </div>
      </motion.div>

      {/* Coaching tip */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        style={{
          fontFamily: 'Outfit, sans-serif',
          fontSize:   12,
          color:      'var(--text-muted)',
          lineHeight: 1.6,
          marginBottom: 22,
        }}
      >
        {tip}
      </motion.p>

      {/* Restart button */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
      >
        <button
          className="restart-btn"
          onClick={onRestart}
          style={{ width: '100%', justifyContent: 'center', padding: '12px 20px' }}
        >
          <RestartIcon />
          Try Again
          <span style={{ opacity: 0.4, fontSize: 10, marginLeft: 2 }}>tab</span>
        </button>
      </motion.div>
    </motion.div>
  )
}

function RestartIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round"
    >
      <polyline points="1 4 1 10 7 10" />
      <path d="M3.51 15a9 9 0 1 0 .49-3.47" />
    </svg>
  )
}
