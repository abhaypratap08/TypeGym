import { NextRequest, NextResponse } from 'next/server'
import { RoomError, type RoomCredentials } from './room-authority'
import type { RaceCommand } from '@/lib/multiplayer/types'
import { RoomStoreConfigurationError } from './room-store'

export function json(value: unknown, status = 200) {
  return NextResponse.json(value, { status, headers: { 'Cache-Control': 'no-store' } })
}

export function failure(error: unknown) {
  // Do not leak provider URLs, credentials or upstream error bodies.
  if (error instanceof RoomStoreConfigurationError) return json({ error: error.message }, 503)
  return error instanceof RoomError
    ? json({ error: error.message }, error.status)
    : json({ error: 'Room service unavailable. Please retry.' }, 503)
}

export function credentials(req: NextRequest): RoomCredentials {
  const playerId = req.headers.get('x-typegym-player') ?? ''
  const token = req.headers.get('authorization')?.replace(/^Bearer /, '') ?? ''
  if (!/^[a-f0-9-]{36}$/.test(playerId) || !/^[a-f0-9]{64}$/.test(token)) throw new RoomError('Invalid player session', 401)
  return { playerId, token }
}

export async function readBody(req: NextRequest) {
  const raw = await req.text()
  if (raw.length > 12_000) throw new RoomError('Body too large', 413)
  try {
    const body: unknown = JSON.parse(raw)
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error()
    return body as Record<string, unknown>
  } catch { throw new RoomError('Invalid JSON body') }
}

export function raceCommand(event: unknown, data: unknown): RaceCommand {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new RoomError('Invalid race payload')
  const values = data as Record<string, unknown>
  switch (event) {
    case 'race-start':
      if (typeof values.timeLimit === 'number') return { event, data: { timeLimit: values.timeLimit } }
      break
    case 'player-progress':
      if (typeof values.progress === 'number' && typeof values.wpm === 'number' && typeof values.sequence === 'number') {
        return { event, data: { progress: values.progress, wpm: values.wpm, sequence: values.sequence } }
      }
      break
    case 'player-finish':
      if (typeof values.wpm === 'number' && typeof values.sequence === 'number') return { event, data: { wpm: values.wpm, sequence: values.sequence } }
      break
    case 'race-sync': return { event, data: {} }
  }
  throw new RoomError('Invalid race event')
}
