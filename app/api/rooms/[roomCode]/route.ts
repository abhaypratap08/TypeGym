import { NextRequest } from 'next/server'
import { roomAuthority, RoomError } from '@/lib/server/room-authority'
import { credentials, failure, json } from '@/lib/server/room-http'
import { publishSnapshot } from '@/lib/server/pusher'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
type Context = { params: Promise<{ roomCode: string }> }

export async function GET(req: NextRequest, context: Context) {
  try {
    const { roomCode } = await context.params
    return json({ snapshot: await roomAuthority().snapshot(roomCode, credentials(req)) })
  } catch (error) { return failure(error) }
}

// Only an explicit Leave calls DELETE. Unmount/disconnect never touches authority.
export async function DELETE(req: NextRequest, context: Context) {
  try {
    const { roomCode } = await context.params
    const snapshot = await roomAuthority().leave(roomCode, credentials(req))
    // The authority write is the intentional leave. A provider outage must not
    // strand the client with a session it explicitly asked to clear.
    try { await publishSnapshot(snapshot) } catch {}
    return json({ snapshot })
  } catch (error) {
    if (error instanceof RoomError && [403, 404, 410].includes(error.status)) return json({ left: true })
    return failure(error)
  }
}
