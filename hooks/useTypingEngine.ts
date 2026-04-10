'use client'

/**
 * useTypingEngine.ts
 * ==================
 * The beating heart of TypeGym. Manages all typing state:
 *   - Word generation per test mode
 *   - Per-keystroke character matching
 *   - Timer (for timed mode)
 *   - WPM + accuracy calculation
 *   - Test lifecycle: idle → active → finished
 *
 * Design goals:
 *   - <5ms per keystroke (no expensive recomputation on hot path)
 *   - Stable callback references to prevent cascading re-renders
 *   - Refs for timer/phase to avoid stale closure bugs
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { WORDS_LIST, QUOTES_LIST, CODE_LIST } from '@/lib/datasets'

// ─── Types ────────────────────────────────────────────────────────────────────

export type TestMode  = 'time' | 'words' | 'quote' | 'code'
export type TestPhase = 'idle' | 'active' | 'finished'

export interface WordResult {
  word:  string  // expected text
  typed: string  // what the user actually typed
}

export interface FinalResults {
  wpm:          number
  accuracy:     number   // 0–100 integer
  errors:       number   // wrong words count
  correctChars: number
  totalChars:   number
  duration:     number   // seconds
}

export interface TypingEngineState {
  mode:           TestMode
  timeSetting:    number
  wordSetting:    number
  phase:          TestPhase
  words:          string[]
  currentInput:   string
  wordResults:    WordResult[]
  currentWordIdx: number
  timeLeft:       number
  elapsed:        number
  liveWPM:        number
  liveAccuracy:   number
  finalResults:   FinalResults | null
}

export interface TypingEngineActions {
  setMode:        (m: TestMode) => void
  setTimeSetting: (t: number) => void
  setWordSetting: (w: number) => void
  resetTest:      () => void
  handleKeyDown:  (e: KeyboardEvent) => void
}

// ─── Metric helpers ───────────────────────────────────────────────────────────

/**
 * Standard WPM formula: (characters / 5) / minutes
 * Dividing by 5 converts raw chars to "words" (avg English word ≈ 5 chars)
 */
export function calcWPM(correctChars: number, seconds: number): number {
  if (seconds <= 0) return 0
  return Math.round((correctChars / 5) / (seconds / 60))
}

/** Accuracy as an integer percentage */
export function calcAccuracy(correct: number, total: number): number {
  if (total === 0) return 100
  return Math.round((correct / total) * 100)
}

/**
 * Walk the completed results array and count correct vs total characters.
 * Pure function — safe to call in useMemo.
 */
export function analyzeResults(results: WordResult[]): { correctChars: number; totalChars: number } {
  let correctChars = 0
  let totalChars   = 0
  for (const { word, typed } of results) {
    totalChars += Math.max(word.length, typed.length)
    const len = Math.min(word.length, typed.length)
    for (let i = 0; i < len; i++) {
      if (typed[i] === word[i]) correctChars++
    }
  }
  return { correctChars, totalChars }
}

// ─── Word generation ──────────────────────────────────────────────────────────

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function extendWords(existing: string[], count: number): string[] {
  return [...existing, ...Array.from({ length: count }, () => pickRandom(WORDS_LIST))]
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}

