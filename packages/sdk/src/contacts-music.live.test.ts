/**
 * LOCALLY-AUTOMATABLE live checks of the Contacts and Music read operations
 * against the real apps. NOT run in CI.
 *
 * ## What this tests
 *
 * Each read operation the two contracts declare, read-only, on this Mac:
 *
 *   1. Through `@macts/sdk/local`'s `createClient`, with the default native
 *      executor and a real API key, end to end through the invocation pipeline
 *      (verify, permission, governance, validate input, execute, validate
 *      output): `list`, then `get` of the first listed item, which must come
 *      back with the same identifier.
 *   2. The same `list` and `get`, run by the native executor directly with the
 *      operation's value plans, whose wire result must pass the operation's
 *      `output.wire` schema. The client run already enforces it; this states
 *      it, so a failure names the offending field.
 *
 * Contacts: people and groups at the application; email addresses, phone
 * numbers and addresses under a person (the first person that has one).
 * Music: playlists at the application; tracks under a playlist, first under
 * the library playlist, which holds every track.
 *
 * Nothing is created, changed, deleted, played or paused.
 *
 * ## Why this cannot run in CI
 *
 * - Requires a logged-in macOS desktop with Contacts.app and Music.app.
 * - Requires automation permission (TCC) for the process running the tests to
 *   control each app, and Contacts access for the Contacts reads. The first
 *   run raises one-time prompts that only a person at the Mac can answer;
 *   until they are answered, calls hang and then fail with a timeout.
 * - The records come from the personal data on this Mac.
 *
 * The suite is therefore gated behind `MACTS_LIVE_APPS=1` and skipped
 * everywhere else, including every CI run.
 *
 * ## Local run procedure
 *
 * ```sh
 * MACTS_LIVE_APPS=1 pnpm --filter @macts/sdk exec vitest run src/contacts-music.live.test.ts
 * ```
 *
 * @see ../../../manifests/contacts/app.yaml
 * @see ../../../manifests/music/app.yaml
 * @see ../../../phases/13-sdk-value-and-execution-contracts.md (D9, D10 command parents)
 * @see https://github.com/mike-north/macts/issues/213
 */

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { contactsContract, type ContactsClient } from '@macts/contacts/contract'
import { musicContract, type MusicClient } from '@macts/music/contract'
import {
  Integer,
  ValueTypes,
  isPageValueType,
  type AnyOperationDescriptor,
  type AppContract,
  type OperationId,
  type WireRecord,
} from '@macts/contracts'
import { AppManifestSchema, createNativeExecutor, type AppManifest } from '@macts/core'
import {
  ALLOW_ALL_POLICY,
  closeKeyStore,
  createApiKey,
  createLogger,
  setLogger,
} from '@macts/runtime'
import { createClient } from './local-client.js'

const liveAppsEnabled = process.env['MACTS_LIVE_APPS'] === '1'

/**
 * Per-test limit: a cold app launch plus the executor's own 30 s limit, for a
 * test that runs a list and a get twice each.
 */
const LIVE_TEST_TIMEOUT_MS = 180_000

/**
 * How many people to look through for one that has an email, phone or
 * address: the size of the one page of people read, at most the largest page.
 */
const PERSON_SCAN_LIMIT = 60

/** The special kind Music reports for its library playlist, which holds every track. */
const LIBRARY_PLAYLIST_KIND = 'Library'

// The key store resolves MACTS_HOME when its module loads, so the temporary
// home must be in place before any import runs. The live suite mints its key
// there and never touches the user's real key store.
const { mactsHome } = await vi.hoisted(async () => {
  const fs = await import('node:fs')
  const os = await import('node:os')
  const path = await import('node:path')
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'macts-sdk-reads-live-'))
  process.env['MACTS_HOME'] = home
  delete process.env['MACTS_API_KEY_SECRET']
  return { mactsHome: home }
})

setLogger(createLogger({ level: 'silent' }))

afterAll(async () => {
  closeKeyStore()
  const { rm } = await import('node:fs/promises')
  await rm(mactsHome, { recursive: true, force: true })
})

