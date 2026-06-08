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
 * LiveMetrics — displays WPM, accuracy, and timer while the test is active.
 * Memoized; only re-renders when metric values actually change.
 */
const LiveMetrics = memo(function LiveMetrics({
  wpm, accuracy, timeLeft, mode,
}: LiveMetricsProps) {
  const accColor =
    accuracy >= 95 ? 'var(--accent-green)'  :
    accuracy >= 80 ? 'var(--accent-orange)' :
                     'var(--accent-red)'

  const timeColor = timeLeft <= 10 ? 'var(--accent-red)' : 'var(--text-primary)'

  return (
    <div className="metrics-row">
      <div className="metric-card">
        <div className="metric-label">wpm</div>
        <div className="metric-value" style={{ color: 'var(--accent-blue)' }}>
          {wpm}
        </div>
      </div>

      <div className="metric-card">
        <div className="metric-label">acc</div>
        <div className="metric-value" style={{ color: accColor }}>
          {accuracy}<span style={{ fontSize: 14 }}>%</span>
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
