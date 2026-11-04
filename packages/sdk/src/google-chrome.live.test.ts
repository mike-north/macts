/**
 * LOCALLY-AUTOMATABLE live check of the Google Chrome window and tab reads
 * against the real app. NOT run in CI.
 *
 * ## What this tests
 *
 * Through `@macts/sdk/local`'s `createClient`, with the default native
 * executor and a real API key, end to end through the invocation pipeline
 * (verify, permission, governance, validate input, execute, validate output):
 *
 *   1. `windows.list`, then `windows.get` of the first listed window, which
 *      must come back with the same id;
 *   2. `tabs.list` of that window, then `tabs.get` of its first tab by the
 *      window's id and the tab's id, which must come back with the same id.
 *
 * A tab is read only within its window: the dictionary has `tab` only as an
 * element of `window`. Window and tab ids hold within the running Chrome
 * session; nothing here assumes they survive a relaunch.
 *
 * Read-only: nothing is opened, closed, reloaded or navigated. The test
 * prints only counts, never an id, title or address.
 *
 * ## Why this cannot run in CI
 *
 * - Requires a logged-in macOS desktop with Google Chrome running and at
 *   least one window with a tab.
 * - Requires automation permission (TCC) for the process running the tests to
 *   control Chrome. The first run raises a one-time prompt that only a person
 *   at the Mac can answer; until it is answered, calls hang and then fail
 *   with a timeout.
 *
 * The suite is therefore gated behind `MACTS_LIVE_APPS=1` and skipped
 * everywhere else, including every CI run.
 *
 * ## Local run procedure
 *
 * ```sh
 * MACTS_LIVE_APPS=1 pnpm --filter @macts/sdk exec vitest run src/google-chrome.live.test.ts
 * ```
 *
 * @see ../../../manifests/google-chrome/app.yaml
 * @see ../../../phases/13-sdk-value-and-execution-contracts.md (D10 command parents)
 */

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { googleChromeContract, type GoogleChromeClient } from '@macts/google-chrome/contract'
import {
  ALLOW_ALL_POLICY,
  closeKeyStore,
  createApiKey,
  createLogger,
  setLogger,
} from '@macts/runtime'
import { createClient } from './local-client.js'

const liveAppsEnabled = process.env['MACTS_LIVE_APPS'] === '1'

/** Per-test limit: a cold app launch plus the executor's own 30 s limit, for two reads. */
const LIVE_TEST_TIMEOUT_MS = 120_000

// The key store resolves MACTS_HOME when its module loads, so the temporary
// home must be in place before any import runs. The live suite mints its key
// there and never touches the user's real key store.
const { mactsHome } = await vi.hoisted(async () => {
  const fs = await import('node:fs')
  const os = await import('node:os')
  const path = await import('node:path')
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'macts-sdk-chrome-live-'))
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

describe.skipIf(!liveAppsEnabled)('Google Chrome window and tab reads (local only)', () => {
  let chrome: GoogleChromeClient
  let windowId: string | undefined

  beforeAll(async () => {
    const key = await createApiKey({
      name: 'Live Chrome reads test',
      permissions: [
        'google-chrome:windows:list',
        'google-chrome:windows:get',
        'google-chrome:tabs:list',
        'google-chrome:tabs:get',
      ],
    })
    chrome = createClient(googleChromeContract, {
      token: key.token,
      governance: { policy: ALLOW_ALL_POLICY },
    })
  }, LIVE_TEST_TIMEOUT_MS)

  it(
    'lists windows and gets the first by its id',
    async () => {
      const windows = await chrome.windows.list()
      const ids = windows.items.map((window) => window.id)
      console.info(`Chrome windows listed: ${String(ids.length)}`)
      expect(ids.length).toBeGreaterThan(0)
      expect(new Set(ids).size).toBe(ids.length)
      const [first] = ids
      if (first === undefined) return
      const got = await chrome.windows.get(first)
      expect(got.id === first).toBe(true)
      windowId = first
    },
    LIVE_TEST_TIMEOUT_MS
  )

  it(
    'lists the tabs of that window and gets the first by the window and its id',
    async () => {
      if (windowId === undefined) throw new Error('no window was listed')
      const tabs = await chrome.tabs.list(windowId)
      const ids = tabs.items.map((tab) => tab.id)
      console.info(`Chrome tabs listed in the first window: ${String(ids.length)}`)
      expect(ids.length).toBeGreaterThan(0)
      expect(new Set(ids).size).toBe(ids.length)
      const [first] = ids
      if (first === undefined) return
      const got = await chrome.tabs.get(windowId, first)
      expect(got.id === first).toBe(true)
    },
    LIVE_TEST_TIMEOUT_MS
  )
})