/**
 * Runs operations of one contract through the native executor directly and
 * checks each wire result against the operation's `output.wire`.
 *
 * A list's output is a page. The runtime asks the executor for the items and
 * makes the page itself, so a list here reads the whole collection as the
 * items of one page, as the runtime does for a list that does not page.
 */
interface WireReader {
  /** The wire result of `id` on `input`, after it passed `output.wire`. */
  read(id: OperationId, input: WireRecord): Promise<unknown>
}

async function wireReader<Client>(contract: AppContract<Client>): Promise<WireReader> {
  const manifest: AppManifest = AppManifestSchema.parse(await contract.loadManifest())
  const executor = createNativeExecutor()
  return {
    async read(id, input) {
      const operation: AnyOperationDescriptor | undefined = contract.operations[id]
      if (operation === undefined) throw new Error(`the contract declares no ${id}`)
      const page = isPageValueType(operation.output) ? operation.output : undefined
      const result = await executor.execute({
        manifest,
        target: operation.target,
        input,
        inputPlan: operation.input.plan,
        outputPlan: page === undefined ? operation.output.plan : ValueTypes.array(page.item).plan,
      })
      const wire = page === undefined ? result : { items: result }
      const parsed = operation.output.wire.safeParse(wire)
      expect(parsed.success, `${id}: ${JSON.stringify(parsed.error?.issues)}`).toBe(true)
      return wire
    },
  }
}

/** The permission every listed operation of `contract` requires. */
function permissionsOf<Client>(
  contract: AppContract<Client>,
  ids: readonly OperationId[]
): string[] {
  return ids.map((id) => {
    const operation = contract.operations[id]
    if (operation === undefined) throw new Error(`the contract declares no ${id}`)
    return operation.permission
  })
}

/** A wire record's field, read without assuming the record's shape. */
function field(record: unknown, key: string): unknown {
  return typeof record === 'object' && record !== null && !Array.isArray(record)
    ? (record as Record<string, unknown>)[key]
    : undefined
}

describe.skipIf(!liveAppsEnabled)('Contacts reads against Contacts.app (local only)', () => {
  const OPERATIONS: readonly OperationId[] = [
    'contacts.people.list',
    'contacts.people.get',
    'contacts.groups.list',
    'contacts.groups.get',
    'contacts.emails.list',
    'contacts.emails.get',
    'contacts.phones.list',
    'contacts.phones.get',
    'contacts.addresses.list',
    'contacts.addresses.get',
  ]
  let contacts: ContactsClient
  let wire: WireReader
  let personIds: readonly string[] = []

  beforeAll(async () => {
    const key = await createApiKey({
      name: 'Live Contacts reads test',
      permissions: permissionsOf(contactsContract, OPERATIONS),
    })
    contacts = createClient(contactsContract, {
      token: key.token,
      governance: { policy: ALLOW_ALL_POLICY },
    })
    wire = await wireReader(contactsContract)
  }, LIVE_TEST_TIMEOUT_MS)

  it(
    'lists people and gets the first by its id',
    async () => {
      const people = await contacts.people.list({ pageSize: Integer.validate(PERSON_SCAN_LIMIT) })
      personIds = people.items.map((person) => person.id)
      const first = people.items[0]
      if (first === undefined) return
      const person = await contacts.people.get(first.id)
      expect(person.id).toBe(first.id)
      expect(person.creationDate).toBeInstanceOf(Date)

      const listed = await wire.read('contacts.people.list', {})
      expect(Array.isArray(field(listed, 'items'))).toBe(true)
      expect(field(await wire.read('contacts.people.get', { id: first.id }), 'id')).toBe(first.id)
    },
    LIVE_TEST_TIMEOUT_MS
  )

  it(
    'lists groups and gets the first by its id',
    async () => {
      const groups = await contacts.groups.list()
      const first = groups.items[0]
      if (first === undefined) return
      const group = await contacts.groups.get(first.id)
      expect(group.id).toBe(first.id)

      await wire.read('contacts.groups.list', {})
      expect(field(await wire.read('contacts.groups.get', { id: first.id }), 'id')).toBe(first.id)
    },
    LIVE_TEST_TIMEOUT_MS
  )

  it.each([
    ['emails', 'contacts.emails.list', 'contacts.emails.get'],
    ['phones', 'contacts.phones.list', 'contacts.phones.get'],
    ['addresses', 'contacts.addresses.list', 'contacts.addresses.get'],
  ] as const)(
    'lists the %s of a person and gets the first by its id',
    async (resource, listId, getId) => {
      for (const personId of personIds.slice(0, PERSON_SCAN_LIMIT)) {
        const items = await contacts[resource].list(personId)
        const first = items.items[0]
        if (first === undefined) continue
        const item = await contacts[resource].get(personId, first.id)
        expect(item.id).toBe(first.id)

        await wire.read(listId, { personId })
        expect(field(await wire.read(getId, { personId, id: first.id }), 'id')).toBe(first.id)
        return
      }
    },
    LIVE_TEST_TIMEOUT_MS
  )
})

