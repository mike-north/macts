/**
 * LOCALLY-AUTOMATABLE live check that a batched list read returns the same
 * records as per-record reads of the same data. NOT run in CI.
 *
 * ## What this tests
 *
 * A list body reads each property once across the collection and assembles
 * records by position. This suite holds its records against two per-record
 * reads, with the shipped manifests, the real automation host and the real
 * codec:
 *
 * 1. The `get` of each record, by the identifier the list gave it, for a
 *    spread sample of every list: the records must be deeply equal. A get
 *    reads one item's property record and reads on its own any usable
 *    property the record leaves out, so it is the full per-record read.
 * 2. The per-item list body the batched body replaced
 *    (`test-support/per-item-list-body.ts`, kept as a test-only reference),
 *    over the whole list: the same records, sorted by identifier, and every
 *    field both reads give is equal; whether the two reads also gave the same
 *    order is printed. The per-item body reads only an item's property
 *    record, so it lacks whatever that record leaves out: on Music 1.7.2,
 *    every property with no value (which a read across the collection reports
 *    as `null`), and a track's `albumRating`, `albumRatingKind` and
 *    `ratingKind`, which have values. Those fields are counted and printed,
 *    never compared; the get comparison covers them.
 *
 * Lists: Contacts people, groups, and the email addresses, phone numbers and
 * addresses of the first people that have them; Music playlists, and the
 * tracks of every playlist. Both reads see the same app state within seconds
 * of each other; nothing is created, changed, deleted, played or paused. A
 * failure names records by position and fields by name, never their values,
 * and the summary holds only counts and booleans.
 *
 * ## Why this cannot run in CI
 *
 * - Requires a logged-in macOS desktop with Contacts.app and Music.app.
 * - Requires automation permission (TCC) for the process running the tests,
 *   and Contacts access; the first run raises prompts only a person at the
 *   Mac can answer, and until then calls hang and fail with a timeout.
 *
 * The suite is therefore gated behind `MACTS_LIVE_APPS=1` and skipped
 * everywhere else, including every CI run.
 *
 * ## Local run procedure
 *
 * ```sh
 * MACTS_LIVE_APPS=1 pnpm --filter @macts/core exec vitest run src/jxa/native-list-body.live.test.ts
 * ```
 *
 * @see ./native-list-body.test.ts
 * @see ../../../../phases/13-sdk-value-and-execution-contracts.md (D10, native spellings: list and get reads)
 * @see https://github.com/mike-north/macts/issues/213
 */

import { fileURLToPath } from 'node:url'
import { isDeepStrictEqual } from 'node:util'
import { beforeAll, describe, expect, it } from 'vitest'
import {
  EMPTY_RESOURCE_PLAN_TABLE,
  PASSTHROUGH_PLAN,
  type OperationTarget,
  type WireRecord,
  type WireValue,
} from '@macts/contracts'
import { loadManifest } from '../manifest/loader.js'
import type { AppManifest } from '../manifest/schemas/app.js'
import { runNativeScript } from './executor.js'
import { NATIVE_CODEC } from './native-codec.js'
import { createNativeExecutor } from './native-executor.js'
import { buildPerItemListBody } from './test-support/per-item-list-body.js'

const liveAppsEnabled = process.env['MACTS_LIVE_APPS'] === '1'

/** Generous per-test limit: many lists and gets, after a cold launch. */
const LIVE_TEST_TIMEOUT_MS = 600_000

/** Per-operation limit: a per-item read of a few hundred people takes a while. */
const OPERATION_TIMEOUT_MS = 120_000

/** How many people to look through for ones that have emails, phones or addresses. */
const PERSON_SCAN_LIMIT = 40

/** How many people with a given kind of detail to compare. */
const PEOPLE_PER_DETAIL = 3

/** How many records of each list are also read by `get`, spread across it. */
const GETS_PER_LIST = 12

function shippedManifest(app: string): Promise<AppManifest> {
  return loadManifest(
    fileURLToPath(new URL(`../../../../manifests/${app}/app.yaml`, import.meta.url))
  )
}

function isWireRecord(value: WireValue | undefined): value is WireRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function asRecord(value: WireValue | undefined): WireRecord | undefined {
  return isWireRecord(value) ? value : undefined
}

function records(list: WireValue, what: string): WireRecord[] {
  if (!Array.isArray(list)) throw new Error(`${what}: the list result is not an array`)
  const values: readonly WireValue[] = list
  return values.map((value, index) => {
    const record = asRecord(value)
    if (record === undefined) throw new Error(`${what}[${String(index)}] is not a record`)
    return record
  })
}

