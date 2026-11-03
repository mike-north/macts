/**
 * LOCALLY-AUTOMATABLE live check of a Contacts action that takes a person
 * reference, against the real app. NOT run in CI.
 *
 * ## What this tests
 *
 * `actionTitle` asks Contacts for the menu title of a rollover action on one
 * person. Its `for` is a single person reference, which the macOS provider
 * converts to the app's person before it sends the command. The check lists
 * one person, then calls `actionTitle` once with a reference to that person,
 * through `@macts/sdk/local`'s `createClient` with the default native
 * executor. It asserts only that the call settles with no value or with a
 * macts error that is not an internal error or a missing target: either
 * means the reference converted and the person was found.
 *
 * `actionTitle` is a query: the app's dictionary describes it as returning a
 * title, with no side effect. Nothing is created, changed or deleted, and the
 * actions that act on a person (`performAction`) are never called.
 *
 * ## Why this cannot run in CI
 *
 * - Requires a logged-in macOS desktop with Contacts.app and at least one
 *   person in it.
 * - Requires automation permission (TCC) for the process running the tests to
 *   control Contacts, and Contacts access. The first run raises one-time
 *   prompts that only a person at the Mac can answer; until they are
 *   answered, calls hang and then fail with a timeout.
 *
 * The suite is therefore gated behind `MACTS_LIVE_APPS=1` and skipped
 * everywhere else, including every CI run.
 *
 * ## Local run procedure
 *
 * ```sh
 * MACTS_LIVE_APPS=1 pnpm --filter @macts/sdk exec vitest run src/contacts-person-reference.live.test.ts
 * ```
 *
 * @see /System/Applications/Contacts.app/Contents/Resources/Contacts.sdef
 * @see ../../../manifests/contacts/app.yaml
 * @see ../../../phases/13-sdk-value-and-execution-contracts.md (D4, D7)
 */

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { contactsContract, type ContactsClient } from '@macts/contacts/contract'
import { Integer, InternalError, MactsError, TargetNotFoundError } from '@macts/contracts'
import {
  ALLOW_ALL_POLICY,
  closeKeyStore,
  createApiKey,
  createLogger,
  setLogger,
} from '@macts/runtime'
import { createClient } from './local-client.js'

const liveAppsEnabled = process.env['MACTS_LIVE_APPS'] === '1'

/** Per-test limit: a cold app launch plus the executor's own 30 s limit, twice. */
const LIVE_TEST_TIMEOUT_MS = 120_000

// The key store resolves MACTS_HOME when its module loads, so the temporary
// home must be in place before any import runs. The suite mints its key there
// and never touches the user's real key store.
const { mactsHome } = await vi.hoisted(async () => {
  const fs = await import('node:fs')
  const os = await import('node:os')
  const path = await import('node:path')
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'macts-sdk-person-reference-live-'))
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

describe.skipIf(!liveAppsEnabled)('Contacts actionTitle against Contacts.app (local only)', () => {
  let contacts: ContactsClient

  beforeAll(async () => {
    const key = await createApiKey({
      name: 'Live Contacts person reference test',
      permissions: ['contacts:people:list', 'contacts:app:actionTitle'],
    })
    contacts = createClient(contactsContract, {
      token: key.token,
      governance: { policy: ALLOW_ALL_POLICY },
    })
  }, LIVE_TEST_TIMEOUT_MS)

  it(
    'converts a reference to a listed person and sends actionTitle once',
    async () => {
      const people = await contacts.people.list({ pageSize: Integer.validate(1) })
      const first = people.items[0]
      if (first === undefined) return

      let failure: unknown
      try {
        await contacts.actionTitle('email', {
          app: 'contacts',
          resource: 'Person',
          form: 'identity',
          cardinality: 'one',
          id: first.id,
        })
      } catch (error) {
        failure = error
      }
      if (failure !== undefined) {
        // The app may decline the action; that is its answer, not a failed
        // conversion. Only its error code is reported, never app data.
        expect(failure).toBeInstanceOf(MactsError)
        expect(failure).not.toBeInstanceOf(InternalError)
        expect(failure).not.toBeInstanceOf(TargetNotFoundError)
      }
      console.info(
        `actionTitle settled: resolved=${String(failure === undefined)}` +
          (failure instanceof MactsError ? ` code=${String(failure.code)}` : '')
      )
    },
    LIVE_TEST_TIMEOUT_MS
  )
})
