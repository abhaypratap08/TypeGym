import type { RoomPlayer, RoomPhase } from '@/lib/multiplayer/types'

export interface RoomRecord {
  roomCode: string
  roomId: string
  revision: number
  hostId: string
  phase: RoomPhase
  timeLimit: number
  raceStartedAt: number | null
  winnerId: string | null
  closed: boolean
  expiresAt: number
  members: Record<string, { tokenHash: string; active: boolean }>
  players: RoomPlayer[]
}

export interface RoomStore {
  get(code: string): Promise<RoomRecord | null>
  compareAndSet(code: string, previous: RoomRecord | null, next: RoomRecord): Promise<boolean>
}

export const ROOM_TTL_SECONDS = 24 * 60 * 60
export class RoomStoreConfigurationError extends Error {}

// Development only: one Next.js process, retained across hot reloads. Production
// must use shared storage: a module-level Map is NOT an authority on Vercel.
export class MemoryRoomStore implements RoomStore {
  private rooms = new Map<string, string>()

  async get(code: string) {
    const raw = this.rooms.get(code)
    if (!raw) return null
    const room = JSON.parse(raw) as RoomRecord
    if (room.expiresAt <= Date.now()) {
      this.rooms.delete(code)
      return null
    }
    return room
  }

  async compareAndSet(code: string, previous: RoomRecord | null, next: RoomRecord) {
    const raw = this.rooms.get(code)
    const current = raw ? JSON.parse(raw) as RoomRecord : null
    const live = current && current.expiresAt > Date.now() ? current : null
    if (previous === null ? live !== null :
      !live || live.roomId !== previous.roomId || live.revision !== previous.revision) return false
    this.rooms.set(code, JSON.stringify(next))
    return true
  }
}

// Atomic admission and writes across serverless workers. Compare both room epoch
// and revision so an expired/reused 4-digit code cannot accept an old write.
const CAS_SCRIPT = `
local raw = redis.call('GET', KEYS[1])
if ARGV[1] == '' then
  if raw then return 0 end
else
  if not raw then return 0 end
  local room = cjson.decode(raw)
  if room.roomId ~= ARGV[1] or tostring(room.revision) ~= ARGV[2] then return 0 end
end
redis.call('SET', KEYS[1], ARGV[3], 'EX', ARGV[4])
return 1
`

export class RedisRoomStore implements RoomStore {
  constructor(private url: string, private token: string) {}

  private async command(args: (string | number)[]) {
    const response = await fetch(this.url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(args),
      cache: 'no-store',
      signal: AbortSignal.timeout(8_000),
    })
    if (!response.ok) throw new Error('Room storage unavailable')
    const payload = await response.json() as { result: unknown; error?: string }
    if (payload.error) throw new Error('Room storage unavailable')
    return payload.result
  }

  async get(code: string) {
    const raw = await this.command(['GET', `typegym:room:${code}`])
    return typeof raw === 'string' ? JSON.parse(raw) as RoomRecord : null
  }

  async compareAndSet(code: string, previous: RoomRecord | null, next: RoomRecord) {
    return await this.command([
      'EVAL', CAS_SCRIPT, 1, `typegym:room:${code}`,
      previous?.roomId ?? '', String(previous?.revision ?? ''),
      JSON.stringify(next), String(ROOM_TTL_SECONDS),
    ]) === 1
  }
}

const globalStore = globalThis as typeof globalThis & { typegymRoomStore?: MemoryRoomStore }

export function getRoomStore(): RoomStore {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN
  if (url && token) return new RedisRoomStore(url, token)
  if (process.env.NODE_ENV === 'production') {
    throw new RoomStoreConfigurationError('Shared room storage is not configured. Set the Upstash Redis REST URL and token on the server.')
  }
  return globalStore.typegymRoomStore ??= new MemoryRoomStore()
}
