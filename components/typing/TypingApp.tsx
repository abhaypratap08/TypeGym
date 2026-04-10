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

import { useEffect, useCallback } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { useTypingEngine } from '@/hooks/useTypingEngine'
import ModeBar        from './ModeBar'
import WordDisplay    from './WordDisplay'
import LiveMetrics    from './LiveMetrics'
import ResultsScreen  from './ResultsScreen'

export default function TypingApp() {
  const engine = useTypingEngine()

  const {
    mode, timeSetting, wordSetting,
    phase, words, currentInput, wordResults, currentWordIdx,
    timeLeft, liveWPM, liveAccuracy, finalResults,
    setMode, setTimeSetting, setWordSetting,
    resetTest, handleKeyDown,
  } = engine

  // ── Global keyboard listener ───────────────────────────────────────────────
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

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
      className="bg-grid"
      style={{
        fontFamily:    "'JetBrains Mono', 'Fira Code', monospace",
        minHeight:     '100vh',
        background:    'var(--bg-primary)',
        display:       'flex',
        flexDirection: 'column',
        position:      'relative',
        overflow:      'hidden',
      }}
    >
      {/* Ambient glow */}
      <div className="ambient-glow" />

      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <header style={{
        display:        'flex',
        justifyContent: 'space-between',
        alignItems:     'center',
        padding:        '18px 36px',
        borderBottom:   '1px solid rgba(48, 54, 61, 0.25)',
        position:       'relative',
        zIndex:         10,
      }}>
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
        <div style={{
          display:    'flex',
          gap:        20,
          fontSize:   11,
          color:      'var(--text-dim)',
          alignItems: 'center',
        }}>
          <span><kbd>Tab</kbd>restart</span>
          <span><kbd>Space</kbd>next word</span>
        </div>
      </header>

      {/* ── MAIN ──────────────────────────────────────────────────────────── */}
      <main style={{
        flex:           1,
        display:        'flex',
        flexDirection:  'column',
        alignItems:     'center',
        justifyContent: 'center',
        padding:        '28px 20px 44px',
        gap:            24,
        position:       'relative',
        zIndex:         1,
      }}>
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
                timeSetting={timeSetting}
                wordSetting={wordSetting}
                onMode={setMode}
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
              <div style={{ width: '100%', maxWidth: 860 }}>
                <WordDisplay
                  words={words}
                  curIdx={currentWordIdx}
                  input={currentInput}
                  results={wordResults}
                  isIdle={phase === 'idle'}
                />
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
                <span style={{ opacity: 0.4, fontSize: 10, marginLeft: 2 }}>tab</span>
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
                <ResultsScreen results={finalResults} onRestart={resetTest} />
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* ── FOOTER ────────────────────────────────────────────────────────── */}
      <footer style={{
        padding:        '13px 36px',
        borderTop:      '1px solid rgba(48, 54, 61, 0.2)',
        display:        'flex',
        justifyContent: 'space-between',
        fontSize:       11,
        color:          'var(--text-dim)',
        fontFamily:     'Outfit, sans-serif',
        position:       'relative',
        zIndex:         1,
      }}>
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