function stringField(record: WireRecord, key: string): string {
  const value = record[key]
  if (typeof value !== 'string') throw new Error(`a listed record has no string ${key}`)
  return value
}

/** Up to `count` indexes spread evenly over `length` items, first and last included. */
function spread(length: number, count: number): number[] {
  if (length <= count) return Array.from({ length }, (_v, i) => i)
  return [
    ...new Set(
      Array.from({ length: count }, (_v, i) => Math.round((i * (length - 1)) / (count - 1)))
    ),
  ]
}

/** Runs list and get operations of one app through the native executor. */
interface Reader {
  /** The production (batched) list body's result. */
  list(target: OperationTarget, input: WireRecord): Promise<WireValue>
  /** The per-item reference body's result for the same list. */
  listPerItem(target: OperationTarget, input: WireRecord): Promise<WireValue>
  /** A get's result. */
  get(target: OperationTarget, input: WireRecord): Promise<WireValue>
}

function reader(manifest: AppManifest): Reader {
  const executor = createNativeExecutor({ timeoutMs: OPERATION_TIMEOUT_MS })
  const request = (target: OperationTarget, input: WireRecord) => ({
    manifest,
    target,
    input,
    inputPlan: PASSTHROUGH_PLAN,
    outputPlan: PASSTHROUGH_PLAN,
    resourcePlans: EMPTY_RESOURCE_PLAN_TABLE,
  })
  return {
    list: (target, input) => executor.execute(request(target, input)),
    get: (target, input) => executor.execute(request(target, input)),
    listPerItem: (target, input) =>
      createNativeExecutor({
        timeoutMs: OPERATION_TIMEOUT_MS,
        transport: {
          // Same script, codec and host as a list; only the body differs. A
          // passthrough result carries identifier aliases, as a list's does.
          run: (script, options) =>
            runNativeScript(
              { ...script, body: buildPerItemListBody(manifest, target, true) },
              NATIVE_CODEC,
              { timeout: options.timeoutMs, signal: options.signal }
            ),
        },
      }).execute(request(target, input)),
  }
}

/** What comparing one list found, for the printed summary: counts and booleans only. */
interface Comparison {
  readonly records: number
  readonly gets: number
  /** Whether the two list reads gave the records in the same order. */
  readonly sameOrder: boolean
  /** Per field: records whose per-item read left the field out. */
  readonly leftOutPerItem: Record<string, number>
}

/**
 * The fields of `actual` and `expected` whose values differ, or that only one
 * has, as `<what>.<field>`. Only field names are reported, never values, so a
 * failure prints nothing from the personal data being read.
 */
function differingFields(what: string, actual: WireRecord, expected: WireRecord): string[] {
  const keys = new Set([...Object.keys(actual), ...Object.keys(expected)])
  return [...keys]
    .filter(
      (key) =>
        Object.hasOwn(actual, key) !== Object.hasOwn(expected, key) ||
        !isDeepStrictEqual(actual[key], expected[key])
    )
    .map((key) => `${what}.${key}`)
}

/** `list` sorted by the string identifier `idKey`. */
function byIdentifier(list: readonly WireRecord[], idKey: string): WireRecord[] {
  return [...list].sort((a, b) => {
    const left = stringField(a, idKey)
    const right = stringField(b, idKey)
    return left < right ? -1 : left > right ? 1 : 0
  })
}

/**
 * Lists `listTarget` both ways and gets a spread sample of its records by
 * identifier, requiring the agreement the module comment describes. Both lists
 * are sorted by `idKey` before they are compared.
 *
 * @param idKey - The field holding each record's identifier.
 * @param getInput - The get input for a listed record: the parent identifier
 *   and the record's own identifier, as the get's parameters name them.
 */
async function compareList(
  read: Reader,
  what: string,
  idKey: string,
  listTarget: OperationTarget,
  listInput: WireRecord,
  getTarget: OperationTarget,
  getInput: (record: WireRecord) => WireRecord
): Promise<Comparison> {
  const listed = records(await read.list(listTarget, listInput), what)
  const listedPerItem = records(await read.listPerItem(listTarget, listInput), `${what} (per item)`)
  expect(listedPerItem.length, `${what}: record count`).toBe(listed.length)
  const sameOrder = listed.every(
    (record, index) => stringField(record, idKey) === stringField(listedPerItem[index] ?? {}, idKey)
  )

  const batched = byIdentifier(listed, idKey)
  const perItem = byIdentifier(listedPerItem, idKey)
  const leftOutPerItem: Record<string, number> = {}
  const mismatches: string[] = []
  batched.forEach((record, index) => {
    const reference = perItem[index] ?? {}
    const shared: Record<string, WireValue> = {}
    for (const [key, value] of Object.entries(record)) {
      if (Object.hasOwn(reference, key)) shared[key] = value
      else leftOutPerItem[key] = (leftOutPerItem[key] ?? 0) + 1
    }
    mismatches.push(...differingFields(`${what}#${String(index)}`, shared, reference))
  })
  expect(mismatches, `${what}: fields that differ from the per-item read`).toEqual([])

  const sample = spread(batched.length, GETS_PER_LIST)
  const getMismatches: string[] = []
  for (const index of sample) {
    const record = batched[index]
    if (record === undefined) continue
    const got = asRecord(await read.get(getTarget, getInput(record)))
    if (got === undefined) throw new Error(`${what}#${String(index)}: the get gave no record`)
    getMismatches.push(...differingFields(`${what}#${String(index)} by get`, got, record))
  }
  expect(getMismatches, `${what}: fields that differ from the get`).toEqual([])
  return { records: batched.length, gets: sample.length, sameOrder, leftOutPerItem }
}

