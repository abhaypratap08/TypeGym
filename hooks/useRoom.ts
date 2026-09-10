'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

export interface RoomPlayer {
  id:           string
  name:         string
  color:        string
  progress:     number  // 0–1
  wpm:          number
  finished:     boolean
  /** Timestamp (Date.now()) of last received progress/finish event. */
  lastSeenAt?:  number
}

export type RoomPhase = 'waiting' | 'countdown' | 'racing' | 'finished'

/**
 * 'connecting'   — initial Pusher handshake in progress
 * 'connected'    — subscription active
 * 'error'        — connection or auth failed (shows retry banner)
 * 'disconnected' — Pusher went offline (e.g. network drop, tab backgrounding)
 */
export type ConnectionStatus = 'connecting' | 'connected' | 'error' | 'disconnected'

interface RoomState {
  players:    RoomPlayer[]
  phase:      RoomPhase
  countdown:  number
  winnerId:   string | null
  timeLimit:  number
  timeLeft:   number
}

const PUSHER_KEY     = process.env.NEXT_PUBLIC_PUSHER_KEY     ?? ''
const PUSHER_CLUSTER = process.env.NEXT_PUBLIC_PUSHER_CLUSTER ?? 'mt1'
const TRIGGER_HEADER = process.env.NEXT_PUBLIC_TYPEGYM_PUSHER_TRIGGER_SECRET ?? ''

/**
 * Minimum interval (ms) between emitted progress events.
 * Pusher free tier is rate-limited; we cap updates at ~1 per 2 s during a race.
 * Words-per-minute already smooths over a 250 ms window in the engine, so
 * a 2 s emit cadence gives UI that looks live without hammering the API.
 */
const PROGRESS_THROTTLE_MS = 2_000

/**
 * After this many ms without any message from a peer, mark them as likely
 * disconnected. The engine emits every ~2 s during an active race.
 */
const PEER_TIMEOUT_MS = 8_000

