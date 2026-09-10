'use client'

import { memo, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { WordResult } from '@/hooks/useTypingEngine'

// ─── Cursor ───────────────────────────────────────────────────────────────────

type CursorPlacement = 'before' | 'after'

/**
 * Pure-CSS blinking caret. No Framer Motion layoutId — avoids layout
 * measurement (reflow) on every keystroke. The cursor position is driven
 * entirely by which <span> it lives inside; CSS handles the blink animation.
 */
const Cursor = memo(function Cursor({ placement = 'before' }: { placement?: CursorPlacement }) {
  return (
    <span
      className={`typing-cursor cursor-${placement}`}
      aria-hidden="true"
    />
  )
})

// ─── Single character ─────────────────────────────────────────────────────────

interface CharProps {
  ch:      string
  state:   'correct' | 'incorrect' | 'pending'
  cursor?: CursorPlacement
}

const Char = memo(function Char({ ch, state, cursor }: CharProps) {
  return (
    <span className={`typing-char char-${state}`}>
      {cursor && <Cursor placement={cursor} />}
      {ch}
    </span>
  )
})

// ─── Current word (receives live input) ───────────────────────────────────────

interface CurrentWordProps {
  word:    string
  wordIdx: number
  input:   string
}

/**
 * Renders the word the user is currently typing. Re-renders on every keystroke
 * but only this single word does so, not the whole list.
 */
const CurrentWord = memo(function CurrentWord({ word, wordIdx, input }: CurrentWordProps) {
  return (
    <span
      data-word-idx={wordIdx}
      className="typing-word word-current"
    >
      {word.split('').map((ch, ci) => {
        let state: 'correct' | 'incorrect' | 'pending' = 'pending'
        let cursor: CursorPlacement | undefined

        if (ci === input.length) {
          cursor = 'before'
        } else if (ci < input.length) {
          state = input[ci] === ch ? 'correct' : 'incorrect'
        }

        if (ci === word.length - 1 && input.length === word.length) {
          cursor = 'after'
        }

        return <Char key={ci} ch={ch} state={state} cursor={cursor} />
      })}

      {/* Extra chars typed beyond word length */}
      {input.length > word.length &&
        input.slice(word.length).split('').map((ch, i, extraChars) => {
          const isLast = i === extraChars.length - 1
          return (
            <span key={`extra-${i}`} className="typing-char char-extra">
              {isLast && <Cursor placement="after" />}
              {ch}
            </span>
          )
        })}
    </span>
  )
})

// ─── Completed word (only re-renders when its result changes) ─────────────────

interface CompletedWordProps {
  word:    string
  wordIdx: number
  result:  WordResult | undefined
}

/**
 * Renders a word that has already been committed. Receives only its own
 * stable `result` — never `input` — so it never re-renders on keystrokes.
 */
const CompletedWord = memo(function CompletedWord({ word, wordIdx, result }: CompletedWordProps) {
  const isWrong = result && result.typed !== result.word
  return (
    <span
      data-word-idx={wordIdx}
      className={[
        'typing-word word-completed',
        isWrong ? 'word-wrong' : '',
      ].join(' ')}
    >
      {word.split('').map((ch, ci) => {
        let state: 'correct' | 'incorrect' | 'pending' = 'pending'
        if (result) {
          const tc = result.typed[ci]
          if (tc !== undefined) state = tc === ch ? 'correct' : 'incorrect'
        }
        return <Char key={ci} ch={ch} state={state} />
      })}
    </span>
  )
})

// ─── Pending word (never re-renders unless word text changes) ─────────────────

interface PendingWordProps {
  word:    string
  wordIdx: number
}

const PendingWord = memo(function PendingWord({ word, wordIdx }: PendingWordProps) {
  return (
    <span data-word-idx={wordIdx} className="typing-word">
      {word.split('').map((ch, ci) => (
        <Char key={ci} ch={ch} state="pending" />
      ))}
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
 * The window advances once the active word moves to a new visual line.
 * Each word type is rendered by a dedicated memoized component so re-renders
 * are isolated:
 *   - CurrentWord   → re-renders per keystroke (one word only)
 *   - CompletedWord → re-renders only when its WordResult changes (on commit)
 *   - PendingWord   → never re-renders unless the word list itself changes
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

  // Only recompute the window slice when the word list or indices change —
  // NOT when `input` changes. This keeps PendingWord and CompletedWord
  // stable across keystrokes.
  const wordWindow = useMemo(() => {
    const start = visibleStartIdx
    const end   = Math.min(words.length, curIdx + 60)
    return words.slice(start, end).map((w, i) => ({ w, idx: start + i }))
  }, [words, curIdx, visibleStartIdx])

  return (
    <div className="word-display">
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
        {wordWindow.map(({ w, idx }) => {
          if (idx === curIdx) {
            return (
              <CurrentWord
                key={`cur-${idx}`}
                word={w}
                wordIdx={idx}
                input={input}
              />
            )
          }
          if (idx < curIdx) {
            return (
              <CompletedWord
                key={`done-${idx}`}
                word={w}
                wordIdx={idx}
                result={results[idx]}
              />
            )
          }
          return (
            <PendingWord
              key={`pending-${idx}`}
              word={w}
              wordIdx={idx}
            />
          )
        })}
      </div>
    </div>
  )
}
