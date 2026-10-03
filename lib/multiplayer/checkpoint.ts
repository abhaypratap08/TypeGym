import type { CustomRaceCheckpoint } from '@/hooks/useTypingEngine'
import type { ActiveRoomSession } from './types'

const KEY = 'tg-race-input'

export function loadRaceInput(session: ActiveRoomSession, words: string[]): CustomRaceCheckpoint | null {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return null
    const saved = JSON.parse(raw)
    if (saved.roomId !== session.roomId || saved.playerId !== session.playerId) return null
    const value = saved.input as CustomRaceCheckpoint
    if (!value || !['idle', 'active', 'finished'].includes(value.phase) ||
      typeof value.currentInput !== 'string' || value.currentInput.length > 100 ||
      !Number.isFinite(value.elapsed) || value.elapsed < 0 ||
      (value.startedAt !== null && (!Number.isFinite(value.startedAt) || value.startedAt > Date.now())) ||
      (value.phase === 'active' && value.startedAt === null) ||
      !Array.isArray(value.wordResults) || value.wordResults.length > words.length ||
      !value.wordResults.every((result, index) => result?.word === words[index] &&
        typeof result.typed === 'string' && result.typed.length <= 100)) return null
    return value
  } catch { return null }
}

export function saveRaceInput(session: ActiveRoomSession, input: CustomRaceCheckpoint) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ roomId: session.roomId, playerId: session.playerId, input }))
  } catch { /* The authoritative race remains recoverable if local storage fills. */ }
}
