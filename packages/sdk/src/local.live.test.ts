/**
 * LOCALLY-AUTOMATABLE live check of the local client against the real
 * Notes.app. NOT run in CI.
 *
 * ## What this tests
 *
 * `@macts/sdk/local`'s `createClient(notesContract, ...)` with the default
 * native executor and a real API key, end to end through the invocation
 * pipeline (verify, permission, validate, governance, execute) and the native
 * JXA codec. All checks are read-only; nothing is created, updated, or deleted:
 *
 *   1. `accounts.list()` resolves to an array whose entries have a string
 *      `name`.
 *   2. When any attachment exists, `attachments.get(id)` of a listed
 *      attachment returns an attachment with that same `id`.
 *   3. `attachments.get` of an identifier that matches nothing rejects with
 *      `TargetNotFoundError` (phases/13 D7).
 *
 * ## Why this cannot run in CI
 *
 * - Requires a logged-in macOS desktop with Notes.app.
 * - Requires automation permission (TCC) for the process running the tests to
 *   control Notes. The first run raises a one-time prompt that only a person at
 *   the Mac can answer; until it is answered, calls hang and then fail with a
 *   timeout.
 *
 * The suite is therefore gated behind `MACTS_LIVE_APPS=1` and skipped
 * everywhere else, including every CI run.
 *
 * ## Local run procedure
 *
 * ```sh
 * MACTS_LIVE_APPS=1 pnpm --filter @macts/sdk exec vitest run src/local.live.test.ts
 * ```
 *
 * If a case times out on first run, answer the automation prompt for the
 * terminal (System Settings > Privacy & Security > Automation) and rerun.
 *
 * @see phases/13-sdk-value-and-execution-contracts.md (D5, D7)
 */

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { notesContract, type NotesClient } from '@macts/notes/contract'
import { TargetNotFoundError } from '@macts/contracts'
import {
  ALLOW_ALL_POLICY,
  closeKeyStore,
  createApiKey,
  createLogger,
  setLogger,
} from '@macts/runtime'
import { createClient } from './local-client.js'

const liveAppsEnabled = process.env['MACTS_LIVE_APPS'] === '1'

/** Generous per-test limit: a cold app launch plus the executor's own time limit. */
const LIVE_TEST_TIMEOUT_MS = 60_000

// The key store resolves MACTS_HOME when its module loads, so the temporary
// home must be in place before any import runs. The live suite mints its key
// there and never touches the user's real key store.
const { mactsHome } = await vi.hoisted(async () => {
  const fs = await import('node:fs')
  const os = await import('node:os')
  const path = await import('node:path')
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'macts-sdk-local-live-'))
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

describe.skipIf(!liveAppsEnabled)('local client against Notes.app (local only)', () => {
  let notes: NotesClient

  beforeAll(async () => {
    const key = await createApiKey({
      name: 'Live local client test',
      permissions: ['notes:accounts:list', 'notes:attachments:list', 'notes:attachments:get'],
    })
    notes = createClient(notesContract, {
      token: key.token,
      governance: { policy: ALLOW_ALL_POLICY },
    })
  })

  it(
    'lists a page of accounts whose entries have a string name',
    async () => {
      const accounts = await notes.accounts.list()

      expect(Array.isArray(accounts.items)).toBe(true)
      for (const account of accounts.items) {
        expect(typeof account.name).toBe('string')
      }
    },
    LIVE_TEST_TIMEOUT_MS
  )

  it(
    'gets an attachment from the first page by its identifier',
    async () => {
      const attachments = await notes.attachments.list()
      const first = attachments.items[0]
      if (first === undefined) {
        // No attachment exists on this Mac, so there is nothing to get.
        return
      }

      const attachment = await notes.attachments.get(first.id)

      expect(attachment.id).toBe(first.id)
    },
    LIVE_TEST_TIMEOUT_MS
  )

  it(
    'rejects a get of a missing attachment with TargetNotFoundError',
    async () => {
      await expect(notes.attachments.get('x-coredata://macts-missing')).rejects.toBeInstanceOf(
        TargetNotFoundError
      )
    },
    LIVE_TEST_TIMEOUT_MS
  )
})
