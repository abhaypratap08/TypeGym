'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { UI_SPRING, FADE_TRANSITION } from '@/lib/motion'
import MultiplayerRace from './MultiplayerRace'
import { MultiplayerFooter, MultiplayerHeader } from './MultiplayerSiteChrome'
import type { ActiveRoomSession } from '@/lib/multiplayer/types'
import { clearActiveSession, loadActiveSession, roomResponse, saveActiveSession } from '@/lib/multiplayer/session'

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

const PUSHER_KEY = process.env.NEXT_PUBLIC_PUSHER_KEY ?? ''

interface RoomResponse {
  session: ActiveRoomSession
}

export default function MultiplayerLobby() {
  const reducedMotion = useReducedMotion()
  const [name, setName] = useState('GuestAlpha')
  const [color, setColor] = useState<string>(PLAYER_COLORS[0].id)
  const [joinCode, setJoinCode] = useState('')
  const [session, setSession] = useState<ActiveRoomSession | null>(null)
  const [restoring, setRestoring] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    try {
      const stored = loadActiveSession()
      if (stored) {
        // Read local identity before rendering either Create/Join or the race.
        // useRoom then subscribes and validates it against the room authority.
        setSession(stored)
        setName(stored.playerName)
        setColor(stored.playerColor)
      } else {
        setName(pickGuestName())
        setColor(pickColorId())
      }
    } catch {
      setError('Enable session storage to restore and join multiplayer rooms.')
    } finally {
      setRestoring(false)
    }
  }, [])

  const randomizeGuestName = useCallback(() => setName(previous => pickGuestName(previous)), [])

  const enterRoom = useCallback(async (action: 'create' | 'join') => {
    if (busy || !name.trim()) return
    const code = joinCode.trim()
    if (action === 'join' && (code.length !== 4 || !/^\d{4}$/.test(code))) {
      setError('Enter a valid 4-digit code')
      return
    }
    setBusy(true)
    setError('')
    try {
      // Fail before reserving a server-side seat if storage is unavailable.
      sessionStorage.setItem('tg-storage-check', '1')
      sessionStorage.removeItem('tg-storage-check')
      const response = await fetch('/api/rooms', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, name, color, ...(action === 'join' ? { roomCode: code } : {}) }),
      }).then(roomResponse<RoomResponse>)
      saveActiveSession(response.session)
      setSession(response.session)
      setName(response.session.playerName)
      setColor(response.session.playerColor)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not enter the room. Please retry.')
    } finally {
      setBusy(false)
    }
  }, [busy, color, joinCode, name])

  const leave = useCallback(() => {
    // The race component has already performed the authenticated DELETE. This
    // is the only UI path that clears the refresh-recovery record.
    clearActiveSession()
    setSession(null)
    setName(pickGuestName())
    setColor(pickColorId())
  }, [])

  if (restoring) {
    return (
      <div className="app-shell bg-grid">
        <div className="app-window">
          <MultiplayerHeader />
          <main id="main-content" className="app-main" tabIndex={-1} aria-labelledby="mp-restore-title">
            <motion.section
              className="mp-card"
              initial={{ opacity: 0, y: reducedMotion ? 0 : 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...UI_SPRING, opacity: FADE_TRANSITION }}
            >
              <p id="mp-restore-title" className="mp-tap-hint" role="status" aria-live="polite">Restoring your room…</p>
            </motion.section>
          </main>
          <MultiplayerFooter />
        </div>
      </div>
    )
  }

  if (session) {
    return <MultiplayerRace key={session.roomId} session={session} onLeave={leave} />
  }

  const canProceed = name.trim().length > 0 && !busy
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
                Add the Pusher variables from <code>.env.example</code> to <code>.env.local</code>, then restart <code>npm run dev</code>.
              </div>
            )}

            <h1 id="mp-lobby-title" className="mp-title">Join the race</h1>

            <div className="mp-field">
              <label htmlFor="mp-display-name" className="mp-label">Display name</label>
              <input
                id="mp-display-name" name="displayName" className="mp-input" value={name}
                onChange={e => setName(e.target.value)} maxLength={24} placeholder="Your name" autoComplete="nickname"
              />
              <button type="button" className="mp-secondary-btn mp-random-name" onClick={randomizeGuestName} disabled={busy}>Random name</button>
            </div>

            <p className="mp-tap-hint mp-lane-note">Lane color is assigned randomly — everyone stays visible without choosing a swatch.</p>

            <button type="button" className="restart-btn mp-create-btn" onClick={() => void enterRoom('create')} disabled={!canProceed}>
              {busy ? 'Connecting…' : 'Create Room'}
            </button>

            <p className="mp-muted-rule">Or join with a code</p>

            <form className="mp-join-form" onSubmit={e => { e.preventDefault(); void enterRoom('join') }}>
              <label htmlFor="mp-room-code" className="mp-label">Room code</label>
              <div className="mp-join-controls">
                <input
                  id="mp-room-code" name="roomCode" type="text" inputMode="numeric" autoComplete="off"
                  className={`mp-input mp-code-input${error ? ' mp-input-error' : ''}`} value={joinCode}
                  onChange={e => { setJoinCode(e.target.value.replace(/\D/g, '').slice(0, 4)); setError('') }}
                  placeholder="4-digit code" maxLength={4} aria-invalid={Boolean(error)}
                  aria-describedby={`mp-room-code-hint${error ? ' mp-room-code-error' : ''}`}
                />
                <button type="submit" className="restart-btn" disabled={!canProceed}>{busy ? 'Joining…' : 'Join'}</button>
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
