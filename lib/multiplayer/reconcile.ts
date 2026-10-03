import type { PlayerIdentity, RoomPlayer, RoomSnapshot } from './types'

// Presence owns identity/online status. The race snapshot owns statistics and
// preserves offline participants so a disconnect never silently removes a racer.
export function reconcilePlayers(members: Map<string, PlayerIdentity>, snapshot: RoomSnapshot | null): RoomPlayer[] {
  const stats = new Map(snapshot?.players.map(player => [player.id, player]))
  if (snapshot && snapshot.phase !== 'waiting') {
    return snapshot.players.map(player => ({
      ...player, ...members.get(player.id), connected: members.has(player.id) && !player.withdrawn,
    }))
  }
  return [...members.values()].map(identity => ({
    progress: 0, wpm: 0, finished: false, sequence: 0,
    ...stats.get(identity.id), ...identity, connected: true,
  }))
}

export function roomClock(snapshot: RoomSnapshot | null, now: number) {
  if (!snapshot) return { phase: 'waiting' as const, countdown: 0, timeLeft: 60 }
  const start = snapshot.raceStartedAt
  if (snapshot.phase === 'finished') return { phase: snapshot.phase, countdown: 0, timeLeft: 0 }
  if (start === null) return { phase: snapshot.phase, countdown: 0, timeLeft: snapshot.timeLimit }
  if (now < start) return { phase: 'countdown' as const, countdown: Math.ceil((start - now) / 1000), timeLeft: snapshot.timeLimit }
  // At the deadline the server decides the winner; the client never elects one.
  return { phase: 'racing' as const, countdown: 0, timeLeft: Math.max(0, Math.ceil((start + snapshot.timeLimit * 1000 - now) / 1000)) }
}
