'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import MultiplayerRace from './MultiplayerRace'
import { MultiplayerFooter, MultiplayerHeader } from './MultiplayerSiteChrome'

export const PLAYER_COLORS = [
  { id: 'teal',     hex: '#4a9e87', label: 'Teal'     },
  { id: 'lavender', hex: '#8b7cb8', label: 'Lavender' },
  { id: 'coral',    hex: '#d96c5a', label: 'Coral'    },
  { id: 'amber',    hex: '#c9864e', label: 'Amber'    },
  { id: 'sage',     hex: '#6a9e7e', label: 'Sage'     },
]

export const GUEST_NAMES = [
  'GuestAlpha', 'GuestBravo', 'GuestCharlie', 'GuestDelta', 'GuestEcho', 'GuestFoxtrot',
  'GuestGolf', 'GuestHotel', 'GuestIndia', 'GuestJuliett', 'GuestKilo', 'GuestLima',
  'GuestMike', 'GuestNovember', 'GuestOscar', 'GuestPapa', 'GuestQuebec', 'GuestRomeo',
  'GuestSierra', 'GuestTango', 'GuestUniform', 'GuestVictor', 'GuestWhiskey', 'GuestXray',
  'GuestYankee', 'GuestZulu',
] as const

function pickRandom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!
}

function pickGuestName(exclude?: string): string {
  if (GUEST_NAMES.length <= 1) return GUEST_NAMES[0]!
  let next = pickRandom(GUEST_NAMES)
  let n = 0
  while (next === exclude && n++ < 12) next = pickRandom(GUEST_NAMES)
  return next
}

function pickColorId(exclude?: string): string {
  const ids = PLAYER_COLORS.map(c => c.id)
  if (ids.length <= 1) return ids[0]!
  let next = pickRandom(ids)
  let n = 0
  while (next === exclude && n++ < 12) next = pickRandom(ids)
  return next
}

function generateCode() {
  return String(Math.floor(1000 + Math.random() * 9000))
}

const PUSHER_KEY = process.env.NEXT_PUBLIC_PUSHER_KEY ?? ''

export default function MultiplayerLobby() {
  const [name, setName]   = useState('GuestAlpha')
  const [color, setColor] = useState<string>(PLAYER_COLORS[0].id)
  const [joinCode, setJoinCode]   = useState('')
  const [roomCode, setRoomCode]   = useState<string | null>(null)
  const [isHost, setIsHost]       = useState(false)
  const [error, setError]         = useState('')

  useEffect(() => {
    setName(pickGuestName())
    setColor(pickColorId())
  }, [])

  const randomizeGuestName = useCallback(() => {
    setName(pickGuestName(name))
  }, [name])

  if (roomCode) {
    return (
      <MultiplayerRace
        roomCode={roomCode}
        playerName={name}
        playerColor={color}
        isHost={isHost}
        onLeave={() => {
          setRoomCode(null)
          setIsHost(false)
          setName(pickGuestName())
          setColor(pickColorId())
        }}
      />
    )
  }

  const canProceed = name.trim().length > 0

  function handleCreate() {
    if (!canProceed) return
    setIsHost(true)
    setRoomCode(generateCode())
  }

  function handleJoin() {
    if (!canProceed) return
    const code = joinCode.trim()
    if (code.length !== 4 || !/^\d{4}$/.test(code)) {
      setError('Enter a valid 4-digit code')
      return
    }
    setError('')
    setIsHost(false)
    setRoomCode(code)
  }

  return (
    <div className="app-shell bg-grid">
      <div className="app-window">
        <MultiplayerHeader
          right={
            <Link href="/" className="mp-nav-link">practice</Link>
          }
        />

        <main className="app-main">
          <motion.div
            className="mp-card"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
          >
            {!PUSHER_KEY && (
              <div className="mp-banner" role="status">
                <strong style={{ display: 'block', marginBottom: 5 }}>Real-time sync is off</strong>
                Add the four Pusher variables from{' '}
                <code style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 11 }}>.env.example</code>
                {' '}to{' '}
                <code style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 11 }}>.env.local</code>
                , then restart{' '}
                <code style={{ fontFamily: 'var(--font-geist-mono)', fontSize: 11 }}>npm run dev</code>.
              </div>
            )}

            <h2 className="mp-title">Join the race</h2>

            <label style={{ display: 'block', marginBottom: 10 }}>
              <div className="mp-label">Display name</div>
              <input
                className="mp-input"
                value={name}
                onChange={e => setName(e.target.value)}
                maxLength={24}
                placeholder="Your name"
                autoComplete="nickname"
              />
              <button
                type="button"
                className="mp-secondary-btn"
                onClick={randomizeGuestName}
                style={{ marginTop: 10 }}
              >
                Random name
              </button>
            </label>

            <p className="mp-tap-hint" style={{ marginBottom: 20, textAlign: 'left', marginTop: 16 }}>
              Lane color is assigned randomly — everyone stays visible without choosing a swatch.
            </p>

            <button
              type="button"
              className="restart-btn"
              onClick={handleCreate}
              disabled={!canProceed}
              style={{
                width: '100%', justifyContent: 'center',
                padding: '11px 20px', marginBottom: 12,
                opacity: canProceed ? 1 : 0.4,
              }}
            >
              Create Room
            </button>

            <div className="mp-muted-rule">— or join with a code —</div>

            <form
              style={{ display: 'flex', gap: 8 }}
              onSubmit={e => { e.preventDefault(); handleJoin() }}
            >
              <input
                className={`mp-input${error ? ' mp-input-error' : ''}`}
                value={joinCode}
                onChange={e => { setJoinCode(e.target.value.replace(/\D/g, '').slice(0, 4)); setError('') }}
                placeholder="4-digit code"
                maxLength={4}
                style={{ flex: 1, letterSpacing: '0.18em', textAlign: 'center' }}
              />
              <button
                type="submit"
                className="restart-btn"
                disabled={!canProceed}
                style={{ padding: '9px 18px', opacity: canProceed ? 1 : 0.4 }}
              >
                Join
              </button>
            </form>

            {error && (
              <div style={{
                color: 'var(--coral)', fontSize: 12.5,
                marginTop: 7, fontFamily: 'var(--font-geist), system-ui, sans-serif',
              }}>
                {error}
              </div>
            )}
          </motion.div>
        </main>

        <MultiplayerFooter />
      </div>
    </div>
  )
}
