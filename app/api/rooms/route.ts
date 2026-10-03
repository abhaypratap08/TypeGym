import { NextRequest } from 'next/server'
import { roomAuthority, RoomError } from '@/lib/server/room-authority'
import { failure, json, readBody } from '@/lib/server/room-http'
import { getPusher } from '@/lib/server/pusher'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const body = await readBody(req)
    if (body.action !== 'create' && body.action !== 'join') throw new RoomError('Invalid room action')
    if (body.action === 'join' && typeof body.roomCode !== 'string') throw new RoomError('Room code is required')
    getPusher()
    return json(await roomAuthority().enter(body.name, body.color, body.action === 'join' ? body.roomCode : undefined))
  } catch (error) { return failure(error) }
}
