import { NextRequest } from 'next/server'
import { PRESENCE_CHANNEL_PATTERN } from '@/lib/multiplayer/types'
import { roomAuthority, RoomError } from '@/lib/server/room-authority'
import { credentials, failure, json } from '@/lib/server/room-http'
import { getPusher } from '@/lib/server/pusher'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const identity = credentials(req)
    const raw = await req.text()
    if (raw.length > 2_000) throw new RoomError('Body too large', 413)
    const body = new URLSearchParams(raw)
    const channel = body.get('channel_name') ?? ''
    const socketId = body.get('socket_id') ?? ''
    const roomCode = PRESENCE_CHANNEL_PATTERN.exec(channel)?.[1]
    if (!roomCode || !/^\d+\.\d+$/.test(socketId)) throw new RoomError('Invalid presence subscription')
    const player = await roomAuthority().presenceIdentity(roomCode, identity)
    return json(getPusher().authorizeChannel(socketId, channel, { user_id: player.id, user_info: player }))
  } catch (error) { return failure(error) }
}
