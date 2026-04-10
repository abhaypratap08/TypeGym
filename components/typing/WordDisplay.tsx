'use client'

import { memo, useMemo } from 'react'
import type { WordResult } from '@/hooks/useTypingEngine'

// ─── Cursor ───────────────────────────────────────────────────────────────────

/** Blinking caret — positioned inline so it flows naturally with text */
const Cursor = memo(function Cursor() {
  return <span className="typing-cursor" aria-hidden="true" />
})

// ─── Single character ─────────────────────────────────────────────────────────

interface CharProps {
  ch:         string
  state:      'correct' | 'incorrect' | 'pending'
  showCursor: boolean
}

const Char = memo(function Char({ ch, state, showCursor }: CharProps) {
  return (
    <span style={{ position: 'relative' }}>
      {showCursor && <Cursor />}
      <span className={`char-${state}`}>{ch}</span>
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
        isCurrent ? 'word-current' : '',
        isWrong   ? 'word-wrong'   : '',
      ].join(' ')}
      style={{
        marginRight:   '0.45em',
        display:       'inline-block',
      }}
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
          <span key={`extra-${i}`} className="char-extra">{ch}</span>
        ))
      }

      {/* Cursor at end when input length ≥ word length */}
      {isCurrent && input.length >= word.length && <Cursor />}
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
    <div style={{ position: 'relative' }}>
      {/* "Click to start" overlay shown while idle */}
      {isIdle && (
        <div style={{
          position:       'absolute',
          inset:          0,
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'center',
          zIndex:         2,
          pointerEvents:  'none',
        }}>
          <span style={{
            fontFamily:    'Outfit, sans-serif',
            fontSize:      14,
            color:         'var(--text-muted)',
            letterSpacing: '0.05em',
          }}>
            Start typing to begin...
          </span>
        </div>
      )}

      {/* Words */}
      <div
        style={{
          fontSize:   22,
          lineHeight: 2.1,
          userSelect: 'none',
          cursor:     'text',
          minHeight:  150,
          filter:     isIdle ? 'blur(2.5px)' : 'none',
          transition: 'filter 0.3s ease',
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
