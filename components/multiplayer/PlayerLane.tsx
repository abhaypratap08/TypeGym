'use client'

import { memo, type CSSProperties } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { PLAYER_COLORS } from './MultiplayerLobby'
import type { RoomPlayer } from '@/hooks/useRoom'
import { UI_SPRING } from '@/lib/motion'

interface PlayerLaneProps {
  player:    RoomPlayer
  isSelf:    boolean
  isWinner:  boolean
  compact?:  boolean
  isRacing?: boolean
}

const PlayerLane = memo(function PlayerLane({ player, isSelf, isWinner, compact, isRacing }: PlayerLaneProps) {
  const reducedMotion = useReducedMotion()
  const colorHex = PLAYER_COLORS.find(c => c.id === player.color)?.hex
    ?? (isSelf ? 'var(--teal)' : '#8b7cb8')

  const progress = Number.isFinite(player.progress) ? Math.max(0, Math.min(player.progress, 1)) : 0
  const pct = Math.round(progress * 100)
  const isStale = isRacing && !isSelf && !player.finished
    && (player as RoomPlayer & { _stale?: boolean })._stale === true

  return (
    <div
      className={`mp-lane${compact ? ' is-compact' : ''}${isSelf ? ' is-self' : ''}${isStale ? ' is-stale' : ''}${isWinner ? ' is-winner' : ''}${player.finished ? ' is-finished' : ''}`}
      style={{ '--player-color': colorHex } as CSSProperties}
    >
      <div className="mp-lane-identity">
        <span className="mp-lane-avatar" aria-hidden="true">
          <span className="mp-lane-status" />
        </span>
        <div className="mp-lane-name-block">
          <div className="mp-lane-player-name">
            {player.name}{isSelf ? ' (you)' : ''}
          </div>
          <div className="mp-lane-speed">
            {isStale ? 'Reconnecting' : `${player.wpm} WPM`}
            {isWinner ? ' · Winner' : player.finished ? ' · Finished' : ''}
          </div>
        </div>
      </div>

      <div
        className="mp-lane-track"
        role="progressbar"
        aria-label={`${player.name}${isSelf ? ' (you)' : ''} progress`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-valuetext={`${pct}% complete${player.finished ? ', finished' : ''}`}
      >
        <motion.div
          className={`mp-lane-progress${isSelf ? ' mp-progress-self' : ''}`}
          initial={false}
          animate={{ scaleX: progress }}
          transition={reducedMotion ? { duration: 0 } : UI_SPRING}
        />
      </div>

      <div className="mp-lane-pct" aria-hidden="true">{pct}%</div>
    </div>
  )
})

export default PlayerLane
