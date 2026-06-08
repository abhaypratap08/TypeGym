'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Pusher from 'pusher-js'

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
  timeLimit: number   // seconds, 0 = no limit
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
      method:  'POST',
      headers,
      body:    JSON.stringify({ channel, event, data }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { error?: string }
      console.warn('[useRoom] Pusher trigger failed:', err.error ?? res.status)
    }
  } catch (e) {
    console.warn('[useRoom] Pusher trigger error:', e)
  }
}

export function useRoom(roomCode: string, playerId: string, playerName: string, playerColor: string, isHost: boolean) {
  const [state, setState] = useState<RoomState>({
    players:   [],
    phase:     'waiting',
    countdown: 3,
    winnerId:  null,
    timeLimit: 60,
    timeLeft:  60,
  })

  const stateRef = useRef(state)
  stateRef.current = state

  const channel = `room-${roomCode}`

  // Announce self on join
  const announce = useCallback(() => {
    push(channel, 'player-join', {
      id: playerId,
      name: playerName.trim().slice(0, 24),
      color: playerColor,
      progress: 0,
      wpm: 0,
      finished: false,
    })
  }, [channel, playerId, playerName, playerColor])

  // Emit progress update
  const emitProgress = useCallback((progress: number, wpm: number) => {
    push(channel, 'player-progress', { id: playerId, progress, wpm })
  }, [channel, playerId])

  // Emit finish
  const emitFinish = useCallback((wpm: number) => {
    push(channel, 'player-finish', { id: playerId, wpm })
  }, [channel, playerId])

  // Host starts the race
  const startRace = useCallback((timeLimit: number) => {
    push(channel, 'race-start', { timeLimit })
  }, [channel])

  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (!PUSHER_KEY) return

    const pusher = new Pusher(PUSHER_KEY, { cluster: PUSHER_CLUSTER })
    const ch = pusher.subscribe(channel)

    ch.bind('player-join', (player: RoomPlayer) => {
      setState(prev => {
        if (prev.players.find(p => p.id === player.id)) return prev
        if (prev.players.length >= 5) return prev
        return { ...prev, players: [...prev.players, player] }
      })
      // Re-announce self so the new joiner sees us too
      if (player.id !== playerId) {
        setTimeout(() => {
          push(channel, 'player-join', {
            id: playerId,
            name: playerName.trim().slice(0, 24),
            color: playerColor,
            progress: stateRef.current.players.find(p => p.id === playerId)?.progress ?? 0,
            wpm: stateRef.current.players.find(p => p.id === playerId)?.wpm ?? 0,
            finished: stateRef.current.players.find(p => p.id === playerId)?.finished ?? false,
          })
        }, 300)
      }
    })

    ch.bind('player-progress', ({ id, progress, wpm }: { id: string; progress: number; wpm: number }) => {
      setState(prev => ({
        ...prev,
        players: prev.players.map(p => p.id === id ? { ...p, progress, wpm } : p),
      }))
    })

    ch.bind('player-finish', ({ id, wpm }: { id: string; wpm: number }) => {
      setState(prev => {
        const updated = prev.players.map(p => p.id === id ? { ...p, finished: true, wpm, progress: 1 } : p)
        const winnerId = prev.winnerId ?? id
        const allDone  = updated.every(p => p.finished)
        return { ...prev, players: updated, winnerId, phase: allDone ? 'finished' : prev.phase }
      })
    })

    ch.bind('race-start', ({ timeLimit }: { timeLimit: number }) => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current)
        countdownRef.current = null
      }
      let count = 3
      setState(prev => ({ ...prev, phase: 'countdown', countdown: count, timeLimit, timeLeft: timeLimit }))
      countdownRef.current = setInterval(() => {
        count--
        if (count <= 0) {
          if (countdownRef.current) clearInterval(countdownRef.current)
          countdownRef.current = null
          setState(prev => ({ ...prev, phase: 'racing', countdown: 0 }))
          if (timeLimit > 0) {
            let left = timeLimit
            const tick = setInterval(() => {
              left--
              setState(prev => {
                if (prev.phase !== 'racing') { clearInterval(tick); return prev }
                if (left <= 0) { clearInterval(tick); return { ...prev, timeLeft: 0, phase: 'finished' } }
                return { ...prev, timeLeft: left }
              })
            }, 1000)
          }
        } else {
          setState(prev => ({ ...prev, countdown: count }))
        }
      }, 1000)
    })

    ch.bind('pusher:subscription_succeeded', () => {
      announce()
    })

    return () => {
      if (countdownRef.current) {
        clearInterval(countdownRef.current)
        countdownRef.current = null
      }
      pusher.unsubscribe(channel)
      pusher.disconnect()
    }
  }, [channel, announce])

  return { state, emitProgress, emitFinish, startRace }
}
