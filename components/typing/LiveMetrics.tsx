'use client'

import { memo } from 'react'
import type { TestMode } from '@/hooks/useTypingEngine'

interface LiveMetricsProps {
  wpm:      number
  accuracy: number
  timeLeft: number
  mode:     TestMode
}

/**
 * LiveMetrics — compact pill panel displayed above the typing area while active.
 * Uses restrained color: teal for WPM, coral only when accuracy is poor or time
 * is running out. Muted ink-tertiary labels keep the UI quiet.
 */
const LiveMetrics = memo(function LiveMetrics({
  wpm, accuracy, timeLeft, mode,
}: LiveMetricsProps) {
  const accColor =
    accuracy >= 95 ? 'var(--teal)'   :
    accuracy >= 80 ? 'var(--accent-orange)' :
                     'var(--coral)'

  const timeColor = timeLeft <= 10 ? 'var(--coral)' : 'var(--ink)'

  return (
    <div
      className="metrics-row"
      aria-label={`Live stats: ${wpm} wpm, ${accuracy}% accuracy${mode === 'time' ? `, ${timeLeft}s left` : ''}`}
    >
      <div className="metric-card">
        <div className="metric-label">wpm</div>
        <div className="metric-value" style={{ color: 'var(--teal)' }}>
          {wpm}
        </div>
      </div>

      <div className="metric-card">
        <div className="metric-label">acc</div>
        <div className="metric-value" style={{ color: accColor }}>
          {accuracy}<span style={{ fontSize: 12, fontWeight: 500 }}>%</span>
        </div>
      </div>

      {mode === 'time' && (
        <div className="metric-card">
          <div className="metric-label">time</div>
          <div className="metric-value" style={{ color: timeColor }}>
            {timeLeft}
          </div>
        </div>
      )}
    </div>
  )
})

export default LiveMetrics