async function push(channel: string, event: string, data: unknown) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (TRIGGER_HEADER) headers['x-typegym-pusher-trigger'] = TRIGGER_HEADER
  try {
    const res = await fetch('/api/pusher', {
      method: 'POST', headers,
      body: JSON.stringify({ channel, event, data }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { error?: string }
      console.warn('[useRoom] push failed:', err.error ?? res.status)
    }
  } catch (e) {
    console.warn('[useRoom] push error:', e)
  }
}

export function useRoom(
  roomCode:    string,
  playerId:    string,
  playerName:  string,
  playerColor: string,
  _isHost:     boolean,
) {
  const [state, setState] = useState<RoomState>({
    players: [], phase: 'waiting', countdown: 3,
    winnerId: null, timeLimit: 60, timeLeft: 60,
  })
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting')

  // Always-fresh refs — avoids stale closures in Pusher callbacks
  const stateRef    = useRef(state)
  const playerIdRef = useRef(playerId)
  const nameRef     = useRef(playerName)
  const colorRef    = useRef(playerColor)
  const channelRef  = useRef(`room-${roomCode}`)
  stateRef.current    = state
  playerIdRef.current = playerId
  nameRef.current     = playerName
  colorRef.current    = playerColor
  channelRef.current  = `room-${roomCode}`

  const countdownRef       = useRef<ReturnType<typeof setInterval> | null>(null)
  const timerRef           = useRef<ReturnType<typeof setInterval> | null>(null)
  const pusherRef          = useRef<any>(null)
  const raceStartedRef     = useRef(false)
  // Throttle: timestamp of last emitProgress call that actually fired a push
  const lastProgressEmitTs = useRef<number>(0)
  // Peer inactivity heartbeat checker
  const peerCheckRef       = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Race start logic ───────────────────────────────────────────────────────
  const runRaceStart = useCallback((timeLimit: number) => {
    if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null }
    if (timerRef.current)     { clearInterval(timerRef.current);     timerRef.current = null }

    let count = 3
    setState(prev => ({ ...prev, phase: 'countdown', countdown: count, timeLimit, timeLeft: timeLimit }))

    countdownRef.current = setInterval(() => {
      count--
      if (count > 0) {
        setState(prev => ({ ...prev, countdown: count }))
        return
      }
      clearInterval(countdownRef.current!)
      countdownRef.current = null
      setState(prev => ({ ...prev, phase: 'racing', countdown: 0 }))

      if (timeLimit <= 0) return
      const deadline = Date.now() + timeLimit * 1000
      timerRef.current = setInterval(() => {
        const left = Math.max(Math.ceil((deadline - Date.now()) / 1000), 0)
        setState(prev => {
          if (prev.phase !== 'racing') {
            clearInterval(timerRef.current!); timerRef.current = null; return prev
          }
          if (left <= 0) {
            clearInterval(timerRef.current!); timerRef.current = null
            const winnerId = prev.winnerId
              ?? ([...prev.players].sort((a, b) => b.wpm - a.wpm)[0]?.id ?? null)
            return { ...prev, timeLeft: 0, phase: 'finished', winnerId }
          }
          return { ...prev, timeLeft: left }
        })
      }, 500)
    }, 1000)
  }, [])

  // ── Public actions ─────────────────────────────────────────────────────────

  const startRace = useCallback((timeLimit: number) => {
    raceStartedRef.current = true
    runRaceStart(timeLimit)
    push(channelRef.current, 'race-start', { timeLimit })
  }, [runRaceStart])

  /**
   * emitProgress is throttled: at most one network call per PROGRESS_THROTTLE_MS.
   * The most recent (progress, wpm) values are used when the throttle window opens.
   */
  const emitProgress = useCallback((progress: number, wpm: number) => {
    const now = Date.now()
    if (now - lastProgressEmitTs.current < PROGRESS_THROTTLE_MS) return
    lastProgressEmitTs.current = now
    push(channelRef.current, 'player-progress', { id: playerIdRef.current, progress, wpm })
  }, [])

  const emitFinish = useCallback((wpm: number) => {
    push(channelRef.current, 'player-finish', { id: playerIdRef.current, wpm })
  }, [])

  // ── Pusher subscription ────────────────────────────────────────────────────
  useEffect(() => {
    if (!PUSHER_KEY || typeof window === 'undefined') {
      // No Pusher key — degrade gracefully (local-only mode)
      setConnectionStatus('error')
      return
    }

    const ch = channelRef.current
    let cancelled = false
    let retryTimeout: ReturnType<typeof setTimeout> | null = null

    const connect = async () => {
      if (cancelled) return
      setConnectionStatus('connecting')

      try {
        const mod = await import('pusher-js')
        if (cancelled) return
        const PusherLib = (mod as any).default ?? mod

        const client = new PusherLib(PUSHER_KEY, { cluster: PUSHER_CLUSTER })
        pusherRef.current = client

        // ── Connection state events ──────────────────────────────────────────
        client.connection.bind('connected', () => {
          if (!cancelled) setConnectionStatus('connected')
        })
        client.connection.bind('error', (err: unknown) => {
          console.warn('[useRoom] Pusher connection error:', err)
          if (!cancelled) setConnectionStatus('error')
        })
        client.connection.bind('unavailable', () => {
          if (!cancelled) setConnectionStatus('disconnected')
        })
        client.connection.bind('failed', () => {
          if (!cancelled) setConnectionStatus('error')
        })
        client.connection.bind('disconnected', () => {
          if (!cancelled) {
            setConnectionStatus('disconnected')
            // Auto-retry after 4 s unless we were deliberately torn down
            retryTimeout = setTimeout(() => {
              if (!cancelled) {
                try { client.connect() } catch {}
              }
            }, 4_000)
          }
        })

        const sub = client.subscribe(ch)

        // ── Self-announce ────────────────────────────────────────────────────
        const announceSelf = () => {
          if (cancelled) return
          const self: RoomPlayer = {
            id: playerIdRef.current,
            name: nameRef.current.trim().slice(0, 24),
            color: colorRef.current,
            progress: stateRef.current.players.find(p => p.id === playerIdRef.current)?.progress ?? 0,
            wpm:      stateRef.current.players.find(p => p.id === playerIdRef.current)?.wpm ?? 0,
            finished: stateRef.current.players.find(p => p.id === playerIdRef.current)?.finished ?? false,
            lastSeenAt: Date.now(),
          }
          setState(prev => {
            if (prev.players.find(p => p.id === self.id)) return prev
            if (prev.players.length >= 5) return prev
            return { ...prev, players: [...prev.players, self] }
          })
          push(ch, 'player-join', self)
        }

        const announcedToRef = new Set<string>()
        setTimeout(announceSelf, 300)

        // ── Event handlers ───────────────────────────────────────────────────
        sub.bind('player-join', (player: RoomPlayer) => {
          if (cancelled) return
          setState(prev => {
            if (prev.players.find(p => p.id === player.id)) return prev
            if (prev.players.length >= 5) return prev
            return {
              ...prev,
              players: [...prev.players, { ...player, lastSeenAt: Date.now() }],
            }
          })
          if (player.id !== playerIdRef.current && !announcedToRef.has(player.id)) {
            announcedToRef.add(player.id)
            setTimeout(announceSelf, 300)
          }
        })

        sub.bind('player-progress', ({ id, progress, wpm }: { id: string; progress: number; wpm: number }) => {
          if (cancelled) return
          setState(prev => ({
            ...prev,
            players: prev.players.map(p =>
              p.id === id ? { ...p, progress, wpm, lastSeenAt: Date.now() } : p,
            ),
          }))
        })

        sub.bind('player-finish', ({ id, wpm }: { id: string; wpm: number }) => {
          if (cancelled) return
          setState(prev => {
            const updated  = prev.players.map(p =>
              p.id === id ? { ...p, finished: true, wpm, progress: 1, lastSeenAt: Date.now() } : p,
            )
            const winnerId = prev.winnerId ?? id
            const allDone  = updated.every(p => p.finished)
            return { ...prev, players: updated, winnerId, phase: allDone ? 'finished' : prev.phase }
          })
        })

        sub.bind('race-start', ({ timeLimit }: { timeLimit: number }) => {
          if (cancelled || raceStartedRef.current) return
          raceStartedRef.current = true
          runRaceStart(timeLimit)
        })

        // ── Peer inactivity checker ──────────────────────────────────────────
        // During a race, if a peer's lastSeenAt is older than PEER_TIMEOUT_MS,
        // mark them as disconnected so the UI can surface a notice.
        peerCheckRef.current = setInterval(() => {
          if (cancelled) return
          const now = Date.now()
          setState(prev => {
            if (prev.phase !== 'racing') return prev
            let changed = false
            const players = prev.players.map(p => {
              if (p.id === playerIdRef.current) return p          // self: always alive
              if (p.finished) return p                            // already done: leave alone
              const stale = p.lastSeenAt !== undefined && now - p.lastSeenAt > PEER_TIMEOUT_MS
              if (stale !== (p as any)._stale) {
                changed = true
                return { ...p, _stale: stale } as RoomPlayer
              }
              return p
            })
            return changed ? { ...prev, players } : prev
          })
        }, 3_000)

      } catch (e) {
        console.warn('[useRoom] init failed:', e)
        if (!cancelled) setConnectionStatus('error')
      }
    }

    connect()

    return () => {
      cancelled = true
      raceStartedRef.current = false
      if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null }
      if (timerRef.current)     { clearInterval(timerRef.current);     timerRef.current = null }
      if (peerCheckRef.current) { clearInterval(peerCheckRef.current); peerCheckRef.current = null }
      if (retryTimeout !== null) { clearTimeout(retryTimeout) }
      try {
        pusherRef.current?.unsubscribe(ch)
        pusherRef.current?.disconnect()
        pusherRef.current = null
      } catch {}
    }
  }, [roomCode, runRaceStart]) // eslint-disable-line react-hooks/exhaustive-deps

  const forceFinish = useCallback(() => {
    setState(prev => {
      if (prev.phase !== 'racing') return prev
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
      const winnerId = prev.winnerId
        ?? ([...prev.players].sort((a, b) => b.wpm - a.wpm)[0]?.id ?? null)
      return { ...prev, timeLeft: 0, phase: 'finished', winnerId }
    })
  }, [])

  return { state, connectionStatus, emitProgress, emitFinish, startRace, forceFinish }
}
