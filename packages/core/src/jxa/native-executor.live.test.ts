/**
 * LOCALLY-AUTOMATABLE live checks of the native executor against real apps.
 * NOT run in CI.
 *
 * ## What this tests
 *
 * The native executor, with the shipped Notes manifest, against the real
 * Notes.app:
 *
 *   1. A get by an identifier that matches nothing fails with
 *      `TargetNotFoundError`, never an empty record.
 *   2. A bundle identifier with no installed app fails with
 *      `AppUnavailableError` (`not-installed`).
 *   3. A real list resolves to an array.
 *
 * Unit tests pin the failure classification against hand-written samples of
 * the automation host's output. These checks confirm the samples match what a
 * real app produces on the Mac at hand.
 *
 * ## Why this cannot run in CI
 *
 * - Requires a logged-in macOS desktop with Notes.app.
 * - Requires automation permission (TCC) for the process running the tests to
 *   control Notes. The first run raises a one-time prompt that only a person at
 *   the Mac can answer; until it is answered, calls hang and then fail with a
 *   timeout. CI runners cannot answer it.
 *
 * The suite is therefore gated behind `MACTS_LIVE_APPS=1` and skipped
 * everywhere else, including every CI run.
 *
 * ## Local run procedure
 *
 * ```sh
 * MACTS_LIVE_APPS=1 pnpm --filter @macts/core exec vitest run src/jxa/native-executor.live.test.ts
 * ```
 *
 * If a case times out on first run, answer the automation prompt for the
 * terminal (System Settings > Privacy & Security > Automation) and rerun.
 */

import { fileURLToPath } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'
import {
  AppUnavailableError,
  PASSTHROUGH_PLAN,
  TargetNotFoundError,
  type OperationTarget,
  type WireRecord,
} from '@macts/contracts'
import { loadManifest } from '../manifest/loader.js'
import type { AppManifest } from '../manifest/schemas/app.js'
import { createNativeExecutor } from './native-executor.js'

const liveAppsEnabled = process.env['MACTS_LIVE_APPS'] === '1'

/** Generous per-test limit: a cold app launch plus the executor's own time limit. */
const LIVE_TEST_TIMEOUT_MS = 60_000

describe.skipIf(!liveAppsEnabled)('native executor against Notes.app (local only)', () => {
  let notes: AppManifest

  beforeAll(async () => {
    notes = await loadManifest(
      fileURLToPath(new URL('../../../../manifests/notes/app.yaml', import.meta.url))
    )
  })

  const execute = (manifest: AppManifest, target: OperationTarget, input: WireRecord) =>
    createNativeExecutor().execute({
      manifest,
      target,
      input,
      inputPlan: PASSTHROUGH_PLAN,
      outputPlan: PASSTHROUGH_PLAN,
    })

  it(
    'fails a get by an unknown identifier with TargetNotFoundError',
    async () => {
      // A missing singular target must fail distinctly (phases/13 A5), never as
      // an empty record.
      await expect(
        execute(
          notes,
          { command: 'get', resource: 'Account' },
          { name: 'macts-live-no-such-account-6b1f' }
        )
      ).rejects.toBeInstanceOf(TargetNotFoundError)
    },
    LIVE_TEST_TIMEOUT_MS
  )

  it(
    'fails for a bundle identifier with no installed app as not-installed',
    async () => {
      const missing: AppManifest = {
        ...notes,
        app: { ...notes.app, bundleId: 'com.example.macts.not-installed' },
      }
      const error: unknown = await execute(
        missing,
        { command: 'list', resource: 'Account' },
        {}
      ).catch((thrown: unknown) => thrown)
      expect(error).toBeInstanceOf(AppUnavailableError)
      if (!(error instanceof AppUnavailableError)) return
      expect(error.details).toEqual({ app: 'Notes', reason: 'not-installed' })
    },
    LIVE_TEST_TIMEOUT_MS
  )

  it(
    'lists Notes accounts as an array',
    async () => {
      const result = await execute(notes, { command: 'list', resource: 'Account' }, {})
      expect(Array.isArray(result)).toBe(true)
    },
    LIVE_TEST_TIMEOUT_MS
  )
})
