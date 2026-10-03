import { createHash, randomBytes, randomInt, randomUUID, timingSafeEqual } from 'node:crypto'
import {
  MAX_PLAYERS, PLAYER_COLOR_IDS, ROOM_CODE_PATTERN,
  type ActiveRoomSession, type RaceCommand, type RoomPlayer, type RoomSnapshot,
} from '@/lib/multiplayer/types'
import { getRoomStore, ROOM_TTL_SECONDS, type RoomRecord, type RoomStore } from './room-store'

export class RoomError extends Error {
  constructor(message: string, public status = 400) { super(message) }
}

export interface RoomCredentials { playerId: string; token: string }
const hash = (token: string) => createHash('sha256').update(token).digest('hex')

function validateCode(code: string) {
  if (!ROOM_CODE_PATTERN.test(code)) throw new RoomError('Enter a valid 4-digit code')
}

function authorize(room: RoomRecord, credentials: RoomCredentials, allowLeft = false) {
  const member = room.members[credentials.playerId]
  const expected = member ? Buffer.from(member.tokenHash, 'hex') : Buffer.alloc(32)
  const actual = Buffer.from(hash(credentials.token), 'hex')
  const validToken = actual.length === expected.length && timingSafeEqual(expected, actual)
  if (!member || !validToken || (!allowLeft && !member.active)) {
    throw new RoomError('This room session is no longer valid. Leave to join again.', 403)
  }
}

function advanceClock(room: RoomRecord, now: number) {
  if (room.raceStartedAt === null || room.phase === 'finished') return
  if (now < room.raceStartedAt) {
    room.phase = 'countdown'
  } else if (now < room.raceStartedAt + room.timeLimit * 1000) {
    room.phase = 'racing'
  } else {
    room.phase = 'finished'
    room.winnerId ??= [...room.players].filter(p => !p.withdrawn)
      .sort((a, b) => b.wpm - a.wpm || b.progress - a.progress || a.id.localeCompare(b.id))[0]?.id ?? null
  }
}

export function snapshotOf(record: RoomRecord, now = Date.now()): RoomSnapshot {
  const room = { ...record }
  advanceClock(room, now)
  return {
    roomCode: room.roomCode, roomId: room.roomId, revision: room.revision,
    hostId: room.hostId, phase: room.phase,
    countdown: room.phase === 'countdown' ? Math.max(0, Math.ceil((room.raceStartedAt! - now) / 1000)) : 0,
    timeLimit: room.timeLimit, raceStartedAt: room.raceStartedAt,
    winnerId: room.winnerId, players: room.players.map(p => ({ ...p })),
    closed: room.closed, serverNow: now,
  }
}

export class RoomAuthority {
  constructor(private store: RoomStore, private now = Date.now) {}

  private async read(code: string) {
    validateCode(code)
    const room = await this.store.get(code)
    if (!room) throw new RoomError('Room not found or expired. Leave to join another room.', 404)
    return room
  }

  private async update(code: string, change: (room: RoomRecord) => void) {
    // Retry conflicting CAS operations, never independent read/modify/write.
    for (let attempt = 0; attempt < 20; attempt++) {
      const previous = await this.read(code)
      const next = structuredClone(previous)
      advanceClock(next, this.now())
      change(next)
      next.revision++
      next.expiresAt = this.now() + ROOM_TTL_SECONDS * 1000
      if (await this.store.compareAndSet(code, previous, next)) return snapshotOf(next, this.now())
    }
    throw new RoomError('Room is busy. Please try again.', 409)
  }

  async enter(name: unknown, color: unknown, joinCode?: unknown) {
    if (typeof name !== 'string' || !name.trim() || name.trim().length > 24) throw new RoomError('Invalid player name')
    if (typeof color !== 'string' || !PLAYER_COLOR_IDS.includes(color)) throw new RoomError('Invalid player color')
    if (joinCode !== undefined && (typeof joinCode !== 'string' || !ROOM_CODE_PATTERN.test(joinCode))) {
      throw new RoomError('Enter a valid 4-digit code')
    }
    const player: RoomPlayer = {
      id: randomUUID(), name: name.trim(), color, progress: 0, wpm: 0, finished: false, sequence: 0,
    }
    const token = randomBytes(32).toString('hex')
    const membership = { tokenHash: hash(token), active: true }
    let snapshot: RoomSnapshot | undefined
    if (typeof joinCode === 'string') {
      snapshot = await this.update(joinCode, room => {
        if (room.closed) throw new RoomError('The host ended this room.', 410)
        if (room.phase !== 'waiting') throw new RoomError('This race has already started.', 409)
        if (Object.values(room.members).filter(m => m.active).length >= MAX_PLAYERS) {
          throw new RoomError('This room is full (5 players maximum).', 409)
        }
        room.members[player.id] = membership
        room.players.push(player)
      })
    } else {
      for (let attempt = 0; attempt < 30 && !snapshot; attempt++) {
        const room: RoomRecord = {
          roomCode: String(randomInt(1000, 10000)), roomId: randomUUID(), revision: 1,
          hostId: player.id, phase: 'waiting', timeLimit: 60, raceStartedAt: null, winnerId: null,
          closed: false, expiresAt: this.now() + ROOM_TTL_SECONDS * 1000,
          members: { [player.id]: membership }, players: [player],
        }
        if (await this.store.compareAndSet(room.roomCode, null, room)) snapshot = snapshotOf(room, this.now())
      }
    }
    if (!snapshot) throw new RoomError('Could not allocate a room. Please try again.', 503)
    const session: ActiveRoomSession = {
      roomCode: snapshot.roomCode, roomId: snapshot.roomId, playerId: player.id,
      playerName: player.name, playerColor: player.color, isHost: snapshot.hostId === player.id,
      sessionToken: token,
    }
    return { session, snapshot }
  }

