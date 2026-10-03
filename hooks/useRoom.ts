'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type Pusher from 'pusher-js'
import {
  RACE_EVENT, roomChannel, type ActiveRoomSession, type PlayerIdentity, type RaceCommand, type RoomSnapshot,
} from '@/lib/multiplayer/types'
import { reconcilePlayers, roomClock } from '@/lib/multiplayer/reconcile'
import { roomDiagnostic, roomResponse, sessionHeaders } from '@/lib/multiplayer/session'

export type { RoomPlayer, RoomPhase } from '@/lib/multiplayer/types'
export type ConnectionStatus = 'connecting' | 'syncing' | 'connected' | 'error' | 'disconnected'

const PUSHER_KEY = process.env.NEXT_PUBLIC_PUSHER_KEY ?? ''
const PUSHER_CLUSTER = process.env.NEXT_PUBLIC_PUSHER_CLUSTER ?? 'mt1'
const PROGRESS_THROTTLE_MS = 2_000
type Member = { id: string; info: PlayerIdentity }
type Members = { each: (callback: (member: Member) => void) => void }

export function useRoom(session: ActiveRoomSession) {
  const [snapshot, setSnapshot] = useState<RoomSnapshot | null>(null)
  const [members, setMembers] = useState(new Map<string, PlayerIdentity>())
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting')
  const [error, setError] = useState('')
  const [clock, setClock] = useState(Date.now())
  const [retryKey, setRetryKey] = useState(0)
  const snapshotRef = useRef<RoomSnapshot | null>(null)
  const clockOffset = useRef(0)
  const sequence = useRef(0)
  const lastProgress = useRef(0)
  const applyRef = useRef<(next: RoomSnapshot) => void>(() => {})
  const connectedRef = useRef(false)
  const sessionRef = useRef(session)
  sessionRef.current = session

  useEffect(() => {
    let cancelled = false
    let client: Pusher | undefined
    let snapshotRequest: AbortController | undefined
    let subscriptionGeneration = 0
    let hasConnected = false
    const channelName = roomChannel(session.roomCode)
    const requestHeaders = sessionHeaders(session)
    setConnectionStatus('connecting')
    setError('')
    connectedRef.current = false
    if (snapshotRef.current && snapshotRef.current.roomId !== session.roomId) {
      snapshotRef.current = null
      sequence.current = 0
      lastProgress.current = 0
      setSnapshot(null)
      setMembers(new Map())
    }

    const apply = (next: RoomSnapshot) => {
      if (cancelled || next.roomId !== session.roomId) return
      const previous = snapshotRef.current
      if (previous && (next.revision < previous.revision ||
        (next.revision === previous.revision && next.serverNow < previous.serverNow))) return
      snapshotRef.current = next
      sequence.current = Math.max(sequence.current, next.players.find(p => p.id === session.playerId)?.sequence ?? 0)
      setSnapshot(next)
      setClock(Date.now() + clockOffset.current)
    }
    applyRef.current = apply

    const resync = async (subscribed = true) => {
      const generation = ++subscriptionGeneration
      snapshotRequest?.abort()
      const request = new AbortController()
      snapshotRequest = request
      const sentAt = Date.now()
      try {
        const { snapshot: next } = await fetch(`/api/rooms/${session.roomCode}`, {
          headers: requestHeaders, cache: 'no-store', signal: request.signal,
        }).then(roomResponse<{ snapshot: RoomSnapshot }>)
        if (cancelled || generation !== subscriptionGeneration) return
        if (next.roomId !== session.roomId) throw new Error('This room has expired. Leave to join another room.')
        // Estimate the server clock from this request, never restart a countdown
        // from event arrival time. RTT/2 compensates for ordinary network latency.
        clockOffset.current = next.serverNow - (sentAt + Date.now()) / 2
        apply(next)
        roomDiagnostic('room_snapshot_received', { revision: next.revision, phase: next.phase })
        connectedRef.current = subscribed
        setConnectionStatus(subscribed || next.closed ? 'connected' : 'error')
        if (subscribed || next.closed) setError('')
      } catch (cause) {
        if (cancelled || request.signal.aborted || generation !== subscriptionGeneration) return
        setError(cause instanceof Error ? cause.message : 'Could not restore room state.')
        setConnectionStatus('error')
      }
    }

    const invalidate = (status: ConnectionStatus) => {
      ++subscriptionGeneration
      snapshotRequest?.abort()
      connectedRef.current = false
      if (!cancelled) setConnectionStatus(status)
    }

    const connect = async () => {
      try {
        if (!PUSHER_KEY) throw new Error('Pusher is not configured.')
        const { default: PusherClient } = await import('pusher-js')
        if (cancelled) return
        client = new PusherClient(PUSHER_KEY, {
          cluster: PUSHER_CLUSTER,
          channelAuthorization: {
            endpoint: '/api/pusher/auth', transport: 'ajax', headers: requestHeaders,
            paramsProvider: () => { roomDiagnostic('subscription_requested'); return {} },
          },
        })
        client.connection.bind('connected', () => {
          if (cancelled) return
          if (hasConnected) roomDiagnostic('reconnect')
          hasConnected = true
          setConnectionStatus('syncing')
        })
        client.connection.bind('state_change', ({ current }: { current: string }) => {
          if (['connecting', 'disconnected', 'unavailable'].includes(current)) invalidate('disconnected')
          if (current === 'failed') invalidate('error')
        })
        client.connection.bind('error', () => invalidate('error'))

        const channel = client.subscribe(channelName)
        channel.bind('pusher:subscription_succeeded', (current: Members) => {
          if (cancelled) return
          const present = new Map<string, PlayerIdentity>()
          current.each(member => present.set(member.id, { ...member.info, id: member.id }))
          // This update is synchronous with the subscription snapshot. No HTTP
          // response, player-join broadcast, or artificial timer blocks the lanes.
          setMembers(present)
          connectedRef.current = false
          setConnectionStatus('syncing')
          roomDiagnostic('subscription_succeeded', { count: present.size })
          void resync()
        })
        channel.bind('pusher:member_added', (member: Member) => {
          if (cancelled) return
          setMembers(previous => new Map(previous).set(member.id, { ...member.info, id: member.id }))
          roomDiagnostic('member_added')
        })
        channel.bind('pusher:member_removed', (member: Member) => {
          if (cancelled) return
          setMembers(previous => { const next = new Map(previous); next.delete(member.id); return next })
          roomDiagnostic('member_removed')
        })
        channel.bind('pusher:subscription_error', () => {
          invalidate('error')
          if (!cancelled) setError('Could not authorize this room. Retry, or Leave to join another room.')
          // A closed room can no longer be subscribed, but its authenticated
          // snapshot still explains what happened without clearing the session.
          if (!cancelled) void resync(false)
        })
        channel.bind(RACE_EVENT, (next: RoomSnapshot) => {
          if (cancelled) return
          roomDiagnostic('race_event_received', { revision: next.revision, phase: next.phase })
          apply(next)
        })
      } catch (cause) {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : 'Could not connect to the room.')
          setConnectionStatus('error')
        }
      }
    }
    void connect()
    return () => {
      cancelled = true
      connectedRef.current = false
      snapshotRequest?.abort()
      applyRef.current = () => {}
      client?.unsubscribe(channelName)
      client?.disconnect()
      // Connection lifecycle only. No leave, no session deletion, no host election.
    }
  }, [session.roomCode, session.roomId, session.playerId, session.sessionToken, retryKey]) // eslint-disable-line react-hooks/exhaustive-deps

  const send = useCallback(async (command: RaceCommand) => {
    try {
      const current = sessionRef.current
      const { snapshot: next } = await fetch('/api/pusher', {
        method: 'POST',
        headers: { ...sessionHeaders(current), 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel: roomChannel(current.roomCode), ...command }),
      }).then(roomResponse<{ snapshot: RoomSnapshot }>)
      applyRef.current(next)
      setError('')
      return true
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not send race update.')
      return false
    }
  }, [])

  useEffect(() => {
    if (!snapshot?.raceStartedAt || snapshot.phase === 'finished' || snapshot.closed) return
    const tick = () => setClock(Date.now() + clockOffset.current)
    tick()
    // Display clock only: never polls the server for presence or race state.
    const timer = setInterval(tick, 250)
    return () => clearInterval(timer)
  }, [snapshot?.raceStartedAt, snapshot?.phase, snapshot?.closed])

  const timing = roomClock(snapshot, clock)
  useEffect(() => {
    if (!snapshot || snapshot.raceStartedAt === null || snapshot.phase === 'finished' ||
      snapshot.closed || connectionStatus !== 'connected') return
    // A single deadline command, scheduled from server time. A fresh snapshot
    // reschedules the boundary; no network interval and no client-elected winner.
    // Using remaining time at the server avoids firing early due to clock skew.
    const remaining = snapshot.raceStartedAt + snapshot.timeLimit * 1000 - snapshot.serverNow
    const deadline = setTimeout(() => { void send({ event: 'race-sync', data: {} }) }, Math.max(0, remaining))
    return () => clearTimeout(deadline)
  }, [snapshot, connectionStatus, send])

  const startRace = useCallback((timeLimit: number) => send({ event: 'race-start', data: { timeLimit } }), [send])
  const emitProgress = useCallback((progress: number, wpm: number) => {
    if (!connectedRef.current || snapshotRef.current?.closed) return
    const now = Date.now()
    if (now - lastProgress.current < PROGRESS_THROTTLE_MS) return
    lastProgress.current = now
    void send({ event: 'player-progress', data: { progress, wpm, sequence: ++sequence.current } })
  }, [send])
  const emitFinish = useCallback((wpm: number) => send({ event: 'player-finish', data: { wpm, sequence: ++sequence.current } }), [send])
  const leaveRoom = useCallback(async () => {
    try {
      const current = sessionRef.current
      await fetch(`/api/rooms/${current.roomCode}`, { method: 'DELETE', headers: sessionHeaders(current) }).then(roomResponse)
      return true
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not leave the room. Please retry.')
      return false
    }
  }, [])
  const retry = useCallback(() => setRetryKey(value => value + 1), [])

  return {
    state: {
      ...timing, players: reconcilePlayers(members, snapshot),
      winnerId: snapshot?.winnerId ?? null, timeLimit: snapshot?.timeLimit ?? 60,
      raceStartedAt: snapshot?.raceStartedAt ?? null, closed: snapshot?.closed ?? false,
    },
    isHost: snapshot?.hostId === session.playerId,
    hasSnapshot: snapshot !== null,
    connectionStatus, error, retry, emitProgress, emitFinish, startRace, leaveRoom,
  }
}
