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

  const startCelebration = () => {
    setCelebrating(true)
    setTimeout(() => setCelebrating(false), 3000)
  }
  const winner = players.find(p => p.id === winnerId)
  const sorted = [...players].sort((a, b) => b.wpm - a.wpm)
  const winnerColor = PLAYER_COLORS.find(c => c.id === winner?.color)?.hex ?? '#58a6ff'
  const isSelfWinner = winnerId === selfId

  return (
    <>
      <AnimatePresence>
        {celebrating && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'fixed', inset: 0, zIndex: 100,
              background: 'rgba(0,0,0,0.9)',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              pointerEvents: 'none',
              overflow: 'hidden',
            }}
          >
            {/* Rings + trophy in same anchor so rings expand from trophy center */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 200, height: 200 }}>
              {[0, 0.5, 1].map(delay => (
                <motion.div key={delay} style={{
                  position: 'absolute',
                  borderRadius: '50%',
                  border: `2px solid ${winnerColor}`,
                  width: 200, height: 200,
                  top: 0, left: 0,
                }}
                  animate={{ scale: [1, 4], opacity: [0.7, 0] }}
                  transition={{ duration: 1.8, delay, ease: 'easeOut', repeat: Infinity, repeatDelay: 0.6 }}
                />
              ))}
              <motion.div
                animate={{ rotate: 360, scale: [0.5, 1.3, 1.1] }}
                transition={{ rotate: { duration: 1, ease: 'easeInOut' }, scale: { duration: 0.8, times: [0, 0.6, 1] } }}
                style={{ filter: `drop-shadow(0 0 40px ${winnerColor}) drop-shadow(0 0 80px ${winnerColor})`, position: 'relative', zIndex: 1 }}
              >
                <Image src="/trophy.svg" alt="trophy" width={200} height={200} priority />
              </motion.div>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: [0, 1, 1, 0], y: 0 }}
              transition={{ duration: 3, times: [0, 0.2, 0.8, 1] }}
              style={{
                marginTop: 24, fontSize: 28, fontWeight: 800,
                color: winnerColor, fontFamily: 'var(--font-outfit), sans-serif',
                textShadow: `0 0 20px ${winnerColor}`,
                letterSpacing: '-0.02em', position: 'relative', zIndex: 1,
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
        transition={{ duration: 0.35, ease: 'easeOut' }}
        style={{
          maxWidth: 520, width: '100%', textAlign: 'center',
          borderColor: `${winnerColor}55`,
          boxShadow: `0 28px 78px rgba(0,0,0,0.38), 0 0 60px ${winnerColor}18`,
        }}
      >
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 260, damping: 16 }}
          style={{ marginBottom: 8 }}
        >
          <Image src="/trophy.svg" alt="trophy" width={110} height={110} priority />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <div className="result-stat-label" style={{ marginBottom: 6 }}>winner</div>
          <div className="result-title mp-break-text" style={{ fontSize: 36, color: winnerColor, marginBottom: 4 }}>
            {winner?.name ?? '—'}
          </div>
          <div style={{ fontSize: 18, color: 'var(--text-secondary)', fontFamily: 'var(--font-jetbrains-mono), monospace', marginBottom: 28 }}>
            {winner?.wpm} wpm
          </div>

          {isSelfWinner ? (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
              className="mp-tap-hint" style={{ color: winnerColor, marginBottom: 20 }}>
              That&apos;s you — nice run.
            </motion.p>
          ) : (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}
              className="mp-tap-hint" style={{ marginBottom: 20 }}>
              Better luck next time.
            </motion.p>
          )}

          <div style={{ marginBottom: 28, textAlign: 'left' }}>
            {sorted.map((p, i) => {
              const c = PLAYER_COLORS.find(x => x.id === p.color)?.hex ?? '#58a6ff'
              return (
                <div key={p.id} className="result-stat" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', marginBottom: 8 }}>
                  <span style={{ width: 22, color: 'var(--text-muted)', fontFamily: 'var(--font-jetbrains-mono), monospace', fontSize: 13 }}>#{i + 1}</span>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: c, flexShrink: 0, display: 'inline-block' }} />
                  <span className="mp-break-text" style={{ flex: 1, minWidth: 0, fontFamily: 'var(--font-outfit), sans-serif', fontSize: 15, color: p.id === selfId ? c : 'var(--text-primary)' }}>
                    {p.name}{p.id === selfId ? ' (you)' : ''}
                  </span>
                  <span style={{ fontFamily: 'var(--font-jetbrains-mono), monospace', fontSize: 14, color: 'var(--text-secondary)', flexShrink: 0 }}>{p.wpm} wpm</span>
                </div>
              )
            })}
          </div>

          {isSelfWinner ? (
            <button
              type="button"
              className="restart-btn"
              onClick={() => startCelebration()}
              style={{ width: '100%', justifyContent: 'center', padding: '13px 20px', marginBottom: 10, background: `${winnerColor}22`, borderColor: `${winnerColor}66`, color: winnerColor }}
            >
              Celebrate!!!
            </button>
          ) : (
            <div style={{ visibility: 'hidden', height: 'auto', marginBottom: 10 }}>
              <button type="button" className="restart-btn"
                style={{ width: '100%', justifyContent: 'center', padding: '13px 20px' }}
                tabIndex={-1} aria-hidden="true">
                Celebrate!!!
              </button>
            </div>
          )}
          <button type="button" className="restart-btn" onClick={onPlayAgain}
            style={{ width: '100%', justifyContent: 'center', padding: '13px 20px' }}>
            Play Again
          </button>
          <Link href="/" className="restart-btn"
            style={{ width: '100%', justifyContent: 'center', padding: '13px 20px', marginTop: 10, textDecoration: 'none' }}>
            Practice Solo
          </Link>
        </motion.div>
      </motion.div>
    </>
  )
}
