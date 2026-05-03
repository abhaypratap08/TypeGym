'use client'

import { memo, useMemo } from 'react'
import { motion } from 'framer-motion'
import type { WordResult } from '@/hooks/useTypingEngine'

// ─── Cursor ───────────────────────────────────────────────────────────────────

/** Smooth caret that follows the active character using shared layout animation. */
const Cursor = memo(function Cursor() {
  return (
    <motion.span
      layoutId="typing-caret"
      className="typing-cursor"
      transition={{ type: 'spring', stiffness: 760, damping: 44, mass: 0.28 }}
      aria-hidden="true"
    />
  )
})

// ─── Single character ─────────────────────────────────────────────────────────

interface CharProps {
  ch:         string
  state:      'correct' | 'incorrect' | 'pending'
  showCursor: boolean
}

const Char = memo(function Char({ ch, state, showCursor }: CharProps) {
  return (
    <span className={`typing-char char-${state}`}>
      {showCursor && <Cursor />}
      {ch}
    </span>
  )
})

// ─── Single word ──────────────────────────────────────────────────────────────

interface WordProps {
  word:    string
  wordIdx: number
  curIdx:  number
  input:   string
  results: WordResult[]
}

/**
 * Word — renders one word with per-character state coloring.
 *
 * Three visual states per character:
 *   correct   — typed char matches expected  → accent blue
 *   incorrect — typed char doesn't match     → accent red + dim bg
 *   pending   — not yet typed                → dim gray
 *
 * Extra characters (typed beyond word length) shown with red underline.
 * Cursor (blinking bar) is rendered before the next untyped character.
 */
const Word = memo(function Word({ word, wordIdx, curIdx, input, results }: WordProps) {
  const isCompleted = wordIdx < curIdx
  const isCurrent   = wordIdx === curIdx
  const result      = results[wordIdx]

  // Wavy underline if the whole word was typed wrong
  const isWrong = isCompleted && result && result.typed !== result.word

  return (
    <span
      className={[
        'typing-word',
        isCompleted ? 'word-completed' : '',
        isCurrent ? 'word-current' : '',
        isWrong   ? 'word-wrong'   : '',
      ].join(' ')}
    >
      {word.split('').map((ch, ci) => {
        let state: 'correct' | 'incorrect' | 'pending' = 'pending'
        let showCursor = false

        if (isCurrent) {
          if (ci === input.length) {
            showCursor = true
          } else if (ci < input.length) {
            state = input[ci] === ch ? 'correct' : 'incorrect'
          }
          // ci > input.length → stays 'pending'
        } else if (isCompleted && result) {
          const tc = result.typed[ci]
          if (tc !== undefined) state = tc === ch ? 'correct' : 'incorrect'
        }

        return <Char key={ci} ch={ch} state={state} showCursor={showCursor} />
      })}

      {/* Extra chars typed beyond word length */}
      {isCurrent && input.length > word.length &&
        input.slice(word.length).split('').map((ch, i) => (
          <span key={`extra-${i}`} className="typing-char char-extra">{ch}</span>
        ))
      }

      {/* Cursor at end when input length ≥ word length */}
      {isCurrent && input.length >= word.length && (
        <span className="typing-char cursor-anchor">
          <Cursor />
        </span>
      )}
    </span>
  )
})

// ─── Word display container ───────────────────────────────────────────────────

interface WordDisplayProps {
  words:    string[]
  curIdx:   number
  input:    string
  results:  WordResult[]
  isIdle:   boolean
}

/**
 * WordDisplay — renders a windowed slice of words.
 *
 * Only renders words near the current cursor position (curIdx-10 to curIdx+60)
 * to keep the DOM small regardless of how many total words are in the test.
 */
export default function WordDisplay({
  words, curIdx, input, results, isIdle,
}: WordDisplayProps) {
  // Word window: render only what's near the cursor
  const wordWindow = useMemo(() => {
    const start = Math.max(0, curIdx - 10)
    const end   = Math.min(words.length, curIdx + 60)
    return words.slice(start, end).map((w, i) => ({ w, idx: start + i }))
  }, [words, curIdx])

  return (
    <div className="word-display">
      {/* Words */}
      <div
        className="word-display-text"
        style={{
          opacity: isIdle ? 0.92 : 1,
          transition: 'opacity 0.2s ease',
        }}
        aria-label="Typing test text"
        role="textbox"
        aria-readonly="true"
      >
        {wordWindow.map(({ w, idx }) => (
          <Word
            key={`${idx}-${w}`}
            word={w}
            wordIdx={idx}
            curIdx={curIdx}
            input={input}
            results={results}
          />
        ))}
      </div>
    </div>
  )
}
