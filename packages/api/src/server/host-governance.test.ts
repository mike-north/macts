/**
 * The server's default governance: this Mac's, loaded from `MACTS_HOME`.
 *
 * `createServer` without a `governance` option enforces `loadHostGovernance`
 * from `@macts/runtime`. These tests run it in a temporary `MACTS_HOME`, with
 * a recording executor and the fake verifier, and check the outcomes phases/13
 * D5 sets for missing versus malformed configuration and D6 sets for the HTTP
 * envelope:
 *
 * - no policy file → the default policy; a permitted call answers 200;
 * - a policy file that forbids the call → 403 `POLICY_DENIED`;
 * - a malformed policy file → 500 `INTERNAL` for every call, never an allow;
 * - an explicit `governance` option still overrides the default.
 *
 * @see phases/13-sdk-value-and-execution-contracts.md (D5, D6)
 */

import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { closeKeyStore, type GovernanceContext } from '@macts/runtime'
import { createServer } from './index.js'
import {
  ALLOW_ALL,
  CALENDAR_MANIFEST,
  FORBID_ALL,
  READER_TOKEN,
  createCapturedLogger,
  createFakeVerifier,
  createRecordingExecutor,
  errorBody,
  post,
  type RecordingExecutor,
} from './test-helpers.js'

// The key store, which the per-key policy resolver reads, resolves MACTS_HOME
// when its module loads, so the temporary home must be in place before any
// import runs.
const { mactsHome } = await vi.hoisted(async () => {
  const fs = await import('node:fs')
  const os = await import('node:os')
  const path = await import('node:path')
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'macts-api-host-governance-'))
  process.env['MACTS_HOME'] = home
  delete process.env['MACTS_API_KEY_SECRET']
  return { mactsHome: home }
})

const governanceDir = join(mactsHome, 'governance')
const policyPath = join(governanceDir, 'policy.json')
const auditPath = join(governanceDir, 'audit.jsonl')
const LIST = 'calendar.events.list'

/** A server over the calendar fixture with no `governance` option unless one is given. */
function serverApp(governance?: GovernanceContext): {
  app: ReturnType<typeof createServer>['app']
  executor: RecordingExecutor
} {
  const executor = createRecordingExecutor()
  const { app } = createServer(CALENDAR_MANIFEST, {
    cors: false,
    prettyJson: false,
    rateLimit: false,
    executor,
    verifier: createFakeVerifier(),
    logger: createCapturedLogger().logger,
    ...(governance === undefined ? {} : { governance }),
  })
  return { app, executor }
}

beforeEach(async () => {
  await rm(governanceDir, { recursive: true, force: true })
  await mkdir(governanceDir, { recursive: true })
})

afterAll(async () => {
  closeKeyStore()
  await rm(mactsHome, { recursive: true, force: true })
})

describe('createServer: default governance', () => {
  it('runs a permitted call under the default policy when no policy file exists, auditing it', async () => {
    const { app, executor } = serverApp()

    const res = await post(app, LIST, {}, READER_TOKEN)

    expect(res.status).toBe(200)
    expect(executor.requests).toHaveLength(1)
    const audit = await readFile(auditPath, 'utf8')
    expect(JSON.parse(audit.trim())).toMatchObject({
      capability: 'calendar:events:list',
      apiKeyId: 'key_reader',
      decision: 'allowed',
    })
    expect(audit).not.toContain(READER_TOKEN)
  })

  it('enforces the policy file under MACTS_HOME', async () => {
    await writeFile(policyPath, JSON.stringify(FORBID_ALL))
    const { app, executor } = serverApp()

    const res = await post(app, LIST, {}, READER_TOKEN)

    expect(res.status).toBe(403)
    expect((await errorBody(res)).error).toMatchObject({
      code: 'POLICY_DENIED',
      details: { permission: 'calendar:events:list', layer: 'host' },
    })
    expect(executor.requests).toHaveLength(0)
  })

  it('denies every call with 500 INTERNAL when the policy file is malformed, never allowing', async () => {
    await writeFile(policyPath, '{ not json')
    const { app, executor } = serverApp()

    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await post(app, LIST, {}, READER_TOKEN)
      expect(res.status).toBe(500)
      const body = await errorBody(res)
      expect(body.error.code).toBe('INTERNAL')
      expect(body.error.message).not.toContain(policyPath)
    }
    expect(executor.requests).toHaveLength(0)
  })

  it('uses an explicit governance option instead of the files under MACTS_HOME', async () => {
    await writeFile(policyPath, '{ not json')
    const { app, executor } = serverApp({ policy: ALLOW_ALL })

    const res = await post(app, LIST, {}, READER_TOKEN)

    expect(res.status).toBe(200)
    expect(executor.requests).toHaveLength(1)
  })
})
