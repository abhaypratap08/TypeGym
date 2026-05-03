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
import { WORDS_LIST, QUOTES_LIST, CODE_SNIPPETS } from '@/lib/datasets'
import type { CodeLanguage } from '@/lib/datasets'

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
  codeLanguage:   CodeLanguage
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
  setCodeLanguage: (l: CodeLanguage) => void
  setTimeSetting: (t: number) => void
  setWordSetting: (w: number) => void
  resetTest:      () => void
  finishCurrentTest: () => void
  handleKeyDown:  (e: KeyboardEvent) => void
  handleTextInput: (value: string) => void
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

function pickRandom<T>(arr: readonly T[]): T {
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

function clampInput(value: string, expected: string): string {
  return value.slice(0, expected.length + 10)
}

function buildWordList(
  mode: TestMode,
  timeSetting: number,
  wordSetting: number,
  codeLanguage: CodeLanguage,
): string[] {
  switch (mode) {
    case 'time':  return Array.from({ length: 200 }, () => pickRandom(WORDS_LIST))
    case 'words': return Array.from({ length: wordSetting }, () => pickRandom(WORDS_LIST))
    case 'quote': return pickRandom(QUOTES_LIST).split(' ')
    case 'code':  return pickRandom(CODE_SNIPPETS[codeLanguage]).split(' ')
  }
}

function buildInitialWordList(): string[] {
  return WORDS_LIST.slice(0, 200)
}

function collectResultsForFinish(
  results: WordResult[],
  words: string[],
  currentWordIdx: number,
  currentInput: string,
): WordResult[] {
  const currentWord = words[currentWordIdx]
  if (!currentWord || currentInput === '') return results
  return [...results, { word: currentWord, typed: currentInput }]
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useTypingEngine(): TypingEngineState & TypingEngineActions {
  // Config
  const [mode,        setModeState]  = useState<TestMode>('time')
  const [codeLanguage, setCodeLanguageState] = useState<CodeLanguage>('javascript')
  const [timeSetting, setTimeState]  = useState(30)
  const [wordSetting, setWordState]  = useState(50)

  // Test state
  const [phase,          setPhase]   = useState<TestPhase>('idle')
  const [words,          setWords]   = useState<string[]>(buildInitialWordList)
  const [currentInput,   setInput]   = useState('')
  const [wordResults,    setResults] = useState<WordResult[]>([])
  const [currentWordIdx, setWIdx]    = useState(0)
  const [timeLeft,       setTL]      = useState(30)
  const [elapsed,        setElapsed] = useState(0)
  const [finalResults,   setFinal]   = useState<FinalResults | null>(null)

  // Mutable refs for stable closure access inside timer / keydown
  const refs = useRef({
    mode, timeSetting, wordSetting,
    codeLanguage,
    phase, words, currentInput,
    wordResults, currentWordIdx,
    elapsed, timeLeft,
  })
  // Always keep refs up-to-date
  refs.current = {
    mode, timeSetting, wordSetting,
    codeLanguage,
    phase, words, currentInput,
    wordResults, currentWordIdx,
    elapsed, timeLeft,
  }

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const finishTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const finishWorkerRef = useRef<Worker | null>(null)
  const didFinishRef = useRef(false)
  const startedAtRef = useRef<number | null>(null)
  const deadlineRef = useRef<number | null>(null)

  const clearTimers = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (finishTimeoutRef.current) {
      clearTimeout(finishTimeoutRef.current)
      finishTimeoutRef.current = null
    }
    if (finishWorkerRef.current) {
      const worker = finishWorkerRef.current
      finishWorkerRef.current = null
      worker.terminate()
    }
  }, [])

  // ── Reset ──────────────────────────────────────────────────────────────────

  const resetTest = useCallback(() => {
    clearTimers()
    didFinishRef.current = false
    startedAtRef.current = null
    deadlineRef.current = null
    const { mode: m, timeSetting: ts, wordSetting: ws, codeLanguage: cl } = refs.current
    setWords(buildWordList(m, ts, ws, cl))
    setInput('')
    setResults([])
    setWIdx(0)
    setPhase('idle')
    setFinal(null)
    setElapsed(0)
    setTL(ts)
  }, [clearTimers])

  // Reset when config changes
  useEffect(() => { resetTest() }, [mode, timeSetting, wordSetting, codeLanguage]) // eslint-disable-line

  // ── Finish ─────────────────────────────────────────────────────────────────

  const finishTest = useCallback((results: WordResult[], seconds: number) => {
    if (didFinishRef.current) return
    didFinishRef.current = true

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
    setInput('')
    if (refs.current.mode === 'time') setTL(0)
    setPhase('finished')
    clearTimers()
    startedAtRef.current = null
    deadlineRef.current = null
  }, [clearTimers])

  const finishCurrentTest = useCallback(() => {
    const {
      wordResults: res,
      words: ws,
      currentWordIdx: wi,
      currentInput: ci,
      elapsed: el,
      timeSetting: ts,
      mode: m,
    } = refs.current

    const results = collectResultsForFinish(res, ws, wi, ci)
    finishTest(results, Math.max(m === 'time' ? ts : el, 1))
  }, [finishTest])

  const commitWord = useCallback((typed: string) => {
    const { phase: ph, words: ws, currentWordIdx: wi, mode: m, wordSetting: wset,
            wordResults: res, elapsed: el } = refs.current

    if (ph === 'finished' || typed === '') return

    const word = ws[wi]
    if (!word) return

    const newRes   = [...res, { word, typed }]
    const nextWIdx = wi + 1

    setResults(newRes)
    setWIdx(nextWIdx)
    setInput('')

    if (ph === 'idle') setPhase('active')

    if (m === 'time' && nextWIdx >= ws.length - 20) {
      setWords(prev => extendWords(prev, 100))
    }

    const isDone =
      (m === 'words' && nextWIdx >= wset) ||
      ((m === 'quote' || m === 'code') && nextWIdx >= ws.length)

    if (isDone) setTimeout(() => finishTest(newRes, el + 1), 50)
  }, [finishTest])

  const handleTextInput = useCallback((value: string) => {
    const { phase: ph, words: ws, currentWordIdx: wi } = refs.current

    if (ph === 'finished') return

    const normalized = value.replace(/\r?\n/g, ' ')
    const hasCommitChar = /\s/.test(normalized)

    if (hasCommitChar) {
      const typed = normalized.trim().split(/\s+/)[0] ?? ''
      commitWord(typed)
      return
    }

    const currentWord = ws[wi] ?? ''
    const nextValue = clampInput(normalized, currentWord)
    setInput(nextValue)
    if (ph === 'idle' && nextValue !== '') setPhase('active')
  }, [commitWord])

  // ── Timer (only active while phase === 'active') ───────────────────────────

  useEffect(() => {
    if (phase !== 'active') return

    const modeSnap = refs.current.mode
    const now = Date.now()

    if (startedAtRef.current === null) {
      startedAtRef.current = now
    }

    if (modeSnap === 'time' && deadlineRef.current === null) {
      deadlineRef.current = now + refs.current.timeLeft * 1000
    }

    const startedAt = startedAtRef.current
    const deadline = deadlineRef.current ?? now

    if (modeSnap === 'time') {
      const fallbackDelay = Math.max(deadline - now, 0) + 1500

      finishTimeoutRef.current = setTimeout(() => {
        finishCurrentTest()
      }, fallbackDelay)

      if (typeof Worker !== 'undefined') {
        const workerUrl = URL.createObjectURL(new Blob([
          'let timeoutId; onmessage = (event) => { clearTimeout(timeoutId); timeoutId = setTimeout(() => postMessage("finish"), event.data); };',
        ], { type: 'text/javascript' }))

        const worker = new Worker(workerUrl)
        URL.revokeObjectURL(workerUrl)
        worker.onmessage = () => finishCurrentTest()
        worker.postMessage(fallbackDelay)
        finishWorkerRef.current = worker
      }
    }

    timerRef.current = setInterval(() => {
      const secondsElapsed = Math.max(1, Math.floor((Date.now() - startedAt) / 1000))
      setElapsed(secondsElapsed)

      if (modeSnap === 'time') {
        const next = Math.max(Math.ceil((deadline - Date.now()) / 1000), 0)
        setTL(next)
        if (next <= 0) finishCurrentTest()
      }
    }, 250)

    return clearTimers
  }, [phase, finishCurrentTest])

  useEffect(() => {
    if (phase !== 'active' || mode !== 'time' || timeLeft > 0) return

    finishCurrentTest()
  }, [phase, mode, timeLeft, finishCurrentTest])

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
      commitWord(ci)
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
      setInput(prev => clampInput(prev + key, cw))
    }
  }, [commitWord])

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

  const setMode         = useCallback((m: TestMode) => setModeState(m), [])
  const setCodeLanguage = useCallback((l: CodeLanguage) => setCodeLanguageState(l), [])
  const setTimeSetting  = useCallback((t: number)   => setTimeState(t), [])
  const setWordSetting  = useCallback((w: number)   => setWordState(w), [])

  return {
    mode, codeLanguage, timeSetting, wordSetting,
    phase, words, currentInput, wordResults, currentWordIdx,
    timeLeft, elapsed,
    liveWPM, liveAccuracy,
    finalResults,
    setMode, setCodeLanguage, setTimeSetting, setWordSetting,
    resetTest, finishCurrentTest, handleKeyDown, handleTextInput,
  }
}
