/**
 * The executor seam, exercised end to end without a Mac app.
 *
 * Assembles a runtime the way a host does (the shipped calendar manifest, the
 * key-store verifier over a real key store in a temporary `MACTS_HOME`, and a
 * file audit writer) and wires a second `Executor` implementation at
 * construction: a recording stub. Invocations must reach that stub through the
 * `Executor` interface after the full pipeline has run, which is the CI-runnable
 * proof that dispatch goes through the seam (phases/13 D9, issue #101).
 *
 * @see https://github.com/mike-north/macts/issues/101
 */

import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { createFileAuditWriter, loadManifest, type AppManifest } from '@macts/core'
import { AuthenticationError, PASSTHROUGH_PLAN, type OperationId } from '@macts/contracts'
import { ALLOW_ALL_POLICY } from './governance/active-policy.js'
import { createBearerCredential } from './invocation/credential.js'
import { createApiKey } from './keys/generator.js'
import { closeKeyStore, revokeKey } from './keys/storage.js'
import { createRuntime } from './runtime.js'
import { createRecordingExecutor, fixedClock } from './runtime-test-helpers.js'

// The key store resolves MACTS_HOME when its module loads, so the temporary
// home must be in place before any import runs.
const { mactsHome } = await vi.hoisted(async () => {
  const fs = await import('node:fs')
  const os = await import('node:os')
  const path = await import('node:path')
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'macts-seam-'))
  process.env['MACTS_HOME'] = home
  delete process.env['MACTS_API_KEY_SECRET']
  return { mactsHome: home }
})

const LIST_CALENDARS: OperationId = 'calendar.calendars.list'

let calendar: AppManifest
let auditDir: string

beforeAll(async () => {
  const manifestPath = fileURLToPath(
    new URL('../../../manifests/calendar/app.yaml', import.meta.url)
  )
  calendar = await loadManifest(manifestPath)
  auditDir = await mkdtemp(join(mactsHome, 'audit-'))
})

afterAll(async () => {
  closeKeyStore()
  await rm(mactsHome, { recursive: true, force: true })
})

/** A silent logger, so expected failures do not spawn the default pretty printer. */
const QUIET = { error: vi.fn(), warn: vi.fn(), info: vi.fn() }

describe('executor seam', () => {
  it('dispatches an authorized call to the executor wired at construction', async () => {
    const auditPath = join(auditDir, 'allowed.jsonl')
    const executor = createRecordingExecutor(() => Promise.resolve([{ name: 'Work' }]))
    const runtime = createRuntime({
      executor,
      governance: { policy: ALLOW_ALL_POLICY, writer: createFileAuditWriter(auditPath) },
      clock: fixedClock,
      logger: QUIET,
    })
    runtime.registerManifest(calendar)
    const key = await createApiKey({ name: 'Seam test', permissions: ['calendar:calendars:list'] })

    const result = await runtime.invoke(
      LIST_CALENDARS,
      {},
      {
        credential: createBearerCredential(key.token),
      }
    )

    expect(result).toEqual([{ name: 'Work' }])
    expect(executor.requests).toHaveLength(1)
    expect(executor.requests[0]).toEqual({
      manifest: calendar,
      target: { command: 'list', resource: 'Calendar' },
      input: {},
      inputPlan: PASSTHROUGH_PLAN,
      outputPlan: PASSTHROUGH_PLAN,
    })

    const audit = await readFile(auditPath, 'utf8')
    const records = audit
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line) as Record<string, unknown>)
    expect(records).toHaveLength(1)
    expect(records[0]).toMatchObject({
      capability: 'calendar:calendars:list',
      apiKeyId: key.keyId,
      decision: 'allowed',
      timestamp: '2026-03-04T05:06:07.000Z',
    })
    expect(audit).not.toContain(key.token)
  })

  it('never reaches the executor for a revoked key', async () => {
    const executor = createRecordingExecutor()
    const runtime = createRuntime({ executor, logger: QUIET })
    runtime.registerManifest(calendar)
    const key = await createApiKey({ name: 'Revoked', permissions: ['calendar:calendars:list'] })
    revokeKey(key.keyId)

    const error: unknown = await runtime
      .invoke(LIST_CALENDARS, {}, { credential: createBearerCredential(key.token) })
      .catch((thrown: unknown) => thrown)

    expect(error).toBeInstanceOf(AuthenticationError)
    if (!(error instanceof AuthenticationError)) return
    expect(error.details).toEqual({ reason: 'revoked' })
    expect(executor.requests).toHaveLength(0)
  })

  it('binds each runtime to its own executor', async () => {
    const first = createRecordingExecutor(() => Promise.resolve('first'))
    const second = createRecordingExecutor(() => Promise.resolve('second'))
    const runtimeA = createRuntime({ executor: first, logger: QUIET })
    const runtimeB = createRuntime({ executor: second, logger: QUIET })
    runtimeA.registerManifest(calendar)
    runtimeB.registerManifest(calendar)
    const key = await createApiKey({ name: 'Both', permissions: ['calendar:calendars:list'] })
    const context = { credential: createBearerCredential(key.token) }

    expect(await runtimeA.invoke(LIST_CALENDARS, {}, context)).toBe('first')
    expect(await runtimeB.invoke(LIST_CALENDARS, {}, context)).toBe('second')
    expect(first.requests).toHaveLength(1)
    expect(second.requests).toHaveLength(1)
  })
})
