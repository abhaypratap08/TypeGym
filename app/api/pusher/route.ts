import Pusher from 'pusher'
import { NextRequest, NextResponse } from 'next/server'

const MAX_BODY_BYTES = 12_000

// Simple in-memory rate limiter: 30 requests per 10 seconds per IP
const ratemap = new Map<string, { count: number; reset: number }>()
function isRateLimited(ip: string): boolean {
  const now = Date.now()
  const entry = ratemap.get(ip)
  if (!entry || now > entry.reset) {
    ratemap.set(ip, { count: 1, reset: now + 10_000 })
    return false
  }
  if (entry.count >= 30) return true
  entry.count++
  return false
}

const ALLOWED_EVENTS = new Set([
  'player-join',
  'player-progress',
  'player-finish',
  'race-start',
])

function isRoomChannel(channel: unknown): channel is string {
  return typeof channel === 'string' && /^room-\d{4}$/.test(channel)
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function badRequest(message: string) {
  return NextResponse.json({ ok: false, error: message }, { status: 400 })
}

function validateEventPayload(event: string, data: unknown): string | null {
  switch (event) {
    case 'race-start':
      if (!isPlainObject(data)) return null
      if ('timeLimit' in data) {
        const tl = data.timeLimit
        if (typeof tl !== 'number' || !Number.isFinite(tl) || tl < 10 || tl > 300) return 'invalid timeLimit'
      }
      return null

    case 'player-join': {
      if (!isPlainObject(data)) return 'player-join data must be an object'
      const { id, name, color, progress, wpm, finished } = data
      if (typeof id !== 'string' || id.length < 1 || id.length > 64) return 'invalid id'
      if (typeof name !== 'string' || name.length < 1 || name.length > 24) return 'invalid name'
      if (typeof color !== 'string' || color.length > 32) return 'invalid color'
      if (typeof progress !== 'number' || progress < 0 || progress > 1) return 'invalid progress'
      if (typeof wpm !== 'number' || !Number.isFinite(wpm) || wpm < 0 || wpm > 400) return 'invalid wpm'
      if (typeof finished !== 'boolean') return 'invalid finished'
      return null
    }

    case 'player-progress': {
      if (!isPlainObject(data)) return 'player-progress data must be an object'
      const { id, progress, wpm } = data
      if (typeof id !== 'string' || id.length < 1 || id.length > 64) return 'invalid id'
      if (typeof progress !== 'number' || progress < 0 || progress > 1) return 'invalid progress'
      if (typeof wpm !== 'number' || !Number.isFinite(wpm) || wpm < 0 || wpm > 400) return 'invalid wpm'
      return null
    }

    case 'player-finish': {
      if (!isPlainObject(data)) return 'player-finish data must be an object'
      const { id, wpm } = data
      if (typeof id !== 'string' || id.length < 1 || id.length > 64) return 'invalid id'
      if (typeof wpm !== 'number' || !Number.isFinite(wpm) || wpm < 0 || wpm > 400) return 'invalid wpm'
      return null
    }

    default:
      return 'unsupported event'
  }
}

let pusherSingleton: Pusher | null = null

function getPusher(): Pusher | null {
  const appId   = process.env.PUSHER_APP_ID
  const key     = process.env.NEXT_PUBLIC_PUSHER_KEY
  const secret  = process.env.PUSHER_SECRET
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER
  if (!appId || !key || !secret || !cluster) return null
  if (!pusherSingleton) {
    pusherSingleton = new Pusher({ appId, key, secret, cluster, useTLS: true })
  }
  return pusherSingleton
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  if (isRateLimited(ip)) {
    return NextResponse.json({ ok: false, error: 'Too many requests' }, { status: 429 })
  }

  const triggerSecret = process.env.TYPEGYM_PUSHER_TRIGGER_SECRET
  if (triggerSecret) {
    const sent = req.headers.get('x-typegym-pusher-trigger') ?? ''
    if (sent !== triggerSecret) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }
  }

  const raw = await req.text()
  if (raw.length > MAX_BODY_BYTES) {
    return NextResponse.json({ ok: false, error: 'Body too large' }, { status: 413 })
  }

  let body: unknown
  try {
    body = JSON.parse(raw) as unknown
  } catch {
    return badRequest('Invalid JSON')
  }

  if (!isPlainObject(body)) return badRequest('Body must be a JSON object')

  const channel = body.channel
  const event   = body.event
  const data    = 'data' in body ? body.data : undefined

  if (!isRoomChannel(channel)) return badRequest('Invalid channel')
  if (typeof event !== 'string' || !ALLOWED_EVENTS.has(event)) return badRequest('Invalid event')

  const payloadError = validateEventPayload(event, data)
  if (payloadError) return badRequest(payloadError)

  const pusher = getPusher()
  if (!pusher) {
    return NextResponse.json({ ok: false, error: 'Pusher is not configured' }, { status: 503 })
  }

  try {
    await pusher.trigger(channel, event, data ?? {})
    return NextResponse.json({ ok: true })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Trigger failed'
    return NextResponse.json({ ok: false, error: message }, { status: 502 })
  }
}
