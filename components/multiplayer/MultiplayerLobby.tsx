'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import MultiplayerRace from './MultiplayerRace'
import { MultiplayerFooter, MultiplayerHeader } from './MultiplayerSiteChrome'

export const PLAYER_COLORS = [
  { id: 'blue',   hex: '#58a6ff', label: 'Blue'   },
  { id: 'green',  hex: '#3fb950', label: 'Green'  },
  { id: 'purple', hex: '#bc8cff', label: 'Purple' },
  { id: 'orange', hex: '#d29922', label: 'Orange' },
  { id: 'red',    hex: '#f85149', label: 'Red'    },
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
  const [joinCode, setJoinCode] = useState('')
  const [roomCode, setRoomCode] = useState<string | null>(null)
  const [isHost, setIsHost]     = useState(false)
  const [error, setError]       = useState('')

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
      <MultiplayerHeader
        right={(
          <Link href="/" className="mp-nav-link">
            practice
          </Link>
        )}
      />

      <main className="app-main">
        <motion.div
          className="mp-card"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {!PUSHER_KEY && (
            <div className="mp-banner" role="status">
              <strong style={{ display: 'block', marginBottom: 6 }}>Real-time sync is off</strong>
              Add the four Pusher variables from <code style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 12 }}>.env.example</code> to{' '}
              <code style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 12 }}>.env.local</code>, then restart{' '}
              <code style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 12 }}>npm run dev</code>.
              <span style={{ display: 'block', marginTop: 8, fontSize: 13, opacity: 0.95 }}>
                Names: <code style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 11 }}>NEXT_PUBLIC_PUSHER_KEY</code>,{' '}
                <code style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 11 }}>NEXT_PUBLIC_PUSHER_CLUSTER</code>,{' '}
                <code style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 11 }}>PUSHER_APP_ID</code>,{' '}
                <code style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 11 }}>PUSHER_SECRET</code>.
                On Vercel, set those too and redeploy so <code style={{ fontFamily: 'var(--font-jetbrains-mono)', fontSize: 11 }}>NEXT_PUBLIC_*</code> values are included in the build.
              </span>
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
              placeholder="Your name or a guest label"
              autoComplete="nickname"
            />
            <button
              type="button"
              className="mp-secondary-btn"
              onClick={randomizeGuestName}
              style={{ marginTop: 12 }}
            >
              Random guest name
            </button>
          </label>

          <p className="mp-tap-hint" style={{ marginBottom: 22, textAlign: 'left', marginTop: 18 }}>
            Lane color is assigned randomly for each visit so everyone stays visible without picking a swatch.
          </p>

          <button
            type="button"
            className="restart-btn"
            onClick={handleCreate}
            disabled={!canProceed}
            style={{ width: '100%', justifyContent: 'center', padding: '13px 20px', marginBottom: 14, opacity: canProceed ? 1 : 0.4 }}
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
              style={{ flex: 1, letterSpacing: '0.2em' }}
            />
            <button
              type="submit"
              className="restart-btn"
              disabled={!canProceed}
              style={{ padding: '10px 20px', opacity: canProceed ? 1 : 0.4 }}
            >
              Join
            </button>
          </form>
          {error && (
            <div style={{ color: 'var(--accent-red)', fontSize: 13, marginTop: 8, fontFamily: 'var(--font-outfit)' }}>
              {error}
            </div>
          )}
        </motion.div>
      </main>

      <MultiplayerFooter />
    </div>
  )
}
