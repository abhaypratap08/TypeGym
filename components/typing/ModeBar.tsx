'use client'

import { memo } from 'react'
import type { TestMode } from '@/hooks/useTypingEngine'
import type { CodeLanguage } from '@/lib/datasets'

interface ModeBartProps {
  mode:        TestMode
  codeLanguage: CodeLanguage
  timeSetting: number
  wordSetting: number
  onMode:      (m: TestMode) => void
  onCodeLanguage: (l: CodeLanguage) => void
  onTime:      (t: number) => void
  onWord:      (w: number) => void
}

const TIME_OPTIONS = [15, 30, 60, 120]
const WORD_OPTIONS = [25, 50, 100]
const CODE_OPTIONS: CodeLanguage[] = ['javascript', 'python', 'java', 'c', 'cpp']

/**
 * ModeBar — the test configuration toolbar.
 * Memoized since it only changes when user explicitly modifies settings.
 */
const ModeBar = memo(function ModeBar({
  mode, codeLanguage, timeSetting, wordSetting, onMode, onCodeLanguage, onTime, onWord,
}: ModeBartProps) {
  return (
    <div className="mode-bar">
      {/* Primary mode buttons */}
      <button
        className={`mode-btn ${mode === 'time' ? 'active' : ''}`}
        onClick={() => onMode('time')}
      >time</button>

      <button
        className={`mode-btn ${mode === 'words' ? 'active' : ''}`}
        onClick={() => onMode('words')}
      >words</button>

      <button
        className={`mode-btn ${mode === 'quote' ? 'active' : ''}`}
        onClick={() => onMode('quote')}
      >quote</button>

      <button
        className={`mode-btn ${mode === 'code' ? 'active' : ''}`}
        onClick={() => onMode('code')}
      >code</button>

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

      {mode === 'code' && (
        <>
          <div className="mode-divider" />
          {CODE_OPTIONS.map(language => (
            <button
              key={language}
              className={`mode-btn ${codeLanguage === language ? 'active' : ''}`}
              onClick={() => onCodeLanguage(language)}
            >
              {language === 'cpp' ? 'c++' : language}
            </button>
          ))}
        </>
      )}
    </div>
  )
})

export default ModeBar
