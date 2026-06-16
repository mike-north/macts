/**
 * LOCALLY-AUTOMATABLE end-to-end benchmark — NOT run in CI.
 *
 * Why this cannot be CI-automatable (per manual-test-design):
 * - It requires a live macOS desktop with Calendar, Finder, Mail, and Reminders
 *   installed and signed in. GitHub Actions runners cannot drive these apps.
 * - It requires the macts API server running locally and a scoped macts API key,
 *   plus a computer-use model API key — passing real model credentials to CI
 *   would incur token costs at API rates and is undesirable.
 *
 * Why it is locally-automatable (not human-verification): once the operator sets
 * the env vars and starts the macts server, this runs to a deterministic
 * pass/fail with no human judgment during execution.
 *
 * Procedure (see ../../README.md for full detail):
 *   1. Start the macts API server locally.
 *   2. Export BENCH_MODEL_API_KEY, MACTS_API_KEY (and optionally MACTS_BASE_URL).
 *   3. Wire the live RawComputerUseRunner and MactsRunner deps (screen
 *      controller, model driver, composed scripts) — see the README's
 *      "Wiring the live runners" section.
 *   4. Run: pnpm --filter @macts-bench/efficiency test:local
 *
 * The whole suite is gated behind the presence of the live env vars so it is a
 * no-op (skipped) anywhere the environment is absent — including CI.
 */

import { describe, expect, it } from 'vitest'
import { ENV, resolveLiveConfig } from '../../src/runners/environment.js'

const liveEnvPresent = Boolean(process.env[ENV.modelApiKey] && process.env[ENV.mactsApiKey])

describe.skipIf(!liveEnvPresent)('live efficiency benchmark (local only)', () => {
  it('resolves a live configuration from the environment', () => {
    const config = resolveLiveConfig(process.env)
    expect(config.mactsApiKey).toBeTruthy()
    expect(config.modelApiKey).toBeTruthy()
  })

  // The full live run is wired here once the operator supplies the live runner
  // dependencies described in the README. It is intentionally left for the
  // operator to enable rather than fabricating an execution path: the spike
  // must not invent numbers. See README "Wiring the live runners".
  it.todo('runs the default task set both ways and asserts macts is cheaper')
})
