import { NextRequest } from 'next/server'
import { PRESENCE_CHANNEL_PATTERN } from '@/lib/multiplayer/types'
import { roomAuthority, RoomError } from '@/lib/server/room-authority'
import { credentials, failure, json, raceCommand, readBody } from '@/lib/server/room-http'
import { getPusher, presentPlayerIds, publishSnapshot } from '@/lib/server/pusher'

export const runtime = 'nodejs'

// Client commands are authenticated, applied atomically, then published by the
// server. Neither client-supplied identity nor host flags are trusted.
export async function POST(req: NextRequest) {
  try {
    const identity = credentials(req)
    const body = await readBody(req)
    const code = typeof body.channel === 'string' ? PRESENCE_CHANNEL_PATTERN.exec(body.channel)?.[1] : undefined
    if (!code) throw new RoomError('Invalid channel')
    const command = raceCommand(body.event, body.data)
    getPusher()
    const authority = roomAuthority()
    // Authenticate before making provider calls, including presence lookups.
    await authority.snapshot(code, identity)
    const presentIds = command.event === 'race-start' ? await presentPlayerIds(code) : undefined
    const snapshot = await authority.command(code, identity, command, presentIds)
    await publishSnapshot(snapshot)
    return json({ snapshot })
  } catch (error) { return failure(error) }
}
