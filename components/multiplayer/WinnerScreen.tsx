'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { PLAYER_COLORS } from './MultiplayerLobby'
import type { RoomPlayer } from '@/hooks/useRoom'

interface WinnerScreenProps {
  players:     RoomPlayer[]
  winnerId:    string
  selfId:      string
  onPlayAgain: () => void
}

export default function WinnerScreen({ players, winnerId, selfId, onPlayAgain }: WinnerScreenProps) {
  const [celebrating, setCelebrating] = useState(false)

  const winner        = players.find(p => p.id === winnerId)
  const sorted        = [...players].sort((a, b) => b.wpm - a.wpm)
  const winnerColor   = PLAYER_COLORS.find(c => c.id === winner?.color)?.hex ?? 'var(--teal)'
  const isSelfWinner  = winnerId === selfId

  return (
    <>
      {/* Celebration overlay */}
      <AnimatePresence>
        {celebrating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 100,
              background: 'rgba(245,240,232,0.85)',
              backdropFilter: 'blur(12px)',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              pointerEvents: 'none',
            }}
          >
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 180, height: 180 }}>
              {[0, 0.5, 1].map(delay => (
                <motion.div
                  key={delay}
                  style={{
                    position: 'absolute',
                    borderRadius: '50%',
                    border: `1.5px solid ${winnerColor}`,
                    width: 180, height: 180,
                    top: 0, left: 0,
                  }}
                  animate={{ scale: [1, 3.5], opacity: [0.6, 0] }}
                  transition={{ duration: 1.6, delay, ease: 'easeOut', repeat: Infinity, repeatDelay: 0.8 }}
                />
              ))}
              <motion.div
                animate={{ rotate: 360, scale: [0.5, 1.2, 1.05] }}
                transition={{ rotate: { duration: 0.8, ease: 'easeInOut' }, scale: { duration: 0.7, times: [0, 0.6, 1] } }}
                style={{ filter: `drop-shadow(0 0 24px ${winnerColor}88)`, position: 'relative', zIndex: 1 }}
              >
                <Image src="/trophy.svg" alt="trophy" width={160} height={160} priority />
              </motion.div>
            </div>
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: [0, 1, 1, 0], y: 0 }}
              transition={{ duration: 2.6, times: [0, 0.2, 0.8, 1] }}
              style={{
                marginTop: 20, fontSize: 24, fontWeight: 700,
                color: winnerColor,
                fontFamily: 'var(--font-geist), system-ui, sans-serif',
                letterSpacing: '-0.02em',
                position: 'relative', zIndex: 1,
              }}
            >
              {winner?.name} wins!
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        className="result-card"
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.32, ease: 'easeOut' }}
        style={{
          maxWidth: 480, width: '100%', textAlign: 'center',
          borderColor: `${winnerColor}33`,
        }}
      >
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 240, damping: 18 }}
          style={{ marginBottom: 6 }}
        >
          <Image src="/trophy.svg" alt="trophy" width={80} height={80} priority
            style={{ filter: `drop-shadow(0 4px 16px ${winnerColor}44)` }}
          />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28 }}>
          <div className="result-stat-label" style={{ marginBottom: 5 }}>winner</div>
          <div className="result-title mp-break-text" style={{ fontSize: 28, color: winnerColor, marginBottom: 3, textAlign: 'center' }}>
            {winner?.name ?? '—'}
          </div>
          <div style={{
            fontSize: 16, color: 'var(--ink-secondary)',
            fontFamily: 'var(--font-geist-mono), monospace',
            marginBottom: 22, letterSpacing: '-0.02em',
          }}>
            {winner?.wpm} wpm
          </div>

          {isSelfWinner ? (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
              style={{ color: 'var(--teal)', fontSize: 13, marginBottom: 18, fontFamily: 'var(--font-geist), system-ui, sans-serif' }}>
              That&apos;s you — nice run.
            </motion.p>
          ) : (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
              style={{ color: 'var(--ink-tertiary)', fontSize: 13, marginBottom: 18, fontFamily: 'var(--font-geist), system-ui, sans-serif' }}>
              Better luck next time.
            </motion.p>
          )}

          {/* Leaderboard */}
          <div style={{ marginBottom: 22, textAlign: 'left' }}>
            {sorted.map((p, i) => {
              const c = PLAYER_COLORS.find(x => x.id === p.color)?.hex ?? 'var(--teal)'
              return (
                <div key={p.id} style={{
                  display: 'flex', alignItems: 'center', gap: 9,
                  padding: '9px 12px', marginBottom: 6,
                  background: 'var(--surface-control)',
                  border: '1px solid var(--border-control)',
                  borderRadius: 'var(--r-control)',
                }}>
                  <span style={{
                    width: 18, color: 'var(--ink-tertiary)',
                    fontFamily: 'var(--font-geist-mono), monospace', fontSize: 12,
                  }}>#{i+1}</span>
                  <span style={{
                    width: 8, height: 8, borderRadius: '50%',
                    background: c, flexShrink: 0, display: 'inline-block',
                  }} />
                  <span className="mp-break-text" style={{
                    flex: 1, minWidth: 0,
                    fontFamily: 'var(--font-geist), system-ui, sans-serif',
                    fontSize: 13.5,
                    color: p.id === selfId ? 'var(--teal)' : 'var(--ink)',
                    fontWeight: p.id === selfId ? 600 : 400,
                  }}>
                    {p.name}{p.id === selfId ? ' (you)' : ''}
                  </span>
                  <span style={{
                    fontFamily: 'var(--font-geist-mono), monospace',
                    fontSize: 13, color: 'var(--ink-secondary)', flexShrink: 0,
                  }}>
                    {p.wpm} wpm
                  </span>
                </div>
              )
            })}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {isSelfWinner && (
              <button
                type="button"
                className="restart-btn"
                onClick={() => { setCelebrating(true); setTimeout(() => setCelebrating(false), 3000) }}
                style={{
                  width: '100%', justifyContent: 'center', padding: '10px 18px',
                  borderColor: `${winnerColor}44`,
                  color: winnerColor,
                }}
              >
                Celebrate 🎉
              </button>
            )}
            <button
              type="button"
              className="restart-btn"
              onClick={onPlayAgain}
              style={{ width: '100%', justifyContent: 'center', padding: '10px 18px' }}
            >
              Play Again
            </button>
            <Link
              href="/"
              className="restart-btn"
              style={{ width: '100%', justifyContent: 'center', padding: '10px 18px', textDecoration: 'none' }}
            >
              Practice Solo
            </Link>
          </div>
        </motion.div>
      </motion.div>
    </>
  )
}
