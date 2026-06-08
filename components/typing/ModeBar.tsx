'use client'

import { memo } from 'react'
import type { TestMode } from '@/hooks/useTypingEngine'
import type { CodeLanguage } from '@/lib/datasets'

interface ModeBartProps {
  mode:           TestMode
  codeLanguage:   CodeLanguage
  timeSetting:    number
  wordSetting:    number
  onMode:         (m: TestMode) => void
  onCodeLanguage: (l: CodeLanguage) => void
  onTime:         (t: number) => void
  onWord:         (w: number) => void
}

const TIME_OPTIONS  = [15, 30, 60, 120]
const WORD_OPTIONS  = [25, 50, 100]
const CODE_OPTIONS: CodeLanguage[] = ['javascript', 'python', 'java', 'c', 'cpp']

const ModeBar = memo(function ModeBar({
  mode, codeLanguage, timeSetting, wordSetting,
  onMode, onCodeLanguage, onTime, onWord,
}: ModeBartProps) {
  return (
    <div className="mode-bar">

      {/* ── Primary mode row — always rendered ── */}
      <div className="mode-bar-primary">
        <button
          className={`mode-btn ${mode === 'time'  ? 'active' : ''}`}
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
          className={`mode-btn ${mode === 'code'  ? 'active' : ''}`}
          onClick={() => onMode('code')}
        >code</button>
      </div>

      {/* ── Sub-options row — mode-dependent ── */}
      {mode === 'time' && (
        <div className="mode-bar-sub">
          {TIME_OPTIONS.map(t => (
            <button
              key={t}
              className={`mode-btn ${timeSetting === t ? 'active' : ''}`}
              onClick={() => onTime(t)}
            >{t}</button>
          ))}
        </div>
      )}

      {mode === 'words' && (
        <div className="mode-bar-sub">
          {WORD_OPTIONS.map(w => (
            <button
              key={w}
              className={`mode-btn ${wordSetting === w ? 'active' : ''}`}
              onClick={() => onWord(w)}
            >{w}</button>
          ))}
        </div>
      )}

      {mode === 'code' && (
        <div className="mode-bar-sub">
          {CODE_OPTIONS.map(l => (
            <button
              key={l}
              className={`mode-btn ${codeLanguage === l ? 'active' : ''}`}
              onClick={() => onCodeLanguage(l)}
            >
              {l === 'cpp' ? 'c++' : l}
            </button>
          ))}
        </div>
      )}

    </div>
  )
})

export default ModeBar
