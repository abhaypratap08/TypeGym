'use client'

import { memo } from 'react'
import { motion } from 'framer-motion'
import { PLAYER_COLORS } from './MultiplayerLobby'
import type { RoomPlayer } from '@/hooks/useRoom'

function PacMan({ color, eating }: { color: string; eating: boolean }) {
  const mouth = eating ? 20 : 5
  const start = mouth / 2
  const end = 360 - mouth / 2
  const toRad = (d: number) => (d * Math.PI) / 180
  const r = 14, cx = 16, cy = 16
  const x1 = cx + r * Math.cos(toRad(start)), y1 = cy + r * Math.sin(toRad(start))
  const x2 = cx + r * Math.cos(toRad(end)),   y2 = cy + r * Math.sin(toRad(end))
  return (
    <motion.svg width="32" height="32" viewBox="0 0 32 32"
      animate={eating ? { scaleX: [1, 0.92, 1] } : {}}
      transition={eating ? { duration: 0.3, repeat: Infinity } : {}}
      style={{ flexShrink: 0 }}
    >
      <path d={`M${cx},${cy} L${x1},${y1} A${r},${r} 0 1,1 ${x2},${y2} Z`} fill={color} />
      <circle cx={cx + 4} cy={cy - 6} r={2} fill="rgba(0,0,0,0.5)" />
    </motion.svg>
  )
}

interface PlayerLaneProps {
  player:   RoomPlayer
  isSelf:   boolean
  isWinner: boolean
  compact?: boolean   // mobile compact mode
}

const PlayerLane = memo(function PlayerLane({ player, isSelf, isWinner, compact }: PlayerLaneProps) {
  const colorHex = PLAYER_COLORS.find(c => c.id === player.color)?.hex ?? '#58a6ff'
  const pct = Math.min(player.progress * 100, 100)
  const eating = player.progress > 0 && player.progress < 1

  if (compact) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '3px 0',
        borderBottom: '1px solid rgba(48,54,61,0.2)',
      }}>
        {/* Color dot */}
        <div style={{
          width: 8, height: 8, borderRadius: '50%',
          background: colorHex, flexShrink: 0,
          boxShadow: isSelf ? `0 0 5px ${colorHex}` : 'none',
        }} />

        {/* Name */}
        <div style={{
          width: 72, flexShrink: 0,
          fontFamily: 'var(--font-jetbrains-mono)', fontSize: 10,
          color: isSelf ? colorHex : 'var(--text-secondary)',
          fontWeight: isSelf ? 700 : 400,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {player.name}
        </div>

        {/* Track */}
        <div style={{ flex: 1, position: 'relative', height: 4 }}>
          <div style={{
            position: 'absolute', inset: 0,
            background: 'rgba(48,54,61,0.5)', borderRadius: 2,
          }} />
          <motion.div style={{
            position: 'absolute', left: 0, top: 0, bottom: 0,
            background: colorHex, borderRadius: 2,
            width: `${pct}%`,
            boxShadow: `0 0 4px ${colorHex}55`,
          }} transition={{ duration: 0.3 }} />
        </div>

        {/* WPM */}
        <div style={{
          width: 30, textAlign: 'right', flexShrink: 0,
          fontSize: 10, color: 'var(--text-muted)',
          fontFamily: 'var(--font-jetbrains-mono)',
        }}>
          {player.wpm}w
        </div>
      </div>
    )
  }

  // Desktop — Pac-Man version
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '10px 0',
      borderBottom: '1px solid rgba(48,54,61,0.3)',
    }}>
      <div style={{ width: 110, flexShrink: 0 }}>
        <div style={{
          fontFamily: 'var(--font-jetbrains-mono)', fontSize: 14,
          color: isSelf ? colorHex : 'var(--text-primary)',
          fontWeight: isSelf ? 700 : 400,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {player.name}{isSelf ? ' (you)' : ''}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-outfit)' }}>
          {player.wpm} wpm
        </div>
      </div>

      <div style={{ flex: 1, position: 'relative', height: 40, display: 'flex', alignItems: 'center' }}>
        <div style={{
          position: 'absolute', left: 0, right: 0, height: 4,
          background: `repeating-linear-gradient(90deg, rgba(48,54,61,0.6) 0px, rgba(48,54,61,0.6) 6px, transparent 6px, transparent 14px)`,
          borderRadius: 4,
        }} />
        <motion.div style={{
          position: 'absolute', left: 0, height: 4,
          background: colorHex, borderRadius: 4,
          width: `${pct}%`, opacity: 0.35,
        }} transition={{ duration: 0.3 }} />
        <motion.div style={{
          position: 'absolute',
          left: `calc(${pct}% - 16px)`,
          top: '50%', transform: 'translateY(-50%)',
        }} transition={{ duration: 0.3 }}>
          <PacMan color={colorHex} eating={eating} />
        </motion.div>
      </div>

      <div style={{ width: 40, textAlign: 'right', fontSize: 13, color: 'var(--text-muted)', fontFamily: 'var(--font-jetbrains-mono)', flexShrink: 0 }}>
        {Math.round(pct)}%
      </div>
    </div>
  )
})

export default PlayerLane
