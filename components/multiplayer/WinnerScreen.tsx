'use client'

import { useState, type CSSProperties } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { PLAYER_COLORS } from './MultiplayerLobby'
import type { RoomPlayer } from '@/hooks/useRoom'
import { UI_SPRING, FADE_TRANSITION } from '@/lib/motion'

interface WinnerScreenProps {
  players:     RoomPlayer[]
  winnerId:    string
  selfId:      string
  onLeave:     () => void
  leaving?:   boolean
}

export default function WinnerScreen({ players, winnerId, selfId, onLeave, leaving }: WinnerScreenProps) {
  const [celebrating, setCelebrating] = useState(false)
  const reducedMotion = useReducedMotion()

  const winner        = players.find(p => p.id === winnerId)
  const sorted        = [...players].sort((a, b) => b.wpm - a.wpm)
  const winnerColor   = PLAYER_COLORS.find(c => c.id === winner?.color)?.hex ?? 'var(--teal)'
  const isSelfWinner  = winnerId === selfId

  return (
    <motion.section
      className="result-card mp-results"
      aria-labelledby="mp-results-title"
      initial={{ opacity: 0, y: reducedMotion ? 0 : 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: reducedMotion ? 0 : 8 }}
      transition={{ ...UI_SPRING, opacity: FADE_TRANSITION }}
      style={{ '--winner-color': winnerColor } as CSSProperties}
    >
      <Image className="mp-result-trophy" src="/trophy.svg" alt="" width={64} height={64} priority />
      <p className="result-stat-label">Race winner</p>
      <h2 id="mp-results-title" className="result-title mp-break-text mp-winner-name">
        {winner?.name ?? '—'}
      </h2>
      <p className="mp-winner-speed">{winner?.wpm ?? 0} WPM</p>
      <p className="mp-result-message">
        {isSelfWinner ? 'That’s you — nice run.' : 'Good race. Ready for another?'}
      </p>

      <ol className="mp-leaderboard" aria-label="Final standings">
        {sorted.map((p, i) => {
          const color = PLAYER_COLORS.find(x => x.id === p.color)?.hex ?? 'var(--teal)'
          return (
            <li
              key={p.id}
              className={`mp-leaderboard-row${p.id === selfId ? ' is-self' : ''}`}
              style={{ '--player-color': color } as CSSProperties}
            >
              <span className="mp-placement" aria-hidden="true">#{i + 1}</span>
              <span className="mp-player-dot" aria-hidden="true" />
              <span className="mp-break-text mp-leaderboard-name">
                {p.name}{p.id === selfId ? ' (you)' : ''}
              </span>
              <span className="mp-leaderboard-wpm">{p.wpm} WPM</span>
            </li>
          )
        })}
      </ol>

      <div className="mp-result-actions">
        <button type="button" className="restart-btn" onClick={onLeave} disabled={leaving}>
          {leaving ? 'Leaving…' : 'Leave room'}
        </button>
        <Link href="/" className="mp-secondary-btn">Practice Solo</Link>
        {isSelfWinner && (
          <button
            type="button"
            className="mp-secondary-btn"
            onClick={() => setCelebrating(value => !value)}
            aria-pressed={celebrating}
          >
            Celebrate <span aria-hidden="true">🎉</span>
          </button>
        )}
      </div>

      <AnimatePresence initial={false}>
        {celebrating && (
          <motion.p
            className="mp-celebration"
            role="status"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={FADE_TRANSITION}
          >
            A well-earned win. Nice work!
          </motion.p>
        )}
      </AnimatePresence>
    </motion.section>
  )
}
