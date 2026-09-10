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

import { useEffect, useCallback, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  analyzeResults,
  calcAccuracy,
  calcWPM,
  useTypingEngine,
} from '@/hooks/useTypingEngine'
import type { FinalResults, WordResult } from '@/hooks/useTypingEngine'
import ModeBar        from './ModeBar'
import WordDisplay    from './WordDisplay'
import LiveMetrics    from './LiveMetrics'
import ResultsScreen  from './ResultsScreen'
import { RestartIcon, SiteFooter } from '@/components/icons'

export default function TypingApp() {
  const engine = useTypingEngine()
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [isTouchDevice, setIsTouchDevice] = useState(false)

  const {
    mode, codeLanguage, timeSetting, wordSetting,
    phase, words, currentInput, wordResults, currentWordIdx,
    timeLeft, elapsed, liveWPM, liveAccuracy, finalResults,
    setMode, setCodeLanguage, setTimeSetting, setWordSetting,
    resetTest, finishCurrentTest, handleKeyDown, handleTextInput,
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

  useEffect(() => {
    if (mode !== 'time' || phase !== 'active' || timeLeft > 0) return
    finishCurrentTest()
  }, [finishCurrentTest, mode, phase, timeLeft])

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

  const fallbackResults = useMemo<FinalResults>(() => {
    const results: WordResult[] = [...wordResults]
    const currentWord = words[currentWordIdx]

    if (currentWord && currentInput !== '') {
      results.push({ word: currentWord, typed: currentInput })
    }

    const { correctChars, totalChars } = analyzeResults(results)
    const duration = Math.max(
      mode === 'time' ? timeSetting : elapsed,
      1,
    )

    return {
      wpm: calcWPM(correctChars, duration),
      accuracy: calcAccuracy(correctChars, totalChars),
      errors: results.filter(r => r.typed !== r.word).length,
      correctChars,
      totalChars,
      duration,
    }
  }, [currentInput, currentWordIdx, elapsed, mode, timeSetting, wordResults, words])

  const resultsForDisplay = finalResults ?? fallbackResults
  const showResults =
    phase === 'finished' ||
    (mode === 'time' && phase === 'active' && timeLeft <= 0)

  return (
    <div
      className="bg-grid app-shell"
    >
      {/* ── HEADER ────────────────────────────────────────────────────────── */}
      <header className="app-header">
        {/* Logo */}
        <div
          style={{
            display:    'flex',
            alignItems: 'center',
            gap:        18,
            background: 'transparent',
            border:     'none',
            padding:    0,
          }}
        >
          <div className="brand-logo">
            <Image
              src="/logo.svg"
              alt="TypeGym logo"
              width={72}
              height={72}
              priority
            />
          </div>
          <span className="brand-title" style={{
            fontFamily:    'var(--font-outfit), sans-serif',
            fontWeight:    700,
            color:         'var(--text-primary)',
            letterSpacing: 0,
          }}>
            Type<span style={{ color: 'var(--accent-blue)' }}>Gym</span>
          </span>
        </div>

        {/* Multiplayer button */}
        <Link href="/multiplayer" className="mp-nav-link">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          multiplayer
        </Link>

        {/* Keyboard hint strip */}
        <div className="header-hints" role="group" aria-label="Keyboard shortcuts">
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
        {!showResults ? (
          <motion.div
            key="test"
            initial={false}
            animate={{ opacity: 1 }}
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
              className={`word-shell ${phase === 'active' ? 'is-active' : 'is-idle'}`}
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

            <div className={`tap-hint${isTouchDevice && mode !== 'code' ? ' tap-hint-touch' : ''}`}>
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
                <span style={{
                  color:      'var(--text-secondary)',
                  fontSize:   12,
                  fontWeight: 600,
                  marginLeft: 3,
                }}>tab</span>
              )}
            </button>
          </motion.div>
        ) : (
          /* Results screen */
          <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <ResultsScreen
              results={resultsForDisplay}
              onRestart={resetTest}
              showKeyboardHint={!isTouchDevice}
            />
          </motion.div>
        )}
      </main>

      {/* ── FOOTER ────────────────────────────────────────────────────────── */}
      <SiteFooter />
    </div>
  )
}
