'use client'

import { memo } from 'react'
import { motion } from 'framer-motion'
import { PLAYER_COLORS } from './MultiplayerLobby'
import type { RoomPlayer } from '@/hooks/useRoom'

interface PlayerLaneProps {
  player:    RoomPlayer
  isSelf:    boolean
  isWinner:  boolean
  compact?:  boolean
  isRacing?: boolean
}

const PlayerLane = memo(function PlayerLane({ player, isSelf, isWinner, compact, isRacing }: PlayerLaneProps) {
  const colorHex = PLAYER_COLORS.find(c => c.id === player.color)?.hex
    ?? (isSelf ? 'var(--teal)' : '#8b7cb8')

  const pct    = Math.min(player.progress * 100, 100)
  const isStale = isRacing && !isSelf && !player.finished && (player as any)._stale === true

  // Self uses teal, others use desaturated gray-purple
  const trackColor   = isSelf ? 'var(--teal)' : '#8b7cb8'
  const trackOpacity = isSelf ? 0.9 : 0.55

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: compact ? 8 : 12,
      padding: compact ? '6px 0' : '10px 0',
      borderBottom: '1px solid rgba(180,168,148,0.14)',
      opacity: isStale ? 0.4 : 1,
      transition: 'opacity 0.3s ease',
    }}>

      {/* Avatar circle */}
      <div style={{
        width: compact ? 24 : 30,
        height: compact ? 24 : 30,
        borderRadius: '50%',
        background: `${colorHex}22`,
        border: `1.5px solid ${colorHex}55`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        position: 'relative',
      }}>
        {/* Status dot */}
        <div style={{
          width: compact ? 5 : 6,
          height: compact ? 5 : 6,
          borderRadius: '50%',
          background: player.finished
            ? 'var(--teal)'
            : isStale
            ? 'var(--accent-orange)'
            : colorHex,
          boxShadow: player.finished
            ? '0 0 5px var(--teal-glow)'
            : undefined,
        }} />
      </div>

      {/* Name + WPM */}
      <div style={{
        width: compact ? 72 : 110,
        flexShrink: 0,
        minWidth: 0,
      }}>
        <div style={{
          fontFamily: 'var(--font-geist), system-ui, sans-serif',
          fontSize: compact ? 11 : 13,
          fontWeight: isSelf ? 600 : 400,
          color: isSelf ? 'var(--teal)' : 'var(--ink)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {player.name}{isSelf && !compact ? ' (you)' : ''}
        </div>
        <div style={{
          fontFamily: 'var(--font-geist-mono), monospace',
          fontSize: compact ? 10 : 11.5,
          color: isStale ? 'var(--accent-orange)' : 'var(--ink-tertiary)',
          marginTop: 1,
        }}>
          {isStale ? 'offline' : `${player.wpm} wpm`}
        </div>
      </div>

      {/* Progress track */}
      <div style={{ flex: 1, position: 'relative', height: compact ? 3 : 4, minWidth: 0 }}>
        {/* Track background */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'rgba(180,168,148,0.18)',
          borderRadius: 4,
        }} />
        {/* Fill — teal-to-coral gradient for self, flat for others */}
        <motion.div
          style={{
            position: 'absolute',
            left: 0, top: 0, bottom: 0,
            width: `${pct}%`,
            borderRadius: 4,
            background: isSelf
              ? `linear-gradient(90deg, var(--teal) 0%, var(--coral) 100%)`
              : trackColor,
            opacity: trackOpacity,
            boxShadow: isSelf && pct > 5 ? '0 0 6px var(--teal-glow)' : 'none',
          }}
          transition={{ duration: 0.4, ease: 'easeOut' }}
        />
      </div>

      {/* Percentage */}
      <div style={{
        width: compact ? 28 : 36,
        textAlign: 'right',
        flexShrink: 0,
        fontFamily: 'var(--font-geist-mono), monospace',
        fontSize: compact ? 10 : 11.5,
        color: 'var(--ink-tertiary)',
      }}>
        {Math.round(pct)}%
      </div>
    </div>
  )
})

export default PlayerLane
