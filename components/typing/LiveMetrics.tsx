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
 * Values update directly, without motion or live announcements on each key.
 * Fixed numeric columns keep the text area steady as the numbers change.
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
    <dl className="metrics-row" aria-label="Live typing statistics">
      <div className="metric-card">
        <dt className="metric-label">Speed</dt>
        <dd className="metric-value" style={{ color: 'var(--teal)' }}>
          <span className="metric-number">{wpm}</span>
          <span className="metric-unit" aria-hidden="true">wpm</span>
          <span className="sr-only"> words per minute</span>
        </dd>
      </div>

      <div className="metric-card">
        <dt className="metric-label">Accuracy</dt>
        <dd className="metric-value" style={{ color: accColor }}>
          <span className="metric-number">{accuracy}</span>
          <span className="metric-unit">%</span>
        </dd>
      </div>

      {mode === 'time' && (
        <div className="metric-card">
          <dt className="metric-label">Time left</dt>
          <dd className="metric-value" style={{ color: timeColor }}>
            <span className="metric-number">{timeLeft}</span>
            <span className="metric-unit" aria-hidden="true">s</span>
            <span className="sr-only"> seconds</span>
          </dd>
        </div>
      )}
    </dl>
  )
})

export default LiveMetrics
