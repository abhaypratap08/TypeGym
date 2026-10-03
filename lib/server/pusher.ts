import Pusher from 'pusher'
import { RACE_EVENT, roomChannel, type RoomSnapshot } from '@/lib/multiplayer/types'
import { RoomError } from './room-authority'

let singleton: Pusher | undefined

export function getPusher() {
  const appId = process.env.PUSHER_APP_ID
  const key = process.env.NEXT_PUBLIC_PUSHER_KEY
  const secret = process.env.PUSHER_SECRET
  const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER
  if (!appId || !key || !secret || !cluster) throw new RoomError('Pusher is not configured', 503)
  return singleton ??= new Pusher({ appId, key, secret, cluster, useTLS: true, timeout: 8_000 })
}

export async function presentPlayerIds(code: string) {
  const response = await getPusher().get({ path: `/channels/${roomChannel(code)}/users` })
  if (!response.ok) throw new RoomError('Pusher presence is unavailable', 503)
  const body = await response.json() as { users: { id: string }[] }
  return body.users.map(user => user.id)
}

export async function publishSnapshot(snapshot: RoomSnapshot) {
  // Five players fit comfortably under Pusher's 10 KB event limit. Publishing the
  // committed projection makes duplicate/out-of-order events harmless and avoids
  // race-state reconstruction from a missing sequence of deltas.
  await getPusher().trigger(roomChannel(snapshot.roomCode), RACE_EVENT, snapshot)
}
