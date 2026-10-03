import { PLAYER_COLOR_IDS, ROOM_CODE_PATTERN, type ActiveRoomSession } from './types'

export const ACTIVE_ROOM_KEY = 'tg-active-room'

export function roomDiagnostic(event: string, details: Record<string, unknown> = {}) {
  if (process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_ROOM_DEBUG === '1') {
    // Lifecycle metadata only. Never log player names, tokens, or auth payloads.
    console.debug(`[room] ${event}`, details)
  }
}

export function loadActiveSession(): ActiveRoomSession | null {
  const raw = sessionStorage.getItem(ACTIVE_ROOM_KEY)
  if (!raw) return null
  try {
    const value = JSON.parse(raw) as ActiveRoomSession
    if (!value || typeof value.roomCode !== 'string' || !ROOM_CODE_PATTERN.test(value.roomCode) ||
      typeof value.roomId !== 'string' || !/^[a-f0-9-]{36}$/.test(value.roomId) ||
      typeof value.playerId !== 'string' || !/^[a-f0-9-]{36}$/.test(value.playerId) ||
      typeof value.playerName !== 'string' || !value.playerName.trim() || value.playerName.length > 24 ||
      typeof value.playerColor !== 'string' || !PLAYER_COLOR_IDS.includes(value.playerColor) || typeof value.isHost !== 'boolean' ||
      typeof value.sessionToken !== 'string' || !/^[a-f0-9]{64}$/.test(value.sessionToken)) return null
    roomDiagnostic('session_restored')
    return value
  } catch { return null }
}

export function saveActiveSession(session: ActiveRoomSession) {
  sessionStorage.setItem(ACTIVE_ROOM_KEY, JSON.stringify(session))
}

export function clearActiveSession() {
  sessionStorage.removeItem(ACTIVE_ROOM_KEY)
  sessionStorage.removeItem('tg-race-input')
  roomDiagnostic('session_cleared')
}

export class RoomRequestError extends Error {
  constructor(message: string, public status: number) { super(message) }
}

export function sessionHeaders(session: ActiveRoomSession) {
  return { Authorization: `Bearer ${session.sessionToken}`, 'x-typegym-player': session.playerId }
}

export async function roomResponse<T>(response: Response): Promise<T> {
  const body = await response.json()
  if (!response.ok) {
    throw new RoomRequestError(typeof body.error === 'string' ? body.error : 'Room request failed. Please retry.', response.status)
  }
  return body as T
}
