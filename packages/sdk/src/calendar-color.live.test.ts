/**
 * LOCALLY-AUTOMATABLE live check that Calendar's calendar colors read through
 * the local client. NOT run in CI.
 *
 * ## What this tests
 *
 * The automation bridge reports an app color as three fractions in `[0, 1]`,
 * and the native codec converts them to the `rgb` wire form: integer channels
 * in `0..65535` (phases/13 D4). Before that conversion every Calendar calendar
 * read failed on its color (issue #202). All checks are read-only; nothing is
 * created, updated, or deleted:
 *
 *   1. `calendars.list()` resolves, and each calendar's `color`, when present,
 *      has integer channels in `0..65535`.
 *   2. `calendars.get(name)` of a uniquely named listed calendar returns that
 *      calendar with the same color the list reported.
 *
 * ## Why this cannot run in CI
 *
 * - Requires a logged-in macOS desktop with Calendar.app and at least one
 *   calendar.
 * - Requires automation permission (TCC) for the process running the tests to
 *   control Calendar. The first run raises a one-time prompt that only a
 *   person at the Mac can answer; until it is answered, calls hang and then
 *   fail with a timeout.
 *
 * The suite is therefore gated behind `MACTS_LIVE_APPS=1` and skipped
 * everywhere else, including every CI run.
 *
 * ## Local run procedure
 *
 * ```sh
 * MACTS_LIVE_APPS=1 pnpm --filter @macts/sdk exec vitest run src/calendar-color.live.test.ts
 * ```
 *
 * @see phases/13-sdk-value-and-execution-contracts.md (A3, D4)
 * @see https://github.com/mike-north/macts/issues/202
 */

import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { calendarContract, type CalendarClient } from '@macts/calendar/contract'
import type { Rgb } from '@macts/contracts'
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

/** The largest `rgb` wire channel (phases/13 A3). */
const CHANNEL_MAX = 65535

// The key store resolves MACTS_HOME when its module loads, so the temporary
// home must be in place before any import runs. The live suite mints its key
// there and never touches the user's real key store.
const { mactsHome } = await vi.hoisted(async () => {
  const fs = await import('node:fs')
  const os = await import('node:os')
  const path = await import('node:path')
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'macts-sdk-calendar-live-'))
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

/** Assert a color's channels are `rgb` wire channels: integers in `0..65535`. */
function expectWireChannels(color: Rgb): void {
  for (const channel of [color.r, color.g, color.b]) {
    expect(Number.isInteger(channel)).toBe(true)
    expect(channel).toBeGreaterThanOrEqual(0)
    expect(channel).toBeLessThanOrEqual(CHANNEL_MAX)
  }
}

describe.skipIf(!liveAppsEnabled)('Calendar calendar colors (local only)', () => {
  let calendar: CalendarClient

  beforeAll(async () => {
    const key = await createApiKey({
      name: 'Live calendar color test',
      permissions: ['calendar:calendars:list', 'calendar:calendars:get'],
    })
    calendar = createClient(calendarContract, {
      token: key.token,
      governance: { policy: ALLOW_ALL_POLICY },
    })
  })

  it(
    'lists calendars whose colors are integer channels in 0..65535',
    async () => {
      const calendars = await calendar.calendars.list()

      expect(calendars.length).toBeGreaterThan(0)
      for (const entry of calendars) {
        if (entry.color !== null) expectWireChannels(entry.color)
      }
    },
    LIVE_TEST_TIMEOUT_MS
  )

  it(
    'gets a listed calendar by name with the color the list reported',
    async () => {
      const calendars = await calendar.calendars.list()
      // A calendar is found by name, and names can repeat (a Mac can have two
      // "Birthdays" calendars), so only a uniquely named calendar is compared.
      const first = calendars.find(
        (entry) => calendars.filter((other) => other.name === entry.name).length === 1
      )
      if (first === undefined) throw new Error('Calendar has no uniquely named calendar to read.')

      const fetched = await calendar.calendars.get(first.name)

      expect(fetched.name).toBe(first.name)
      expect(fetched.color).toEqual(first.color)
    },
    LIVE_TEST_TIMEOUT_MS
  )
})