describe.skipIf(!liveAppsEnabled)('Music reads against Music.app (local only)', () => {
  const OPERATIONS: readonly OperationId[] = [
    'music.playlists.list',
    'music.playlists.get',
    'music.tracks.list',
    'music.tracks.get',
  ]
  let music: MusicClient
  let wire: WireReader

  beforeAll(async () => {
    const key = await createApiKey({
      name: 'Live Music reads test',
      permissions: permissionsOf(musicContract, OPERATIONS),
    })
    music = createClient(musicContract, {
      token: key.token,
      governance: { policy: ALLOW_ALL_POLICY },
    })
    wire = await wireReader(musicContract)
  }, LIVE_TEST_TIMEOUT_MS)

  it(
    'lists playlists and gets the first by its persistent ID',
    async () => {
      const playlists = await music.playlists.list()
      const first = playlists.items[0]
      if (first === undefined) return
      const playlist = await music.playlists.get(first.persistentID)
      expect(playlist.persistentID).toBe(first.persistentID)

      await wire.read('music.playlists.list', {})
      const got = await wire.read('music.playlists.get', { persistentID: first.persistentID })
      expect(field(got, 'persistentID')).toBe(first.persistentID)
    },
    LIVE_TEST_TIMEOUT_MS
  )

  it(
    'lists the library playlist tracks and gets the first by its persistent ID',
    async () => {
      // Playlists do not page: the one page holds every playlist.
      const playlists = (await music.playlists.list()).items
      const library = playlists.find((playlist) => playlist.specialKind === LIBRARY_PLAYLIST_KIND)
      if (library === undefined) return
      const tracks = await music.tracks.list(library.persistentID)
      const first = tracks.items[0]
      if (first === undefined) return
      const track = await music.tracks.get(library.persistentID, first.persistentID)
      expect(track.persistentID).toBe(first.persistentID)

      await wire.read('music.tracks.list', { playlistId: library.persistentID })
      const got = await wire.read('music.tracks.get', {
        playlistId: library.persistentID,
        persistentID: first.persistentID,
      })
      expect(field(got, 'persistentID')).toBe(first.persistentID)
    },
    LIVE_TEST_TIMEOUT_MS
  )

  it(
    'gets a track listed under another playlist by the same persistent ID under the library',
    async () => {
      // A track's numeric id belongs to its entry in one playlist; its
      // persistent ID is the same in every playlist that holds it.
      // Playlists do not page: the one page holds every playlist.
      const playlists = (await music.playlists.list()).items
      const library = playlists.find((playlist) => playlist.specialKind === LIBRARY_PLAYLIST_KIND)
      const other = playlists.find(
        (playlist) => playlist.persistentID !== library?.persistentID && (playlist.size ?? 0) > 0
      )
      if (library === undefined || other === undefined) return
      const first = (await music.tracks.list(other.persistentID)).items[0]
      if (first === undefined) return
      const track = await music.tracks.get(library.persistentID, first.persistentID)
      expect(track.persistentID).toBe(first.persistentID)
    },
    LIVE_TEST_TIMEOUT_MS
  )
})
