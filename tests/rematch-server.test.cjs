'use strict'

const assert = require('node:assert/strict')
const fs = require('node:fs')
const Module = require('node:module')
const path = require('node:path')
const test = require('node:test')
const ts = require('typescript')

const root = path.join(__dirname, '..')
const originalTsExtension = Module._extensions['.ts']
const originalLoad = Module._load

Module._extensions['.ts'] = function compileTypeScript(module, filename) {
  const source = fs.readFileSync(filename, 'utf8')
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText
  module._compile(output, filename)
}

Module._load = function loadWithProjectAlias(request, parent, isMain) {
  const resolved = request.startsWith('@/') ? path.join(root, request.slice(2)) : request
  return originalLoad.call(this, resolved, parent, isMain)
}

const { RoomAuthority, RoomError } = require(path.join(root, 'lib/server/room-authority.ts'))
const { MemoryRoomStore } = require(path.join(root, 'lib/server/room-store.ts'))
const { seededWordList } = require(path.join(root, 'lib/seededRandom.ts'))
const { WORDS_LIST } = require(path.join(root, 'lib/datasets.ts'))

function setup() {
  let now = Date.now()
  const store = new MemoryRoomStore()
  const authority = new RoomAuthority(store, () => now)
  return {
    authority,
    store,
    get now() { return now },
    set now(value) { now = value },
  }
}

async function createRace(players = 3) {
  const context = setup()
  const host = await context.authority.enter('Host', 'teal')
  const guests = []
  for (let index = 1; index < players; index++) {
    guests.push(await context.authority.enter(`Guest ${index}`, ['lavender', 'coral'][index - 1], host.session.roomCode))
  }
  const ids = [host.session.playerId, ...guests.map(guest => guest.session.playerId)]
  await context.authority.command(
    host.session.roomCode,
    { playerId: host.session.playerId, token: host.session.sessionToken },
    { event: 'race-start', data: { timeLimit: 30 } },
    ids,
  )
  context.now += 33_001
  await context.authority.snapshot(host.session.roomCode, {
    playerId: host.session.playerId,
    token: host.session.sessionToken,
  })
  return {
    authority: context.authority,
    store: context.store,
    get now() { return context.now },
    set now(value) { context.now = value },
    host,
    guests,
    ids,
  }
}

function credentials(session) {
  return { playerId: session.playerId, token: session.sessionToken }
}

test('host rematch increments the round, resets race state, and prunes left players', async () => {
  const context = await createRace()
  const { authority, host, guests } = context
  const roomCode = host.session.roomCode

  await authority.leave(roomCode, credentials(guests[0].session))
  const before = await context.store.get(roomCode)
  assert.equal(before.players.find(player => player.id === guests[0].session.playerId).withdrawn, true)

  const rematch = await authority.command(
    roomCode,
    credentials(host.session),
    { event: 'race-rematch', data: { round: 0 } },
    [host.session.playerId, guests[1].session.playerId],
  )

  assert.equal(rematch.phase, 'waiting')
  assert.equal(rematch.round, 1)
  assert.equal(rematch.raceStartedAt, null)
  assert.equal(rematch.winnerId, null)
  assert.equal(rematch.timeLimit, 30)
  assert.deepEqual(rematch.players.map(player => player.id), [host.session.playerId, guests[1].session.playerId])
  assert.equal(rematch.players[1].color, 'coral')
  assert.ok(rematch.players.every(player =>
    player.progress === 0 && player.wpm === 0 && !player.finished && player.sequence === 0 && !player.withdrawn,
  ))
  assert.equal((await context.store.get(roomCode)).members[guests[0].session.playerId], undefined)
})

test('rematch requires the authenticated host, is finished-only, and is idempotent while waiting', async () => {
  const inProgress = setup()
  const inProgressHost = await inProgress.authority.enter('Host', 'teal')
  const inProgressGuest = await inProgress.authority.enter('Guest', 'lavender', inProgressHost.session.roomCode)
  await inProgress.authority.command(
    inProgressHost.session.roomCode,
    credentials(inProgressHost.session),
    { event: 'race-start', data: { timeLimit: 30 } },
    [inProgressHost.session.playerId, inProgressGuest.session.playerId],
  )
  await assert.rejects(
    inProgress.authority.command(
      inProgressHost.session.roomCode,
      credentials(inProgressHost.session),
      { event: 'race-rematch', data: { round: 0 } },
      [inProgressHost.session.playerId, inProgressGuest.session.playerId],
    ),
    error => error instanceof RoomError && error.status === 409,
  )

  const context = await createRace(2)
  const { authority, host, guests } = context
  const roomCode = host.session.roomCode

  await assert.rejects(
    authority.command(roomCode, credentials(guests[0].session), { event: 'race-rematch', data: {} }, [host.session.playerId, guests[0].session.playerId]),
    error => error instanceof RoomError && error.status === 403,
  )

  const first = await authority.command(roomCode, credentials(host.session), { event: 'race-rematch', data: { round: 0 } }, [host.session.playerId, guests[0].session.playerId])
  const storedFirst = await context.store.get(roomCode)
  context.now += 1_000
  const second = await authority.command(roomCode, credentials(host.session), { event: 'race-rematch', data: { round: 0 } }, [host.session.playerId, guests[0].session.playerId])
  const storedSecond = await context.store.get(roomCode)

  assert.equal(first.round, 1)
  assert.equal(second.round, 1)
  assert.equal(second.revision, first.revision)
  assert.equal(storedFirst.expiresAt > context.now, true)
  assert.equal(storedSecond.expiresAt, storedFirst.expiresAt)
  assert.equal(second.players.length, 2)
})

test('round-mismatched progress and finish commands cannot affect the next race', async () => {
  const context = await createRace(2)
  const { authority, host, guests } = context
  const roomCode = host.session.roomCode
  const guest = guests[0].session

  await authority.command(roomCode, credentials(host.session), { event: 'race-rematch', data: { round: 0 } }, [host.session.playerId, guest.playerId])
  await authority.command(roomCode, credentials(host.session), { event: 'race-start', data: { timeLimit: 30 } }, [host.session.playerId, guest.playerId])
  context.now += 3_000

  await authority.command(roomCode, credentials(guest), {
    event: 'player-progress', data: { progress: 0.9, wpm: 120, sequence: 90, round: 0 },
  })
  await authority.command(roomCode, credentials(guest), {
    event: 'player-finish', data: { wpm: 120, sequence: 91, round: 0 },
  })
  let snapshot = await authority.snapshot(roomCode, credentials(host.session))
  let player = snapshot.players.find(current => current.id === guest.playerId)
  assert.equal(player.progress, 0)
  assert.equal(player.finished, false)

  await authority.command(roomCode, credentials(guest), {
    event: 'player-progress', data: { progress: 0.25, wpm: 80, sequence: 1, round: 1 },
  })
  snapshot = await authority.snapshot(roomCode, credentials(host.session))
  player = snapshot.players.find(current => current.id === guest.playerId)
  assert.equal(player.progress, 0.25)
  assert.equal(player.sequence, 1)
})

test('round-specific word lists do not reuse the previous race words', () => {
  const first = seededWordList(WORDS_LIST, 60, 1234)
  const rematch = seededWordList(WORDS_LIST, 60, 1234 + 10_000)
  assert.notDeepEqual(rematch, first)
})

test.after(() => {
  Module._extensions['.ts'] = originalTsExtension
  Module._load = originalLoad
})
