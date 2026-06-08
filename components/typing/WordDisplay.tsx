'use client'

import { memo, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import type { WordResult } from '@/hooks/useTypingEngine'

// ─── Cursor ───────────────────────────────────────────────────────────────────

type CursorPlacement = 'before' | 'after'

/** Smooth caret that follows the active character using shared layout animation. */
const Cursor = memo(function Cursor({ placement = 'before' }: { placement?: CursorPlacement }) {
  return (
    <motion.span
      layoutId="typing-caret"
      className={`typing-cursor cursor-${placement}`}
      transition={{ type: 'spring', stiffness: 760, damping: 44, mass: 0.28 }}
      aria-hidden="true"
    />
  )
})

// ─── Single character ─────────────────────────────────────────────────────────

interface CharProps {
  ch:         string
  state:      'correct' | 'incorrect' | 'pending'
  cursor?:    CursorPlacement
}

const Char = memo(function Char({ ch, state, cursor }: CharProps) {
  return (
    <span className={`typing-char char-${state}`}>
      {cursor && <Cursor placement={cursor} />}
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
      data-word-idx={wordIdx}
      className={[
        'typing-word',
        isCompleted ? 'word-completed' : '',
        isCurrent ? 'word-current' : '',
        isWrong   ? 'word-wrong'   : '',
      ].join(' ')}
    >
      {word.split('').map((ch, ci) => {
        let state: 'correct' | 'incorrect' | 'pending' = 'pending'
        let cursor: CursorPlacement | undefined

        if (isCurrent) {
          if (ci === input.length) {
            cursor = 'before'
          } else if (ci < input.length) {
            state = input[ci] === ch ? 'correct' : 'incorrect'
          }

          if (ci === word.length - 1 && input.length === word.length) {
            cursor = 'after'
          }
          // ci > input.length → stays 'pending'
        } else if (isCompleted && result) {
          const tc = result.typed[ci]
          if (tc !== undefined) state = tc === ch ? 'correct' : 'incorrect'
        }

        return <Char key={ci} ch={ch} state={state} cursor={cursor} />
      })}

      {/* Extra chars typed beyond word length */}
      {isCurrent && input.length > word.length &&
        input.slice(word.length).split('').map((ch, i, extraChars) => {
          const isLastExtraChar = i === extraChars.length - 1

          return (
            <span key={`extra-${i}`} className="typing-char char-extra">
              {isLastExtraChar && <Cursor placement="after" />}
              {ch}
            </span>
          )
        })}
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
 * Keeps the current visual line stable. The window advances only after the
 * cursor moves onto the next rendered line.
 */
export default function WordDisplay({
  words, curIdx, input, results, isIdle,
}: WordDisplayProps) {
  const textRef = useRef<HTMLDivElement | null>(null)
  const [lineStartIdx, setLineStartIdx] = useState(0)
  const visibleStartIdx = curIdx < lineStartIdx ? curIdx : lineStartIdx

  useLayoutEffect(() => {
    if (curIdx === 0 || curIdx < lineStartIdx) {
      setLineStartIdx(curIdx)
      return
    }

    const textEl = textRef.current
    const firstWord = textEl?.querySelector<HTMLElement>(`[data-word-idx="${visibleStartIdx}"]`)
    const activeWord = textEl?.querySelector<HTMLElement>(`[data-word-idx="${curIdx}"]`)
    if (!textEl || !firstWord || !activeWord) return

    const lineHeight = parseFloat(window.getComputedStyle(textEl).lineHeight)
    const lineThreshold = Number.isFinite(lineHeight) ? lineHeight * 0.5 : 8

    if (activeWord.offsetTop > firstWord.offsetTop + lineThreshold) {
      setLineStartIdx(curIdx)
    }
  }, [curIdx, lineStartIdx, visibleStartIdx, words])

  useLayoutEffect(() => {
    const onResize = () => setLineStartIdx(curIdx)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [curIdx])

  // Render from the start of the current visual line, not from the current word.
  const wordWindow = useMemo(() => {
    const start = visibleStartIdx
    const end   = Math.min(words.length, curIdx + 60)
    return words.slice(start, end).map((w, i) => ({ w, idx: start + i }))
  }, [words, curIdx, visibleStartIdx])

  return (
    <div className="word-display">
      {/* Words */}
      <div
        ref={textRef}
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
