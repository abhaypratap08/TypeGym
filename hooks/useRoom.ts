'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

export interface RoomPlayer {
  id:       string
  name:     string
  color:    string
  progress: number  // 0–1
  wpm:      number
  finished: boolean
}

export type RoomPhase = 'waiting' | 'countdown' | 'racing' | 'finished'

interface RoomState {
  players:   RoomPlayer[]
  phase:     RoomPhase
  countdown: number
  winnerId:  string | null
  timeLimit: number
  timeLeft:  number
}

const PUSHER_KEY     = process.env.NEXT_PUBLIC_PUSHER_KEY     ?? ''
const PUSHER_CLUSTER = process.env.NEXT_PUBLIC_PUSHER_CLUSTER ?? 'mt1'
const TRIGGER_HEADER = process.env.NEXT_PUBLIC_TYPEGYM_PUSHER_TRIGGER_SECRET ?? ''

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
  roomCode: string,
  playerId: string,
  playerName: string,
  playerColor: string,
  _isHost: boolean,
) {
  const [state, setState] = useState<RoomState>({
    players: [], phase: 'waiting', countdown: 3,
    winnerId: null, timeLimit: 60, timeLeft: 60,
  })

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

  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timerRef     = useRef<ReturnType<typeof setInterval> | null>(null)
  const pusherRef    = useRef<any>(null)

  const raceStartedRef = useRef(false)

  // ── Race start logic (used by both host and non-host via Pusher) ───────────
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
      let left = timeLimit
      const deadline = Date.now() + timeLimit * 1000
      timerRef.current = setInterval(() => {
        left = Math.ceil((deadline - Date.now()) / 1000)
        if (left < 0) left = 0
        setState(prev => {
          if (prev.phase !== 'racing') {
            console.log('[timer] cleared early, phase=', prev.phase, 'left=', left)
            clearInterval(timerRef.current!); timerRef.current = null; return prev
          }
          if (left <= 0) {
            clearInterval(timerRef.current!); timerRef.current = null
            const winnerId = prev.winnerId
              ?? ([...prev.players].sort((a, b) => b.wpm - a.wpm)[0]?.id ?? null)
            console.log('[timer] finished, winnerId=', winnerId, 'players=', prev.players.length)
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

  const emitProgress = useCallback((progress: number, wpm: number) => {
    push(channelRef.current, 'player-progress', { id: playerIdRef.current, progress, wpm })
  }, [])

  const emitFinish = useCallback((wpm: number) => {
    push(channelRef.current, 'player-finish', { id: playerIdRef.current, wpm })
  }, [])

  // ── Pusher subscription (runs once per roomCode) ───────────────────────────
  useEffect(() => {
    if (!PUSHER_KEY || typeof window === 'undefined') return
    const ch = channelRef.current

    ;(async () => {
      try {
        const mod = await import('pusher-js')
        const PusherLib = (mod as any).default ?? mod
        pusherRef.current = new PusherLib(PUSHER_KEY, { cluster: PUSHER_CLUSTER })
        const sub = pusherRef.current.subscribe(ch)

        // Add self locally immediately; also broadcast so others see us
        const announceSelf = () => {
          const self: RoomPlayer = {
            id: playerIdRef.current,
            name: nameRef.current.trim().slice(0, 24),
            color: colorRef.current,
            progress: stateRef.current.players.find(p => p.id === playerIdRef.current)?.progress ?? 0,
            wpm:      stateRef.current.players.find(p => p.id === playerIdRef.current)?.wpm ?? 0,
            finished: stateRef.current.players.find(p => p.id === playerIdRef.current)?.finished ?? false,
          }
          setState(prev =>
            prev.players.find(p => p.id === self.id)
              ? prev
              : { ...prev, players: [...prev.players, self] }
          )
          push(ch, 'player-join', self)
        }

        const announcedToRef = new Set<string>()

        setTimeout(announceSelf, 300)

        sub.bind('player-join', (player: RoomPlayer) => {
          setState(prev => {
            if (prev.players.find(p => p.id === player.id)) return prev
            if (prev.players.length >= 5) return prev
            return { ...prev, players: [...prev.players, player] }
          })
          // Re-announce once per new player so they see us (but never loop back)
          if (player.id !== playerIdRef.current && !announcedToRef.has(player.id)) {
            announcedToRef.add(player.id)
            setTimeout(announceSelf, 300)
          }
        })

        sub.bind('player-progress', ({ id, progress, wpm }: { id: string; progress: number; wpm: number }) => {
          setState(prev => ({
            ...prev,
            players: prev.players.map(p => p.id === id ? { ...p, progress, wpm } : p),
          }))
        })

        sub.bind('player-finish', ({ id, wpm }: { id: string; wpm: number }) => {
          setState(prev => {
            const updated  = prev.players.map(p => p.id === id ? { ...p, finished: true, wpm, progress: 1 } : p)
            const winnerId = prev.winnerId ?? id
            const allDone  = updated.every(p => p.finished)
            return { ...prev, players: updated, winnerId, phase: allDone ? 'finished' : prev.phase }
          })
        })

        sub.bind('race-start', ({ timeLimit }: { timeLimit: number }) => {
          if (raceStartedRef.current) return
          raceStartedRef.current = true
          runRaceStart(timeLimit)
        })
      } catch (e) {
        console.warn('[useRoom] init failed:', e)
      }
    })()

    return () => {
      raceStartedRef.current = false
      if (countdownRef.current) { clearInterval(countdownRef.current); countdownRef.current = null }
      if (timerRef.current)     { clearInterval(timerRef.current);     timerRef.current = null }
      try {
        pusherRef.current?.unsubscribe(ch)
        pusherRef.current?.disconnect()
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

  return { state, emitProgress, emitFinish, startRace, forceFinish }
}