  async snapshot(code: string, credentials: RoomCredentials) {
    for (let attempt = 0; attempt < 20; attempt++) {
      const previous = await this.read(code)
      authorize(previous, credentials)
      const now = this.now()
      const next = structuredClone(previous)
      advanceClock(next, now)
      if (next.phase !== previous.phase || next.winnerId !== previous.winnerId) {
        next.revision++
        next.expiresAt = now + ROOM_TTL_SECONDS * 1000
        if (!await this.store.compareAndSet(code, previous, next)) continue
        return snapshotOf(next, now)
      }
      return snapshotOf(previous, now)
    }
    throw new RoomError('Room is busy. Please try again.', 409)
  }

  async presenceIdentity(code: string, credentials: RoomCredentials) {
    const room = await this.read(code)
    authorize(room, credentials)
    if (room.closed) throw new RoomError('The host ended this room.', 410)
    if (Object.values(room.members).filter(m => m.active).length > MAX_PLAYERS) throw new RoomError('Room is full', 409)
    const player = room.players.find(p => p.id === credentials.playerId)
    if (!player || player.withdrawn) throw new RoomError('Player is not admitted to this room', 403)
    return { id: player.id, name: player.name, color: player.color }
  }

  async command(code: string, credentials: RoomCredentials, command: RaceCommand, presentIds?: string[]) {
    return this.update(code, room => {
      authorize(room, credentials)
      if (room.closed) throw new RoomError('The host ended this room.', 410)
      if (command.event === 'race-start') {
        if (room.hostId !== credentials.playerId) throw new RoomError('Only the host can start the race', 403)
        if (![30, 60, 90, 120].includes(command.data.timeLimit)) throw new RoomError('Invalid time limit')
        if (room.phase !== 'waiting') return // duplicate start cannot reset the race clock
        const ready = room.players.filter(p => room.members[p.id]?.active && presentIds?.includes(p.id))
        if (ready.length < 2 || !ready.some(p => p.id === room.hostId)) throw new RoomError('Wait for at least two connected players', 409)
        // An admitted player may be refreshing right now. Losing a socket must
        // never revoke their seat or turn a reconnect into an intentional leave.
        room.phase = 'countdown'
        room.raceStartedAt = this.now() + 3_000
        room.timeLimit = command.data.timeLimit
        return
      }
      if (command.event === 'race-sync') return
      const player = room.players.find(p => p.id === credentials.playerId)
      if (!player || player.withdrawn) throw new RoomError('Player is not participating', 403)
      const { sequence, wpm } = command.data
      if (!Number.isSafeInteger(sequence) || sequence < 1 || !Number.isFinite(wpm) || wpm < 0 || wpm > 400) {
        throw new RoomError('Invalid race update')
      }
      if (command.event === 'player-progress' && (!Number.isFinite(command.data.progress) || command.data.progress < 0 || command.data.progress > 1)) {
        throw new RoomError('Invalid progress')
      }
      if (room.phase !== 'racing' || player.finished || sequence <= player.sequence) return
      if (command.event === 'player-progress' && command.data.progress < player.progress) return
      player.sequence = sequence
      player.wpm = wpm
      player.lastSeenAt = this.now()
      if (command.event === 'player-progress') {
        player.progress = Math.max(player.progress, command.data.progress)
      } else {
        player.finished = true
        player.progress = 1
        room.winnerId ??= player.id
        if (room.players.every(p => p.finished || p.withdrawn)) room.phase = 'finished'
      }
    })
  }

  async leave(code: string, credentials: RoomCredentials) {
    return this.update(code, room => {
      authorize(room, credentials, true)
      room.members[credentials.playerId].active = false
      if (room.hostId === credentials.playerId) room.closed = true
      if (room.phase === 'waiting') room.players = room.players.filter(p => p.id !== credentials.playerId)
      else {
        const player = room.players.find(p => p.id === credentials.playerId)
        if (player) player.withdrawn = true
        if (room.players.every(p => p.finished || p.withdrawn)) room.phase = 'finished'
      }
    })
  }
}

export const roomAuthority = () => new RoomAuthority(getRoomStore())
