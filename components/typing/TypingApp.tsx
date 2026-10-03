'use client'

import { useEffect, useCallback, useMemo, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import {
  analyzeResults, calcAccuracy, calcWPM, useTypingEngine,
} from '@/hooks/useTypingEngine'
import type { FinalResults, WordResult } from '@/hooks/useTypingEngine'
import { UI_SPRING } from '@/lib/motion'
import SiteHeader from '@/components/SiteHeader'
import { RestartIcon, SiteFooter } from '@/components/icons'
import ModeBar from './ModeBar'
import WordDisplay from './WordDisplay'
import LiveMetrics from './LiveMetrics'
import ResultsScreen from './ResultsScreen'

export default function TypingApp() {
  const engine = useTypingEngine()
  const inputRef = useRef<HTMLInputElement>(null)
  const focusFrame = useRef<number | null>(null)
  const [isTouchDevice, setIsTouchDevice] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const reduceMotion = useReducedMotion()

  const {
    mode, codeLanguage, timeSetting, wordSetting,
    phase, words, currentInput, wordResults, currentWordIdx,
    timeLeft, elapsed, liveWPM, liveAccuracy, finalResults,
    setMode, setCodeLanguage, setTimeSetting, setWordSetting,
    resetTest, finishCurrentTest, handleTextInput,
  } = engine

  const focusInput = useCallback(() => {
    inputRef.current?.focus({ preventScroll: true })
  }, [])

  const restart = useCallback(() => {
    resetTest()
    // Keep the touch keyboard open if the input is already mounted. When
    // returning from results, focus after React has restored the input.
    focusInput()
    if (focusFrame.current !== null) cancelAnimationFrame(focusFrame.current)
    focusFrame.current = requestAnimationFrame(focusInput)
  }, [resetTest, focusInput])

  useEffect(() => {
    const media = window.matchMedia('(pointer: coarse)')
    const sync = () => setIsTouchDevice(media.matches || navigator.maxTouchPoints > 0)
    sync()
    // Desktop can start typing immediately; never summon a touch keyboard or
    // pull focus back from navigation, mode controls, or another application.
    if (!media.matches && navigator.maxTouchPoints === 0 && document.activeElement === document.body) {
      focusInput()
    }
    media.addEventListener('change', sync)
    return () => {
      media.removeEventListener('change', sync)
      if (focusFrame.current !== null) cancelAnimationFrame(focusFrame.current)
    }
  }, [focusInput])

  useEffect(() => {
    if (mode === 'time' && phase === 'active' && timeLeft <= 0) finishCurrentTest()
  }, [finishCurrentTest, mode, phase, timeLeft])

  useEffect(() => {
    const onRestart = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented || event.repeat ||
          event.isComposing || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey) return
      const target = event.target
      if (target instanceof HTMLElement && target !== inputRef.current &&
          (target.isContentEditable || target.closest('input, textarea, select, [role="dialog"]'))) return
      event.preventDefault()
      restart()
    }
    window.addEventListener('keydown', onRestart)
    return () => window.removeEventListener('keydown', onRestart)
  }, [restart])

  // Preserve the deadline-based finish fallback; presentation must not delay
  // results or put extra work on the per-character rendering path.
  const fallbackResults = useMemo<FinalResults>(() => {
    const results: WordResult[] = [...wordResults]
    const currentWord = words[currentWordIdx]
    if (currentWord && currentInput !== '') results.push({ word: currentWord, typed: currentInput })
    const { correctChars, totalChars } = analyzeResults(results)
    const duration = Math.max(mode === 'time' ? timeSetting : elapsed, 1)
    return {
      wpm: calcWPM(correctChars, duration),
      accuracy: calcAccuracy(correctChars, totalChars),
      errors: results.filter(result => result.typed !== result.word).length,
      correctChars, totalChars, duration,
    }
  }, [currentInput, currentWordIdx, elapsed, mode, timeSetting, wordResults, words])

  const showResults = phase === 'finished' || (mode === 'time' && phase === 'active' && timeLeft <= 0)
  const progress = Math.min(1, mode === 'time'
    ? (timeSetting - timeLeft) / timeSetting
    : currentWordIdx / Math.max(words.length, 1))
  const sessionLabel = mode === 'time' ? `${timeSetting}-second practice`
    : mode === 'words' ? `${wordSetting}-word practice`
    : mode === 'quote' ? 'A little perspective'
    : `${codeLanguage === 'cpp' ? 'C++' : codeLanguage === 'javascript' ? 'JavaScript' : codeLanguage === 'python' ? 'Python' : codeLanguage === 'java' ? 'Java' : 'C'} practice`

  return (
    <div className="app-shell">
      <div className="app-window">
        <SiteHeader active="practice" />
        <main id="main-content" className="app-main practice-main" tabIndex={-1}>
          <div className="practice-intro">
            <p className="eyebrow">Your daily typing workout</p>
            <h1>Train your fingers. <span>Feed your streak.</span></h1>
            <p>Type faster. Miss less.</p>
          </div>

          {showResults ? (
            <ResultsScreen results={finalResults ?? fallbackResults} onRestart={restart} showKeyboardHint={!isTouchDevice} />
          ) : (
            <div className="test-layout">
              <ModeBar
                mode={mode} codeLanguage={codeLanguage}
                timeSetting={timeSetting} wordSetting={wordSetting}
                onMode={setMode} onCodeLanguage={setCodeLanguage}
                onTime={setTimeSetting} onWord={setWordSetting}
              />

              <section className="practice-workspace" aria-label="Typing practice">
                <div className="practice-toolbar">
                  <div className="session-description">
                    <h2>{sessionLabel}</h2>
                    <p className={`session-status${phase === 'active' ? ' is-active' : ''}`} role="status">
                      <span className="status-dot" aria-hidden="true" />
                      {phase === 'idle' ? 'Ready when you are' : isFocused ? 'Keep your rhythm' : mode === 'time' ? 'Timer running · select words to continue' : 'Select the words to continue'}
                    </p>
                  </div>
                  <LiveMetrics wpm={phase === 'idle' ? 0 : liveWPM} accuracy={phase === 'idle' ? 100 : liveAccuracy} timeLeft={timeLeft} mode={mode} />
                </div>

                <div
                  className={`word-shell ${phase === 'active' ? 'is-active' : 'is-idle'}`}
                  onClick={focusInput}
                >
                  <input
                    ref={inputRef}
                    className="typing-input-proxy"
                    value={currentInput}
                    onChange={event => handleTextInput(event.target.value)}
                    onKeyDown={event => {
                      if (event.key !== 'Enter' || event.nativeEvent.isComposing || event.ctrlKey || event.metaKey || event.altKey) return
                      event.preventDefault()
                      handleTextInput(`${currentInput} `)
                    }}
                    onFocus={event => {
                      setIsFocused(true)
                      const length = event.target.value.length
                      event.target.setSelectionRange(length, length)
                    }}
                    onBlur={() => setIsFocused(false)}
                    autoCapitalize="none" autoCorrect="off" autoComplete="off"
                    spellCheck={false} inputMode="text" enterKeyHint="next"
                    data-gramm="false" data-gramm_editor="false" data-enable-grammarly="false"
                    aria-label="Typing input" aria-describedby="typing-instructions"
                  />
                  <WordDisplay words={words} curIdx={currentWordIdx} input={currentInput} results={wordResults} isIdle={phase === 'idle'} />
                </div>

                <div className="practice-progress" role="progressbar" aria-label={mode === 'time' ? 'Time elapsed' : 'Words completed'} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
                  <motion.div className="progress-fill" initial={false} animate={{ scaleX: progress }} transition={reduceMotion ? { duration: 0 } : UI_SPRING} />
                </div>

                <div className="practice-actions">
                  <p id="typing-instructions" className="tap-hint">
                    {isTouchDevice ? 'Tap the words to begin. Space moves to the next word.' : <><kbd>Space</kbd> next word <span className="hint-divider">·</span> <kbd>Tab</kbd> move between controls</>}
                  </p>
                  <button type="button" className="restart-btn" onClick={restart} aria-keyshortcuts="Escape">
                    <RestartIcon /> Restart {!isTouchDevice && <kbd aria-hidden="true">Esc</kbd>}
                  </button>
                </div>
              </section>
              <p className="practice-note">{mode === 'code' ? 'Real syntax. A steadier rhythm. Snippets change with each restart.' : 'Accuracy first. Speed will follow.'}</p>
            </div>
          )}
        </main>
        <SiteFooter />
      </div>
    </div>
  )
}
