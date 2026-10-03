export type RoomPhase = 'waiting' | 'countdown' | 'racing' | 'finished'

export interface PlayerIdentity {
  id: string
  name: string
  color: string
}

export interface RoomPlayer extends PlayerIdentity {
  progress: number
  wpm: number
  finished: boolean
  sequence: number
  lastSeenAt?: number
  withdrawn?: boolean
  connected?: boolean
}

export interface RoomSnapshot {
  roomCode: string
  roomId: string
  revision: number
  hostId: string
  phase: RoomPhase
  countdown: number
  timeLimit: number
  raceStartedAt: number | null
  winnerId: string | null
  players: RoomPlayer[]
  closed: boolean
  serverNow: number
}

export interface ActiveRoomSession {
  roomCode: string
  roomId: string
  playerId: string
  playerName: string
  playerColor: string
  isHost: boolean
  // Per-player, per-room bearer credential, issued by the server. Never broadcast.
  sessionToken: string
}

export type RaceCommand =
  | { event: 'race-start'; data: { timeLimit: number } }
  | { event: 'player-progress'; data: { progress: number; wpm: number; sequence: number } }
  | { event: 'player-finish'; data: { wpm: number; sequence: number } }
  | { event: 'race-sync'; data: Record<string, never> }

export const MAX_PLAYERS = 5
export const PLAYER_COLOR_IDS = ['teal', 'lavender', 'coral', 'amber', 'sage']
export const ROOM_CODE_PATTERN = /^\d{4}$/
export const PRESENCE_CHANNEL_PATTERN = /^presence-room-(\d{4})$/
export const RACE_EVENT = 'room-state'

export function roomChannel(roomCode: string) {
  return `presence-room-${roomCode}`
}
