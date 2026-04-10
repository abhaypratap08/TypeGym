'use client'

import { memo } from 'react'
import type { TestMode } from '@/hooks/useTypingEngine'

interface ModeBartProps {
  mode:        TestMode
  timeSetting: number
  wordSetting: number
  onMode:      (m: TestMode) => void
  onTime:      (t: number) => void
  onWord:      (w: number) => void
}

const TIME_OPTIONS = [15, 30, 60, 120]
const WORD_OPTIONS = [25, 50, 100]

/**
 * ModeBar — the test configuration toolbar.
 * Memoized since it only changes when user explicitly modifies settings.
 */
const ModeBar = memo(function ModeBar({
  mode, timeSetting, wordSetting, onMode, onTime, onWord,
}: ModeBartProps) {
  return (
    <div style={{
      display:        'flex',
      alignItems:     'center',
      gap:            2,
      background:     'rgba(22, 27, 34, 0.8)',
      border:         '1px solid rgba(48, 54, 61, 0.45)',
      borderRadius:   12,
      padding:        '5px 8px',
      backdropFilter: 'blur(8px)',
      flexWrap:       'wrap',
      justifyContent: 'center',
    }}>
      {/* Primary mode buttons */}
      <button
        className={`mode-btn ${mode === 'time' ? 'active' : ''}`}
        onClick={() => onMode('time')}
      >⏱ time</button>

      <button
        className={`mode-btn ${mode === 'words' ? 'active' : ''}`}
        onClick={() => onMode('words')}
      ># words</button>

      <button
        className={`mode-btn ${mode === 'quote' ? 'active' : ''}`}
        onClick={() => onMode('quote')}
      >&quot; quote</button>

      <button
        className={`mode-btn ${mode === 'code' ? 'active' : ''}`}
        onClick={() => onMode('code')}
      >{`</>`} code</button>

      {/* Time sub-options */}
      {mode === 'time' && (
        <>
          <div className="mode-divider" />
          {TIME_OPTIONS.map(t => (
            <button
              key={t}
              className={`mode-btn ${timeSetting === t ? 'active' : ''}`}
              onClick={() => onTime(t)}
            >{t}</button>
          ))}
        </>
      )}

      {/* Word count sub-options */}
      {mode === 'words' && (
        <>
          <div className="mode-divider" />
          {WORD_OPTIONS.map(w => (
            <button
              key={w}
              className={`mode-btn ${wordSetting === w ? 'active' : ''}`}
              onClick={() => onWord(w)}
            >{w}</button>
          ))}
        </>
      )}
    </div>
  )
})

export default ModeBar
