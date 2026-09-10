'use client'

/**
 * TypingApp.tsx
 * =============
 * Root client component. Wraps everything in a macOS-style application window
 * floating above the wallpaper. Chrome: traffic-light controls, translucent
 * titlebar, centered title. Dock: floating control bar beneath the window.
 *
 * Behavior/logic is unchanged from the performance-hardened version.
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

// ── Traffic light button ──────────────────────────────────────────────────────

function TrafficLight({ cls }: { cls: 'tl-close' | 'tl-min' | 'tl-max' }) {
  return <span className={`traffic-light ${cls}`} aria-hidden="true" />
}

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

  // ── Touch detection ───────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === 'undefined') return
    const media = window.matchMedia('(pointer: coarse)')
    const sync = () => setIsTouchDevice(media.matches || navigator.maxTouchPoints > 0)
    sync()
    if (typeof media.addEventListener === 'function') {
      media.addEventListener('change', sync)
      return () => media.removeEventListener('change', sync)
    }
    media.addListener(sync)
    return () => media.removeListener(sync)
  }, [])

  // ── Global keyboard listeners ─────────────────────────────────────────────
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

  useEffect(() => {
    const onTab = (e: KeyboardEvent) => {
      if (e.key === 'Tab') { e.preventDefault(); resetTest() }
    }
    window.addEventListener('keydown', onTab)
    return () => window.removeEventListener('keydown', onTab)
  }, [resetTest])

  // ── Progress ──────────────────────────────────────────────────────────────
  const progressPct = mode === 'words'
    ? (currentWordIdx / wordSetting) * 100
    : (currentWordIdx / Math.max(words.length, 1)) * 100

  const showProgress =
    (mode === 'words' || mode === 'quote' || mode === 'code') && words.length > 0

  // ── Fallback results (used while finishing) ───────────────────────────────
  const fallbackResults = useMemo<FinalResults>(() => {
    const results: WordResult[] = [...wordResults]
    const currentWord = words[currentWordIdx]
    if (currentWord && currentInput !== '') {
      results.push({ word: currentWord, typed: currentInput })
    }
    const { correctChars, totalChars } = analyzeResults(results)
    const duration = Math.max(mode === 'time' ? timeSetting : elapsed, 1)
    return {
      wpm: calcWPM(correctChars, duration),
      accuracy: calcAccuracy(correctChars, totalChars),
      errors: results.filter(r => r.typed !== r.word).length,
      correctChars, totalChars, duration,
    }
  }, [currentInput, currentWordIdx, elapsed, mode, timeSetting, wordResults, words])

  const resultsForDisplay = finalResults ?? fallbackResults
  const showResults =
    phase === 'finished' ||
    (mode === 'time' && phase === 'active' && timeLeft <= 0)

  // ── Keyboard hint ─────────────────────────────────────────────────────────
  const codeLabel = codeLanguage === 'cpp' ? 'C++' : codeLanguage

  return (
    <div className="app-shell bg-grid">

      {/* ── Wallpaper glows are body::before pseudo — nothing to render here ── */}

      {/* ── Application window ────────────────────────────────────────────── */}
      <div className="app-window">

        {/* ── TITLEBAR ──────────────────────────────────────────────────── */}
        <div className="app-titlebar">
          {/* Traffic lights */}
          <div className="titlebar-lights">
            <TrafficLight cls="tl-close" />
            <TrafficLight cls="tl-min" />
            <TrafficLight cls="tl-max" />
          </div>

          {/* Centered title */}
          <span className="titlebar-title">TypeGym</span>

          {/* Right: multiplayer + keyboard hints */}
          <div className="titlebar-right">
            {!isTouchDevice && (
              <div className="header-hints" style={{ display: 'flex' }}>
                <span><kbd>Tab</kbd>restart</span>
                <span><kbd>Space</kbd>next word</span>
              </div>
            )}
            <Link href="/multiplayer" className="mp-nav-link">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
              race
            </Link>
          </div>
        </div>

        {/* ── MAIN CONTENT ──────────────────────────────────────────────── */}
        <main className="app-main">
          {!showResults ? (
            <motion.div
              key="test"
              initial={false}
              animate={{ opacity: 1 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, width: '100%' }}
            >
              {/* Mode selector */}
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

              {/* Live metrics — visible while typing */}
              <AnimatePresence>
                {phase === 'active' && (
                  <motion.div
                    key="metrics"
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
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

              {/* Typing area */}
              <div
                className={`word-shell ${phase === 'active' ? 'is-active' : 'is-idle'}`}
                onClick={focusInput}
                onTouchStart={focusInput}
                style={{ touchAction: 'manipulation' }}
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
                  onBlur={() => {
                    if (engine.phase !== 'finished') {
                      requestAnimationFrame(() => inputRef.current?.focus())
                    }
                  }}
                  autoCapitalize="none"
                  autoCorrect="off"
                  autoComplete="off"
                  spellCheck={false}
                  inputMode="text"
                  enterKeyHint="done"
                  data-gramm="false"
                  data-gramm_editor="false"
                  data-enable-grammarly="false"
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

              {/* Hint text */}
              <div className={`tap-hint${isTouchDevice && mode !== 'code' ? ' tap-hint-touch' : ''}`}>
                {mode === 'code'
                  ? `Language: ${codeLabel}. Snippets are chosen randomly.`
                  : isTouchDevice
                  ? 'Tap the text area to keep the keyboard open.'
                  : 'Click the text area and start typing.'}
              </div>

              {/* Progress bar */}
              {showProgress && (
                <div style={{ width: '100%' }}>
                  <div style={{
                    height: 2, background: 'rgba(180,168,148,0.22)',
                    borderRadius: 2, overflow: 'hidden',
                  }}>
                    <motion.div
                      className="progress-fill"
                      style={{ height: '100%', borderRadius: 2, width: `${Math.min(progressPct, 100)}%` }}
                      transition={{ duration: 0.12 }}
                    />
                  </div>
                </div>
              )}

              {/* Restart */}
              <button
                className="restart-btn"
                onClick={(e) => { e.stopPropagation(); resetTest() }}
              >
                <RestartIcon />
                restart
                {!isTouchDevice && (
                  <span style={{ opacity: 0.42, fontSize: 11, marginLeft: 2 }}>tab</span>
                )}
              </button>
            </motion.div>
          ) : (
            <motion.div
              key="results"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              style={{ width: '100%', display: 'flex', justifyContent: 'center' }}
            >
              <ResultsScreen
                results={resultsForDisplay}
                onRestart={resetTest}
                showKeyboardHint={!isTouchDevice}
              />
            </motion.div>
          )}
        </main>

        {/* ── FOOTER ────────────────────────────────────────────────────── */}
        <SiteFooter />
      </div>

      {/* ── FLOATING DOCK ─────────────────────────────────────────────────── */}
      <div className="app-dock">
        <div className="dock-container">
          {/* Logo / home */}
          <Link href="/" className="dock-btn is-active" title="Practice">
            <Image src="/logo.svg" alt="TypeGym" width={20} height={20} style={{ opacity: 0.7 }} />
          </Link>

          <div className="dock-divider" />

          {/* Multiplayer */}
          <Link href="/multiplayer" className="dock-btn" title="Multiplayer race">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </Link>

          <div className="dock-divider" />

          {/* Restart */}
          <button className="dock-btn" title="Restart test (Tab)" onClick={resetTest}>
            <RestartIcon />
          </button>
        </div>
      </div>

    </div>
  )
}
