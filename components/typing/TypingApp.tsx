'use client'

/**
 * TypingApp.tsx
 * =============
 * Root client component for TypeGym. Orchestrates all sub-components
 * and the typing engine hook. Handles global keyboard registration.
 *
 * Component tree:
 *   TypingApp
 *     ├── Header
 *     ├── ModeBar
 *     ├── LiveMetrics  (visible while active)
 *     ├── WordDisplay  (the typing area)
 *     ├── ProgressBar  (word/quote/code modes)
 *     ├── RestartButton
 *     └── ResultsScreen (visible when finished)
 */

import { useEffect, useCallback, useRef, useState } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { useTypingEngine } from '@/hooks/useTypingEngine'
import ModeBar        from './ModeBar'
import WordDisplay    from './WordDisplay'
import LiveMetrics    from './LiveMetrics'
import ResultsScreen  from './ResultsScreen'

export default function TypingApp() {
  const engine = useTypingEngine()
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [isTouchDevice, setIsTouchDevice] = useState(false)

  const {
    mode, codeLanguage, timeSetting, wordSetting,
    phase, words, currentInput, wordResults, currentWordIdx,
    timeLeft, liveWPM, liveAccuracy, finalResults,
    setMode, setCodeLanguage, setTimeSetting, setWordSetting,
    resetTest, handleKeyDown, handleTextInput,
  } = engine

  const focusInput = useCallback(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const media = window.matchMedia('(pointer: coarse)')
    const syncInputMode = () => setIsTouchDevice(media.matches || navigator.maxTouchPoints > 0)

    syncInputMode()

    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', syncInputMode)
      return () => media.removeEventListener('change', syncInputMode)
    }

    media.addListener(syncInputMode)
    return () => media.removeListener(syncInputMode)
  }, [])

  // ── Global keyboard listener ───────────────────────────────────────────────
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  useEffect(() => {
    if (phase === 'finished') return
    focusInput()
  }, [focusInput, phase])

  // ── Tab → restart (separate listener so it can preventDefault) ────────────
  useEffect(() => {
    const onTab = (e: KeyboardEvent) => {
      if (e.key === 'Tab') { e.preventDefault(); resetTest() }
    }
    window.addEventListener('keydown', onTab)
    return () => window.removeEventListener('keydown', onTab)
  }, [resetTest])

  // ── Progress percentage for word/quote/code modes ──────────────────────────
  const progressPct = mode === 'words'
    ? (currentWordIdx / wordSetting) * 100
    : (currentWordIdx / Math.max(words.length, 1)) * 100

  const showProgress =
    (mode === 'words' || mode === 'quote' || mode === 'code') &&
    words.length > 0

  return (
    <div
      className="bg-grid app-shell"
      style={{
        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      }}
    >
      {/* Ambient glow */}
      <div className="ambient-glow" />

      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <header className="app-header">
        {/* Logo */}
        <button
          onClick={resetTest}
          style={{
            display:    'flex',
            alignItems: 'center',
            gap:        10,
            background: 'transparent',
            border:     'none',
            cursor:     'pointer',
            padding:    0,
          }}
        >
          <div style={{
            width:        34,
            height:       34,
            borderRadius: 9,
            overflow:     'hidden',
            boxShadow:    '0 0 18px rgba(88, 166, 255, 0.12)',
          }}>
            <Image
              src="/logo.svg"
              alt="TypeGym logo placeholder"
              width={34}
              height={34}
              priority
            />
          </div>
          <span style={{
            fontFamily:    'Outfit, sans-serif',
            fontWeight:    700,
            fontSize:      19,
            color:         'var(--text-primary)',
            letterSpacing: '-0.01em',
          }}>
            Type<span style={{ color: 'var(--accent-blue)' }}>Gym</span>
          </span>
        </button>

        {/* Keyboard hint strip */}
        <div className="header-hints">
          {isTouchDevice ? (
            <>
              <span>Tap the text card to type</span>
              <span>Use restart below for a new run</span>
            </>
          ) : (
            <>
              <span><kbd>Tab</kbd>restart</span>
              <span><kbd>Space</kbd>next word</span>
            </>
          )}
        </div>
      </header>

      {/* ── MAIN ──────────────────────────────────────────────────────────── */}
      <main className="app-main">
        <AnimatePresence mode="wait">
          {phase !== 'finished' ? (
            <motion.div
              key="test"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
                display:        'flex',
                flexDirection:  'column',
                alignItems:     'center',
                gap:            24,
                width:          '100%',
              }}
            >
              {/* Mode selector toolbar */}
              <ModeBar
                mode={mode}
                codeLanguage={codeLanguage}
                timeSetting={timeSetting}
                wordSetting={wordSetting}
                onMode={setMode}
                onCodeLanguage={setCodeLanguage}
                onTime={setTimeSetting}
                onWord={setWordSetting}
              />

              {/* Live metrics — only shown while actively typing */}
              <AnimatePresence>
                {phase === 'active' && (
                  <motion.div
                    key="metrics"
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <LiveMetrics
                      wpm={liveWPM}
                      accuracy={liveAccuracy}
                      timeLeft={timeLeft}
                      mode={mode}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Word display area */}
              <div
                className="word-shell"
                onClick={focusInput}
                onTouchStart={focusInput}
              >
                <input
                  ref={inputRef}
                  className="typing-input-proxy"
                  value={currentInput}
                  onChange={(e) => handleTextInput(e.target.value)}
                  onFocus={(e) => {
                    const len = e.target.value.length
                    e.target.setSelectionRange(len, len)
                  }}
                  autoCapitalize="none"
                  autoCorrect="off"
                  autoComplete="off"
                  spellCheck={false}
                  inputMode="text"
                  enterKeyHint="done"
                  aria-label="Typing input"
                />
                <WordDisplay
                  words={words}
                  curIdx={currentWordIdx}
                  input={currentInput}
                  results={wordResults}
                  isIdle={phase === 'idle'}
                />
              </div>

              <div className="tap-hint">
                {mode === 'code'
                  ? `Preferred language: ${codeLanguage === 'cpp' ? 'C++' : codeLanguage}. Snippets are chosen randomly from that set.`
                  : isTouchDevice
                  ? 'Tap anywhere on the text card to keep the keyboard open.'
                  : 'Click the text area and start typing.'}
              </div>

              {/* Progress bar (word / quote / code modes) */}
              {showProgress && (
                <div style={{ width: '100%', maxWidth: 860 }}>
                  <div style={{
                    height:       2,
                    background:   'rgba(48, 54, 61, 0.4)',
                    borderRadius: 2,
                    overflow:     'hidden',
                  }}>
                    <motion.div
                      className="progress-fill"
                      style={{
                        height:       '100%',
                        background:   'var(--accent-blue)',
                        borderRadius: 2,
                        width:        `${Math.min(progressPct, 100)}%`,
                      }}
                      transition={{ duration: 0.1 }}
                    />
                  </div>
                </div>
              )}

              {/* Restart button */}
              <button
                className="restart-btn"
                onClick={(e) => { e.stopPropagation(); resetTest() }}
              >
                <RestartIcon />
                restart
                {!isTouchDevice && (
                  <span style={{ opacity: 0.4, fontSize: 10, marginLeft: 2 }}>tab</span>
                )}
              </button>
            </motion.div>
          ) : (
            /* Results screen */
            <motion.div
              key="results"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              {finalResults && (
                <ResultsScreen
                  results={finalResults}
                  onRestart={resetTest}
                  showKeyboardHint={!isTouchDevice}
                />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* ── FOOTER ────────────────────────────────────────────────────────── */}
      <footer className="app-footer">
        <span>TypeGym v1.0 · Open Source · MIT License</span>
        <a
          href="https://github.com/yourusername/typegym"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color:          'var(--text-dim)',
            textDecoration: 'none',
            display:        'flex',
            alignItems:     'center',
            gap:            5,
          }}
        >
          <GitHubIcon />
          github
        </a>
      </footer>
    </div>
  )
}

// ─── Icon helpers ─────────────────────────────────────────────────────────────

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

function GitHubIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  )
}
