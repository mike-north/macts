/**
 * LOCALLY-AUTOMATABLE live check of reference resolution by the macOS
 * provider, against the real Contacts and Reminders apps. NOT run in CI.
 *
 * ## What this tests
 *
 * Through `@macts/sdk/local`'s `createClient` with the default native
 * executor, for a Contacts person and a Reminders list:
 *
 *   1. List one page of the resource and take an identifier from it.
 *   2. Bind a single identity reference to it with `bindReference`, call
 *      `resolve()`, and check that the resolved record's `id` equals the
 *      reference's `id`.
 *   3. Bind an identity collection of two such references (the first two
 *      listed, or the first one twice when only one exists), resolve it, and
 *      check that it holds one record per entry, in entry order, each with
 *      its entry's `id`.
 *
 * Every call is a read: listing, and the property reads resolution makes.
 * Nothing is created, changed or deleted. Only counts and pass or fail are
 * reported, never a record's contents, names or identifiers.
 *
 * ## Why this cannot run in CI
 *
 * - Requires a logged-in macOS desktop with Contacts.app and Reminders.app,
 *   with at least one person and one list.
 * - Requires automation permission (TCC) for the process running the tests to
 *   control each app, and Contacts and Reminders access. The first run raises
 *   one-time prompts that only a person at the Mac can answer; until they are
 *   answered, calls hang and then fail with a timeout, or fail with
 *   `AppAuthorizationRequiredError`.
 *
 * The suite is therefore gated behind `MACTS_LIVE_APPS=1` and skipped
 * everywhere else, including every CI run.
 *
 * ## Local run procedure
 *
 * Listing Contacts people can take most of the executor's 30 s limit, so run
 * this file on its own, not beside other Contacts live files:
 *
 * ```sh
 * MACTS_LIVE_APPS=1 pnpm --filter @macts/sdk exec vitest run src/native-reference-resolution.live.test.ts
 * ```
 *
 * @see ../../../manifests/contacts/app.yaml
 * @see ../../../manifests/reminders/app.yaml
 * @see ../../../phases/13-sdk-value-and-execution-contracts.md (D7)
 */

import { afterAll, describe, expect, it, vi } from 'vitest'
import { contactsContract } from '@macts/contacts/contract'
import { remindersContract } from '@macts/reminders/contract'
import { Integer, type IdentityReferenceData } from '@macts/contracts'
import {
  ALLOW_ALL_POLICY,
  closeKeyStore,
  createApiKey,
  createLogger,
  setLogger,
} from '@macts/runtime'
import { bindReference, createClient } from './local.js'

const liveAppsEnabled = process.env['MACTS_LIVE_APPS'] === '1'

/** Per-test limit: a cold app launch plus the executor's own 30 s limit, twice. */
const LIVE_TEST_TIMEOUT_MS = 120_000

// The key store resolves MACTS_HOME when its module loads, so the temporary
// home must be in place before any import runs. The suite mints its keys there
// and never touches the user's real key store.
const { mactsHome } = await vi.hoisted(async () => {
  const fs = await import('node:fs')
  const os = await import('node:os')
  const path = await import('node:path')
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'macts-sdk-native-resolution-live-'))
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

/** A record's `id`, when it has a string one. */
function idOf(record: unknown): string | undefined {
  if (typeof record !== 'object' || record === null || !('id' in record)) return undefined
  return typeof record.id === 'string' ? record.id : undefined
}

/**
 * Resolve a single identity reference to `ids[0]` and an identity collection
 * of the first two of `ids` (the first one twice when only one was listed),
 * through `client`, and check each record's `id` against its reference. The
 * checks compare to booleans, so a failure never prints an identifier.
 */
async function expectResolves(
  client: object,
  app: string,
  resource: string,
  label: string,
  ids: readonly string[]
): Promise<void> {
  const first = ids[0]
  if (first === undefined) {
    console.info(`${label}: none listed, nothing to resolve`)
    return
  }
  const entries = [first, ids[1] ?? first]
  const single = (id: string): IdentityReferenceData<string> => ({
    app,
    resource,
    form: 'identity',
    cardinality: 'one',
    id,
  })

  const record = await bindReference(client, single(first)).resolve()
  expect(idOf(record) === first).toBe(true)

  const records = await bindReference(client, {
    app,
    resource,
    form: 'identity',
    cardinality: 'many',
    entries: entries.map(single),
  }).resolve()
  expect(Array.isArray(records)).toBe(true)
  if (!Array.isArray(records)) return
  expect(records.length).toBe(entries.length)
  expect(records.every((entry: unknown, index) => idOf(entry) === entries[index])).toBe(true)

  console.info(
    `${label}: single resolved, collection of ${String(entries.length)} resolved in order`
  )
}

/** A token for a key that holds exactly `permissions`, for local clients. */
async function liveToken(name: string, permissions: string[]): Promise<string> {
  const key = await createApiKey({ name, permissions })
  return key.token
}

describe.skipIf(!liveAppsEnabled)('native reference resolution (local only)', () => {
  it(
    'resolves a Contacts person reference and an identity collection of two',
    async () => {
      const contacts = createClient(contactsContract, {
        token: await liveToken('Live person resolution', [
          'contacts:people:list',
          'contacts:people:get',
        ]),
        governance: { policy: ALLOW_ALL_POLICY },
      })
      const page = await contacts.people.list({ pageSize: Integer.validate(2) })
      await expectResolves(
        contacts,
        'contacts',
        'Person',
        'Contacts person',
        page.items.map((item) => item.id)
      )
    },
    LIVE_TEST_TIMEOUT_MS
  )

  it(
    'resolves a Reminders list reference and an identity collection of two',
    async () => {
      const reminders = createClient(remindersContract, {
        token: await liveToken('Live list resolution', [
          'reminders:lists:list',
          'reminders:lists:get',
        ]),
        governance: { policy: ALLOW_ALL_POLICY },
      })
      const page = await reminders.lists.list({ pageSize: Integer.validate(2) })
      await expectResolves(
        reminders,
        'reminders',
        'List',
        'Reminders list',
        page.items.map((item) => item.id)
      )
    },
    LIVE_TEST_TIMEOUT_MS
  )
})
