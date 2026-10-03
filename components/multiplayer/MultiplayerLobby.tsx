'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { UI_SPRING, FADE_TRANSITION } from '@/lib/motion'
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
  const reducedMotion = useReducedMotion()
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
        <MultiplayerHeader />

        <main id="main-content" className="app-main" tabIndex={-1} aria-labelledby="mp-lobby-title">
          <motion.section
            className="mp-card"
            initial={{ opacity: 0, y: reducedMotion ? 0 : 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reducedMotion ? 0 : 8 }}
            transition={{ ...UI_SPRING, opacity: FADE_TRANSITION }}
          >
            {!PUSHER_KEY && (
              <div className="mp-banner" role="status">
                <strong className="mp-banner-title">Real-time sync is off</strong>
                Add the four Pusher variables from{' '}
                <code>.env.example</code>
                {' '}to{' '}
                <code>.env.local</code>
                , then restart{' '}
                <code>npm run dev</code>.
              </div>
            )}

            <h1 id="mp-lobby-title" className="mp-title">Join the race</h1>

            <div className="mp-field">
              <label htmlFor="mp-display-name" className="mp-label">Display name</label>
              <input
                id="mp-display-name"
                name="displayName"
                className="mp-input"
                value={name}
                onChange={e => setName(e.target.value)}
                maxLength={24}
                placeholder="Your name"
                autoComplete="nickname"
              />
              <button
                type="button"
                className="mp-secondary-btn mp-random-name"
                onClick={randomizeGuestName}
              >
                Random name
              </button>
            </div>

            <p className="mp-tap-hint mp-lane-note">
              Lane color is assigned randomly — everyone stays visible without choosing a swatch.
            </p>

            <button
              type="button"
              className="restart-btn mp-create-btn"
              onClick={handleCreate}
              disabled={!canProceed}
            >
              Create Room
            </button>

            <p className="mp-muted-rule">Or join with a code</p>

            <form
              className="mp-join-form"
              onSubmit={e => { e.preventDefault(); handleJoin() }}
            >
              <label htmlFor="mp-room-code" className="mp-label">Room code</label>
              <div className="mp-join-controls">
                <input
                  id="mp-room-code"
                  name="roomCode"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  className={`mp-input mp-code-input${error ? ' mp-input-error' : ''}`}
                  value={joinCode}
                  onChange={e => { setJoinCode(e.target.value.replace(/\D/g, '').slice(0, 4)); setError('') }}
                  placeholder="4-digit code"
                  maxLength={4}
                  aria-invalid={Boolean(error)}
                  aria-describedby={`mp-room-code-hint${error ? ' mp-room-code-error' : ''}`}
                />
                <button type="submit" className="restart-btn" disabled={!canProceed}>
                  Join
                </button>
              </div>
              <p id="mp-room-code-hint" className="mp-form-hint">Enter the 4-digit code shared by your host.</p>
              {error && <p id="mp-room-code-error" className="mp-error" role="alert">{error}</p>}
            </form>
          </motion.section>
        </main>

        <MultiplayerFooter />
      </div>
    </div>
  )
}