describe.skipIf(!liveAppsEnabled)(
  'list records match per-record reads on Contacts.app (local only)',
  () => {
    let read: Reader

    beforeAll(async () => {
      read = reader(await shippedManifest('contacts'))
    })

    it(
      'lists the same people, groups, and details of people as per-record reads',
      async () => {
        const summary: Record<string, Comparison[]> = {}
        const note = (what: string, comparison: Comparison) => {
          ;(summary[what] ??= []).push(comparison)
        }

        const byId = (record: WireRecord): WireRecord => ({ id: stringField(record, 'id') })
        note(
          'people',
          await compareList(
            read,
            'people',
            'id',
            { command: 'listPeople', resource: 'Person' },
            {},
            { command: 'getPerson', resource: 'Person' },
            byId
          )
        )
        note(
          'groups',
          await compareList(
            read,
            'groups',
            'id',
            { command: 'listGroups', resource: 'Group' },
            {},
            { command: 'getGroup', resource: 'Group' },
            byId
          )
        )

        const people = records(
          await read.list({ command: 'listPeople', resource: 'Person' }, {}),
          'people'
        ).map((person) => stringField(person, 'id'))
        const details = [
          ['emails', 'Email', 'listEmails', 'getEmail'],
          ['phones', 'Phone', 'listPhones', 'getPhone'],
          ['addresses', 'Address', 'listAddresses', 'getAddress'],
        ] as const
        for (const [what, resource, listCommand, getCommand] of details) {
          let compared = 0
          for (const personId of people.slice(0, PERSON_SCAN_LIMIT)) {
            if (compared >= PEOPLE_PER_DETAIL) break
            const comparison = await compareList(
              read,
              `${what} of a person`,
              'id',
              { command: listCommand, resource },
              { personId },
              { command: getCommand, resource },
              (record) => ({ personId, id: stringField(record, 'id') })
            )
            if (comparison.records > 0) {
              compared += 1
              note(what, comparison)
            }
          }
        }
        console.info(`Contacts list comparison: ${JSON.stringify(summary)}`)
      },
      LIVE_TEST_TIMEOUT_MS
    )
  }
)

describe.skipIf(!liveAppsEnabled)(
  'list records match per-record reads on Music.app (local only)',
  () => {
    let read: Reader

    beforeAll(async () => {
      read = reader(await shippedManifest('music'))
    })

    it(
      'lists the same playlists, and the same tracks of each playlist, as per-record reads',
      async () => {
        const summary: Record<string, Comparison> = {}
        summary['playlists'] = await compareList(
          read,
          'playlists',
          'persistentID',
          { command: 'listPlaylists', resource: 'Playlist' },
          {},
          { command: 'getPlaylist', resource: 'Playlist' },
          (record) => ({ persistentID: stringField(record, 'persistentID') })
        )

        const playlists = records(
          await read.list({ command: 'listPlaylists', resource: 'Playlist' }, {}),
          'playlists'
        ).map((playlist) => stringField(playlist, 'persistentID'))
        // Each playlist is named by its position in the listing, never by its
        // identifier: a live run reports counts and distinctness only.
        for (const [position, playlistId] of playlists.entries()) {
          const label = `tracks of playlist #${String(position)}`
          summary[label] = await compareList(
            read,
            label,
            'persistentID',
            { command: 'listTracks', resource: 'Track' },
            { playlistId },
            { command: 'getTrack', resource: 'Track' },
            (record) => ({ playlistId, persistentID: stringField(record, 'persistentID') })
          )
        }
        console.info(`Music list comparison: ${JSON.stringify(summary)}`)
      },
      LIVE_TEST_TIMEOUT_MS
    )
  }
)