function buildWordList(mode: TestMode, timeSetting: number, wordSetting: number): string[] {
  switch (mode) {
    case 'time':  return Array.from({ length: 200 }, () => pickRandom(WORDS_LIST))
    case 'words': return Array.from({ length: wordSetting }, () => pickRandom(WORDS_LIST))
    case 'quote': return pickRandom(QUOTES_LIST).split(' ')
    case 'code':  return pickRandom(CODE_LIST).split(' ')
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useTypingEngine(): TypingEngineState & TypingEngineActions {
  // Config
  const [mode,        setModeState]  = useState<TestMode>('time')
  const [timeSetting, setTimeState]  = useState(30)
  const [wordSetting, setWordState]  = useState(50)

  // Test state
  const [phase,          setPhase]   = useState<TestPhase>('idle')
  const [words,          setWords]   = useState<string[]>([])
  const [currentInput,   setInput]   = useState('')
  const [wordResults,    setResults] = useState<WordResult[]>([])
  const [currentWordIdx, setWIdx]    = useState(0)
  const [timeLeft,       setTL]      = useState(30)
  const [elapsed,        setElapsed] = useState(0)
  const [finalResults,   setFinal]   = useState<FinalResults | null>(null)

  // Mutable refs for stable closure access inside timer / keydown
  const refs = useRef({
    mode, timeSetting, wordSetting,
    phase, words, currentInput,
    wordResults, currentWordIdx,
    elapsed, timeLeft,
  })
  // Always keep refs up-to-date
  refs.current = {
    mode, timeSetting, wordSetting,
    phase, words, currentInput,
    wordResults, currentWordIdx,
    elapsed, timeLeft,
  }

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Reset ──────────────────────────────────────────────────────────────────

  const resetTest = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    const { mode: m, timeSetting: ts, wordSetting: ws } = refs.current
    setWords(buildWordList(m, ts, ws))
    setInput('')
    setResults([])
    setWIdx(0)
    setPhase('idle')
    setFinal(null)
    setElapsed(0)
    setTL(ts)
  }, [])

  // Reset when config changes
  useEffect(() => { resetTest() }, [mode, timeSetting, wordSetting]) // eslint-disable-line

  // ── Finish ─────────────────────────────────────────────────────────────────

  const finishTest = useCallback((results: WordResult[], seconds: number) => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (refs.current.phase === 'finished') return
    setPhase('finished')

    const { correctChars, totalChars } = analyzeResults(results)
    const dur = Math.max(seconds, 1)

    setFinal({
      wpm:          calcWPM(correctChars, dur),
      accuracy:     calcAccuracy(correctChars, totalChars),
      errors:       results.filter(r => r.typed !== r.word).length,
      correctChars,
      totalChars,
      duration:     dur,
    })
  }, [])

  // ── Timer (only active while phase === 'active') ───────────────────────────

  useEffect(() => {
    if (phase !== 'active') return

    // Snapshot counters into local mutables to avoid closure staleness
    let e  = refs.current.elapsed
    let tl = refs.current.timeLeft
    const modeSnap = refs.current.mode

    timerRef.current = setInterval(() => {
      e  += 1
      tl -= 1
      setElapsed(e)
      if (modeSnap === 'time') {
        setTL(tl)
        if (tl <= 0) finishTest(refs.current.wordResults, e)
      }
    }, 1000)

    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [phase, finishTest])

  // ── Keyboard handler (the hot path — keep allocations minimal) ─────────────

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const { phase: ph, currentInput: ci, words: ws,
            currentWordIdx: wi, mode: m, wordSetting: wset,
            wordResults: res, elapsed: el } = refs.current

    if (ph === 'finished') return
    if (isEditableTarget(e.target)) return
    if (e.ctrlKey || e.metaKey || e.altKey) return

    const { key } = e

    // ── Space / Enter → commit current word ──────────────────────────────────
    if (key === ' ' || key === 'Enter') {
      e.preventDefault()
      if (ci === '') return

      const word = ws[wi]
      if (!word) return

      const newRes   = [...res, { word, typed: ci }]
      const nextWIdx = wi + 1

      setResults(newRes)
      setWIdx(nextWIdx)
      setInput('')

      if (ph === 'idle') setPhase('active')

      if (m === 'time' && nextWIdx >= ws.length - 20) {
        setWords(prev => extendWords(prev, 100))
      }

      // Check end condition for word/quote/code modes
      const isDone =
        (m === 'words' && nextWIdx >= wset) ||
        ((m === 'quote' || m === 'code') && nextWIdx >= ws.length)

      if (isDone) setTimeout(() => finishTest(newRes, el + 1), 50)
      return
    }

    // ── Backspace → delete last character ────────────────────────────────────
    if (key === 'Backspace') {
      setInput(prev => prev.slice(0, -1))
      return
    }

    // ── Printable character → append ─────────────────────────────────────────
    if (key.length === 1) {
      if (ph === 'idle') setPhase('active')
      const cw = ws[wi] ?? ''
      setInput(prev => prev.length < cw.length + 10 ? prev + key : prev)
    }
  }, [finishTest])

  // ── Live metrics (memoized — only recompute when relevant state changes) ───

  const liveWPM = useMemo(() => {
    if (elapsed === 0 || wordResults.length === 0) return 0
    const { correctChars } = analyzeResults(wordResults)
    return calcWPM(correctChars, elapsed)
  }, [wordResults, elapsed])

  const liveAccuracy = useMemo(() => {
    const { correctChars, totalChars } = analyzeResults(wordResults)
    const cw = words[currentWordIdx] ?? ''
    let ec = 0
    const et = Math.max(cw.length, currentInput.length)
    for (let i = 0; i < currentInput.length && i < cw.length; i++) {
      if (currentInput[i] === cw[i]) ec++
    }
    return calcAccuracy(correctChars + ec, totalChars + et)
  }, [wordResults, currentInput, words, currentWordIdx])

  // ── Config setters ─────────────────────────────────────────────────────────

  const setMode        = useCallback((m: TestMode) => setModeState(m), [])
  const setTimeSetting = useCallback((t: number)   => setTimeState(t), [])
  const setWordSetting = useCallback((w: number)   => setWordState(w), [])

  return {
    mode, timeSetting, wordSetting,
    phase, words, currentInput, wordResults, currentWordIdx,
    timeLeft, elapsed,
    liveWPM, liveAccuracy,
    finalResults,
    setMode, setTimeSetting, setWordSetting,
    resetTest, handleKeyDown,
  }
}
