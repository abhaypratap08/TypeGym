'use client'

import { motion } from 'framer-motion'
import { PLAYER_COLORS } from './MultiplayerLobby'
import type { RoomPlayer } from '@/hooks/useRoom'

interface WinnerScreenProps {
  players:     RoomPlayer[]
  winnerId:    string
  selfId:      string
  onPlayAgain: () => void
}

function FlexArm({ color }: { color: string }) {
  return (
    <motion.svg
      width="120" height="120" viewBox="0 0 120 120" fill="none"
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 14 }}
    >
      <motion.rect
        x="40" y="60" width="40" height="20" rx="10" fill={color}
        animate={{ rotate: [0, -30, 0, -30, 0] }}
        transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 0.8 }}
        style={{ transformOrigin: '60px 70px' }}
      />
      <motion.rect
        x="55" y="30" width="20" height="36" rx="10" fill={color}
        animate={{ rotate: [0, 20, 0, 20, 0] }}
        transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 0.8, delay: 0.1 }}
        style={{ transformOrigin: '65px 66px' }}
      />
      <motion.ellipse
        cx="60" cy="58" rx="16" ry="10" fill={color}
        animate={{ ry: [10, 14, 10, 14, 10] }}
        transition={{ duration: 1.2, repeat: Infinity, repeatDelay: 0.8 }}
      />
      <ellipse cx="54" cy="54" rx="5" ry="3" fill="rgba(255,255,255,0.3)" />
    </motion.svg>
  )
}

export default function WinnerScreen({ players, winnerId, selfId, onPlayAgain }: WinnerScreenProps) {
  const winner = players.find(p => p.id === winnerId)
  const sorted = [...players].sort((a, b) => b.wpm - a.wpm)
  const winnerColor = PLAYER_COLORS.find(c => c.id === winner?.color)?.hex ?? '#58a6ff'
  const isSelfWinner = winnerId === selfId

  return (
    <motion.div
      className="result-card"
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35, ease: 'easeOut' }}
      style={{
        maxWidth: 520,
        textAlign: 'center',
        borderColor: `${winnerColor}55`,
        boxShadow: `0 28px 78px rgba(0, 0, 0, 0.38), 0 0 60px ${winnerColor}18`,
      }}
    >
      <FlexArm color={winnerColor} />

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <div className="result-stat-label" style={{ marginBottom: 6 }}>
          winner
        </div>
        <div
          className="result-title mp-break-text"
          style={{ fontSize: 36, color: winnerColor, marginBottom: 4 }}
        >
          {winner?.name ?? '—'}
        </div>
        <div
          style={{
            fontSize: 18,
            color: 'var(--text-secondary)',
            fontFamily: 'var(--font-jetbrains-mono), monospace',
            marginBottom: 28,
          }}
        >
          {winner?.wpm} wpm
        </div>

        {isSelfWinner && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mp-tap-hint"
            style={{ color: winnerColor, marginBottom: 20 }}
          >
            That&apos;s you — nice run.
          </motion.p>
        )}

        <div style={{ marginBottom: 28, textAlign: 'left' }}>
          {sorted.map((p, i) => {
            const c = PLAYER_COLORS.find(x => x.id === p.color)?.hex ?? '#58a6ff'
            return (
              <div
                key={p.id}
                className="result-stat"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '12px 14px',
                  marginBottom: 8,
                }}
              >
                <span
                  style={{
                    width: 22,
                    color: 'var(--text-muted)',
                    fontFamily: 'var(--font-jetbrains-mono), monospace',
                    fontSize: 13,
                  }}
                >
                  #{i + 1}
                </span>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: c,
                    flexShrink: 0,
                    display: 'inline-block',
                  }}
                />
                <span
                  className="mp-break-text"
                  style={{
                    flex: 1,
                    minWidth: 0,
                    fontFamily: 'var(--font-outfit), sans-serif',
                    fontSize: 15,
                    color: p.id === selfId ? c : 'var(--text-primary)',
                  }}
                >
                  {p.name}{p.id === selfId ? ' (you)' : ''}
                </span>
                <span
                  style={{
                    fontFamily: 'var(--font-jetbrains-mono), monospace',
                    fontSize: 14,
                    color: 'var(--text-secondary)',
                    flexShrink: 0,
                  }}
                >
                  {p.wpm} wpm
                </span>
              </div>
            )
          })}
        </div>

        <button
          type="button"
          className="restart-btn"
          onClick={onPlayAgain}
          style={{ width: '100%', justifyContent: 'center', padding: '13px 20px' }}
        >
          Play Again
        </button>
      </motion.div>
    </motion.div>
  )
}
