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
 * - a malformed policy file → 500 `INTERNAL` for every call that passes the
 *   permission check, never an allow; a caller without the permission is
 *   still answered 403 `PERMISSION_DENIED`, and the denial record that cannot
 *   be written without the audit log is reported in the operator log instead;
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
  ERROR,
  errorBody,
  post,
  type CapturedLogger,
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
const CREATE = 'calendar.events.create'

/** A server over the calendar fixture with no `governance` option unless one is given. */
function serverApp(governance?: GovernanceContext): {
  app: ReturnType<typeof createServer>['app']
  executor: RecordingExecutor
  log: CapturedLogger
} {
  const executor = createRecordingExecutor()
  const log = createCapturedLogger()
  const { app } = createServer(CALENDAR_MANIFEST, {
    cors: false,
    prettyJson: false,
    rateLimit: false,
    executor,
    verifier: createFakeVerifier(),
    logger: log.logger,
    ...(governance === undefined ? {} : { governance }),
  })
  return { app, executor, log }
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

  it('denies every call that passes the permission check with 500 INTERNAL when the policy file is malformed, never allowing', async () => {
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

  it('still answers a caller without the permission 403 PERMISSION_DENIED when the policy file is malformed, logging the unwritten record', async () => {
    // The reader lacks `calendar:events:create`. Under a readable policy its
    // call is answered 403 and recorded as `permission-denied`.
    const reference = serverApp()
    const referenceRes = await post(reference.app, CREATE, { summary: 'Standup' }, READER_TOKEN)
    expect(referenceRes.status).toBe(403)
    const expected = await errorBody(referenceRes)
    expect(expected.error.code).toBe('PERMISSION_DENIED')
    expect(JSON.parse((await readFile(auditPath, 'utf8')).trim())).toMatchObject({
      capability: 'calendar:events:create',
      apiKeyId: 'key_reader',
      decision: 'permission-denied',
    })

    await writeFile(policyPath, '{ not json')
    const { app, executor, log } = serverApp()

    // A valid and an invalid body get the same answer as under a readable policy.
    for (const body of [{ summary: 'Standup' }, { summary: 42 }]) {
      const res = await post(app, CREATE, body, READER_TOKEN)
      expect(res.status).toBe(403)
      expect(await errorBody(res)).toEqual(expected)
    }
    expect(executor.requests).toHaveLength(0)
    // Nothing more reached the audit log: the record could not be written.
    expect((await readFile(auditPath, 'utf8')).trim().split('\n')).toHaveLength(1)
    // Each denial that could not be recorded is one operator log line.
    const errors = log.entriesAt(ERROR)
    expect(errors).toHaveLength(2)
    for (const entry of errors) {
      expect(entry).toMatchObject({
        msg: 'Permission denial could not be audited',
        operation: CREATE,
        permission: 'calendar:events:create',
        apiKeyId: 'key_reader',
      })
    }
    const logged = log.lines.join('\n')
    expect(logged).not.toContain('Standup')
    expect(logged).not.toContain(READER_TOKEN)
  })

  it('uses an explicit governance option instead of the files under MACTS_HOME', async () => {
    await writeFile(policyPath, '{ not json')
    const { app, executor } = serverApp({ policy: ALLOW_ALL })

    const res = await post(app, LIST, {}, READER_TOKEN)

    expect(res.status).toBe(200)
    expect(executor.requests).toHaveLength(1)
  })
})
