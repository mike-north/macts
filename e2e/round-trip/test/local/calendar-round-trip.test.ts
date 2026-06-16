/**
 * LOCALLY-AUTOMATABLE end-to-end round-trip gate — NOT run in CI.
 *
 * ## What this tests
 *
 * A full create→list cycle against the real Calendar.app via the macts API
 * server, using `@macts/calendar`'s `CalendarClient` directly. Specifically:
 *
 *   1. `calendars.list()` returns at least one calendar with a non-empty `id`.
 *   2. `events.create({ calendarId: id, ... })` succeeds (HTTP 200, no error).
 *   3. The created event appears in a subsequent `events.list(calendarId)` call.
 *
 * This would have caught both #30 (list executor not populating `id`) and #81
 * (Calendar bundle identifier non-functional, causing every RPC call to fail).
 *
 * ## Why this CURRENTLY FAILS against main
 *
 * As of the time this test was written, `@macts/calendar` suffers from the
 * bug tracked in #81: the Calendar app bundle identifier used by the JXA layer
 * is non-functional, so every API call that reaches Calendar.app will fail.
 * This test will PASS once #83 (the fix for #81) is merged into main.
 *
 * The test is committed in its failing state intentionally — that is the point.
 * It is the regression guard that would have caught #30 and #81 before they
 * shipped. Attest-it sealing records a "PASS" only after a maintainer has
 * verified that the test passes locally with a working server, and CI enforces
 * that seal so the fix cannot regress.
 *
 * ## Why this cannot run in CI
 *
 * - Requires a live macOS desktop with Calendar.app installed and signed into
 *   at least one calendar account.
 * - Requires Calendar automation permission granted to the macts server process
 *   (TCC — Transparency, Consent, and Control).
 * - Requires the macts API server running locally (`macts --serve`).
 * - Requires a scoped macts API key (`MACTS_API_KEY`).
 *
 * GitHub Actions runners cannot drive Calendar.app, and the macts server is
 * not started in CI. The suite is therefore gated behind the presence of
 * `MACTS_API_KEY` (and optionally `MACTS_API_URL`) so it is automatically
 * skipped wherever those variables are absent — including every CI run.
 *
 * ## Local run procedure
 *
 * 1. Start the macts API server:
 *    ```sh
 *    macts --serve   # default: http://localhost:8372
 *    ```
 *
 * 2. Create a scoped API key:
 *    ```sh
 *    macts api-key create \
 *      --name "e2e-round-trip" \
 *      --permission "calendar:calendars:list" \
 *      --permission "calendar:events:create" \
 *      --permission "calendar:events:list"
 *    ```
 *
 * 3. Export the key and (optionally) a non-default server URL:
 *    ```sh
 *    export MACTS_API_KEY=<token from above>
 *    export MACTS_API_URL=http://localhost:8372   # optional — this is the default
 *    ```
 *
 * 4. Run the suite:
 *    ```sh
 *    pnpm --filter @macts-e2e/round-trip test:local
 *    ```
 *
 * 5. Seal the result with attest-it (requires a PASS first):
 *    ```sh
 *    pnpm dlx @attest-it/cli seal \
 *      --suite e2e/test/local/calendar-round-trip.test.ts \
 *      --sources e2e/src/harness.ts \
 *      --sources packages/calendar/src
 *    ```
 *    This writes a seal file that CI verifies. The seal automatically
 *    invalidates whenever the harness source or Calendar SDK source changes,
 *    ensuring a stale seal cannot pass CI after a regression is introduced.
 *
 * ## Cleanup
 *
 * The test event is created with summary "[macts-e2e] round-trip gate test
 * event". The `events.delete()` operation is not yet exposed by the generated
 * Calendar SDK (tracked in #84), so cleanup must be done manually in
 * Calendar.app. The "[macts-e2e]" prefix makes the test event easy to find
 * and remove. Once `events.delete()` is added to the SDK the test can be
 * updated to clean up automatically.
 */

import { describe, expect, it } from 'vitest'
import { CalendarClient } from '@macts/calendar'
import { runCalendarRoundTrip } from '../../src/harness.js'

// Gate: skip the entire suite if the live environment is absent.
// MACTS_API_KEY is the canonical signal that the macts server is reachable and
// the operator has set up the preconditions. Without it the test is a no-op
// (all describe/it blocks are skipped) so CI stays green.
const liveEnvPresent = Boolean(process.env['MACTS_API_KEY'])

describe.skipIf(!liveEnvPresent)(
  'Calendar E2E round-trip (local only — requires live server + Calendar.app)',
  () => {
    it('create→list round-trip succeeds and the new event appears in list', async () => {
      // liveEnvPresent guards this block — MACTS_API_KEY is guaranteed non-empty here.
      // The guard above checks Boolean(process.env['MACTS_API_KEY']) before entering
      // this describe, so the empty-string fallback is unreachable in practice.
      const apiKey = process.env['MACTS_API_KEY'] ?? ''
      const client = new CalendarClient({
        apiKey,
        baseUrl: process.env['MACTS_API_URL'] ?? 'http://localhost:8372',
      })

      // runCalendarRoundTrip throws on any invariant violation, so a passing
      // test is a full structural pass — not just "no exception".
      const result = await runCalendarRoundTrip(client)

      // Each assertion maps to a specific acceptance criterion from issue #84:
      //
      //   Criterion 1: create→list→delete works (list portion here; delete
      //   tracked until events.delete() is added to SDK).
      expect(result.appearedInList).toBe(true) // criterion 1: list found the created event
      expect(result.calendarId).toBeTruthy() // criterion 1: a writable calendar was identified
      expect(result.calendarName).toBeTruthy() // sanity: server returned a real calendar name

      // Criterion 2 is attested externally by attest-it (see procedure above).
      // Criterion 3 (extensible) is satisfied by the harness design: adding
      // Finder/Mail/Reminders requires only a new runXxxRoundTrip() function
      // and a new describe block — no harness changes needed.
    })
  }
)
