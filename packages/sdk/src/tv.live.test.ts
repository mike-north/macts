/**
 * LOCALLY-AUTOMATABLE live checks of the TV read operations against the real
 * app. NOT run in CI.
 *
 * ## What this tests
 *
 * Each read operation the TV contract declares, read-only, on this Mac:
 *
 *   1. Through `@macts/sdk/local`'s `createClient`, with the default native
 *      executor and a real API key, end to end through the invocation pipeline
 *      (verify, permission, governance, validate input, execute, validate
 *      output): `list`, then `get` of a listed item, which must come back with
 *      the same identifier.
 *   2. The same `list` and `get`, run by the native executor directly with the
 *      operation's value plans, whose wire result must pass the operation's
 *      `output.wire` schema. The client run already enforces it; this states
 *      it, so a failure names the offending field.
 *
 * Sources at the application, by persistent ID; the playlists of each source,
 * under that source, by persistent ID (the app addresses a playlist within its
 * source, and a source can hold a playlist the application's own playlists do
 * not list); browser and playlist windows at the application, by id.
 *
 * The window gets are unverified, not proven: with no window open, a window
 * list is only checked to be an array, and no window is got. A window is got
 * only when one is listed.
 *
 * Nothing is created, changed, deleted, played or paused.
 *
 * ## Why this cannot run in CI
 *
 * - Requires a logged-in macOS desktop with TV.app.
 * - Requires automation permission (TCC) for the process running the tests to
 *   control TV. The first run raises a one-time prompt that only a person at
 *   the Mac can answer; until it is answered, calls hang and then fail with a
 *   timeout.
 * - The records come from the media library on this Mac.
 *
 * The suite is therefore gated behind `MACTS_LIVE_APPS=1` and skipped
 * everywhere else, including every CI run.
 *
 * ## Local run procedure
 *
 * ```sh
 * MACTS_LIVE_APPS=1 pnpm --filter @macts/sdk exec vitest run src/tv.live.test.ts
 * ```
 *
 * @see ../../../manifests/tv/app.yaml
 * @see ../../../phases/13-sdk-value-and-execution-contracts.md (D9, D10 command parents)
 * @see https://github.com/mike-north/macts/issues/219
 */

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { tvContract, type TVClient } from '@macts/tv/contract'
import {
  EMPTY_RESOURCE_PLAN_TABLE,
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
 * test that runs several lists and gets.
 */
const LIVE_TEST_TIMEOUT_MS = 180_000

// The key store resolves MACTS_HOME when its module loads, so the temporary
// home must be in place before any import runs. The live suite mints its key
// there and never touches the user's real key store.
const { mactsHome } = await vi.hoisted(async () => {
  const fs = await import('node:fs')
  const os = await import('node:os')
  const path = await import('node:path')
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'macts-sdk-tv-live-'))
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
 * Runs operations of the TV contract through the native executor directly and
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
        resourcePlans: EMPTY_RESOURCE_PLAN_TABLE,
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

/**
 * The first item of a wire page, or `undefined` when the page is empty. The
 * page has already passed the operation's `output.wire`, so its items are wire
 * records.
 */
function firstWireItem(page: unknown): WireRecord | undefined {
  const items = field(page, 'items')
  const first: unknown = Array.isArray(items) ? items[0] : undefined
  return typeof first === 'object' && first !== null && !Array.isArray(first)
    ? (first as WireRecord)
    : undefined
}

/** A wire record's field, read without assuming the record's shape. */
function field(record: unknown, key: string): unknown {
  return typeof record === 'object' && record !== null && !Array.isArray(record)
    ? (record as Record<string, unknown>)[key]
    : undefined
}

describe.skipIf(!liveAppsEnabled)('TV reads against TV.app (local only)', () => {
  const OPERATIONS: readonly OperationId[] = [
    'tv.sources.list',
    'tv.sources.get',
    'tv.playlists.list',
    'tv.playlists.get',
    'tv.browserWindows.list',
    'tv.browserWindows.get',
    'tv.playlistWindows.list',
    'tv.playlistWindows.get',
  ]
  let tv: TVClient
  let wire: WireReader

  beforeAll(async () => {
    const key = await createApiKey({
      name: 'Live TV reads test',
      permissions: permissionsOf(tvContract, OPERATIONS),
    })
    tv = createClient(tvContract, { token: key.token, governance: { policy: ALLOW_ALL_POLICY } })
    wire = await wireReader(tvContract)
  }, LIVE_TEST_TIMEOUT_MS)

  it(
    'lists sources and gets the first by its persistent ID',
    async () => {
      const sources = await tv.sources.list()
      const first = sources.items[0]
      if (first === undefined) return
      const source = await tv.sources.get(first.persistentID)
      expect(source.persistentID).toBe(first.persistentID)

      await wire.read('tv.sources.list', {})
      const got = await wire.read('tv.sources.get', { persistentID: first.persistentID })
      expect(field(got, 'persistentID')).toBe(first.persistentID)
    },
    LIVE_TEST_TIMEOUT_MS
  )

  it(
    'lists the playlists of each source and gets one by its persistent ID under its source',
    async () => {
      // Sources do not page: the one page holds every source.
      for (const source of (await tv.sources.list()).items) {
        const playlists = await tv.playlists.list(source.persistentID)
        await wire.read('tv.playlists.list', { sourceId: source.persistentID })
        const first = playlists.items[0]
        if (first === undefined) continue
        const playlist = await tv.playlists.get(source.persistentID, first.persistentID)
        expect(playlist.persistentID).toBe(first.persistentID)

        const got = await wire.read('tv.playlists.get', {
          sourceId: source.persistentID,
          persistentID: first.persistentID,
        })
        expect(field(got, 'persistentID')).toBe(first.persistentID)
      }
    },
    LIVE_TEST_TIMEOUT_MS
  )

  it.each([
    ['browserWindows', 'tv.browserWindows.list', 'tv.browserWindows.get'],
    ['playlistWindows', 'tv.playlistWindows.list', 'tv.playlistWindows.get'],
  ] as const)(
    'lists %s; the get is unverified, run only when a window is open',
    async (resource, listId, getId) => {
      const windows = await tv[resource].list()
      // With no window open this proves only that the list is an array; it
      // says nothing about getting a window by its id.
      expect(Array.isArray(windows.items)).toBe(true)
      const listed = await wire.read(listId, {})
      expect(Array.isArray(field(listed, 'items'))).toBe(true)
      const first = windows.items[0]
      if (first === undefined) return
      const window = await tv[resource].get(first.id)
      expect(window.id).toBe(first.id)

      // The wire form of the integer id, as the wire list returned it.
      const wireId = firstWireItem(listed)?.['id']
      if (wireId === undefined) throw new Error(`${listId} listed a window the wire list lacks`)
      expect(field(await wire.read(getId, { id: wireId }), 'id')).toEqual(wireId)
    },
    LIVE_TEST_TIMEOUT_MS
  )
})
