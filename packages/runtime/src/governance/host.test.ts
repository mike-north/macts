/**
 * Tests for this Mac's governance, loaded from `MACTS_HOME`.
 *
 * Every case runs a real runtime with `loadHostGovernance` as its governance
 * loader, the key-store verifier over a real key store, and a recording
 * executor, in a temporary `MACTS_HOME`. Expected outcomes are hand-written
 * from phases/13 D5 ("Missing versus malformed" and the fail-closed rules):
 *
 * - no policy file → the default policy, and a permitted key's call runs;
 * - a policy file → it is enforced;
 * - a malformed or unreadable policy file, or a malformed approval
 *   registration → every call is denied with `InternalError`, never allowed;
 * - an audit record that cannot be written → the call is denied and never
 *   reaches the executor.
 *
 * @see phases/13-sdk-value-and-execution-contracts.md (D5)
 */

import { chmod, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { GovernancePolicy } from '@macts/core'
import { InternalError, PolicyDeniedError, type OperationId } from '@macts/contracts'
import { createBearerCredential } from '../invocation/credential.js'
import { createApiKey } from '../keys/generator.js'
import { closeKeyStore } from '../keys/storage.js'
import { createRuntime, type MactsRuntime } from '../runtime.js'
import {
  CALENDAR_MANIFEST,
  FORBID_ALL,
  createRecordingExecutor,
  fixedClock,
  type RecordingExecutor,
} from '../runtime-test-helpers.js'
import { ActivePolicyError, ALLOW_ALL_POLICY, getActivePolicyPath } from './active-policy.js'
import { ApprovalProviderError, getApprovalConfigPath } from './approval-provider.js'
import { getAuditLogPath, loadHostGovernance } from './host.js'

// The key store resolves MACTS_HOME when its module loads, so the temporary
// home must be in place before any import runs.
const { mactsHome } = await vi.hoisted(async () => {
  const fs = await import('node:fs')
  const os = await import('node:os')
  const path = await import('node:path')
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'macts-host-governance-'))
  process.env['MACTS_HOME'] = home
  delete process.env['MACTS_API_KEY_SECRET']
  return { mactsHome: home }
})

const LIST: OperationId = 'calendar.events.list'
const governanceDir = join(mactsHome, 'governance')

/** Whether this process ignores file modes, so an unreadable file cannot be made. */
const RUNNING_AS_ROOT = process.getuid?.() === 0

/** A silent logger, so expected failures do not reach the default logger. */
const QUIET = { error: vi.fn(), warn: vi.fn(), info: vi.fn() }

/** A policy that allows calendar and forbids everything else. */
const CALENDAR_ONLY: GovernancePolicy = {
  version: '1',
  defaultDisposition: 'forbidden',
  apps: [
    {
      app: 'calendar',
      disposition: 'allowed',
      operations: [],
      restrictions: { pathsAllow: [], pathsDeny: [], urlsAllow: [], urlsDeny: [] },
      tags: [],
    },
  ],
  tags: [],
}

/** A runtime over the calendar fixture, governed by this Mac's governance. */
function hostRuntime(): { runtime: MactsRuntime; executor: RecordingExecutor } {
  const executor = createRecordingExecutor()
  const runtime = createRuntime({
    executor,
    governance: loadHostGovernance,
    clock: fixedClock,
    logger: QUIET,
  })
  runtime.registerManifest(CALENDAR_MANIFEST)
  return { runtime, executor }
}

/** A real key holding `calendar:events:list`. */
async function listKey(): Promise<{ token: string; keyId: string }> {
  return createApiKey({ name: 'Host governance test', permissions: ['calendar:events:list'] })
}

/** The local cause an internal error carries, for checking which failure denied the call. */
function causeOf(error: unknown): unknown {
  expect(error).toBeInstanceOf(InternalError)
  return error instanceof InternalError ? error.cause : undefined
}

/** Invoke `LIST` with `token` and return what the call rejected with. */
async function rejectionOf(runtime: MactsRuntime, token: string): Promise<unknown> {
  return runtime.invoke(LIST, {}, { credential: createBearerCredential(token) }).then(
    () => {
      throw new Error('expected the call to be denied')
    },
    (error: unknown) => error
  )
}

beforeEach(async () => {
  await rm(governanceDir, { recursive: true, force: true })
  await mkdir(governanceDir, { recursive: true })
})

afterAll(async () => {
  closeKeyStore()
  await rm(mactsHome, { recursive: true, force: true })
})

describe('loadHostGovernance: locations', () => {
  it('reads and writes under MACTS_HOME/governance', () => {
    expect(getActivePolicyPath()).toBe(join(mactsHome, 'governance', 'policy.json'))
    expect(getApprovalConfigPath()).toBe(join(mactsHome, 'governance', 'approval.json'))
    expect(getAuditLogPath()).toBe(join(mactsHome, 'governance', 'audit.jsonl'))
  })
})

describe('loadHostGovernance: missing files', () => {
  it('composes the default policy, the key-policy resolver, and an audit writer, with no approval gate', async () => {
    const governance = await loadHostGovernance()

    expect(governance.policy).toBe(ALLOW_ALL_POLICY)
    expect(governance.keyPolicies).toBeDefined()
    expect(governance.writer).toBeDefined()
    expect(governance.approvals).toBeUndefined()
  })

  it('lets a permitted key call run and audits it under MACTS_HOME', async () => {
    const { runtime, executor } = hostRuntime()
    const key = await listKey()

    const result = await runtime.invoke(LIST, {}, { credential: createBearerCredential(key.token) })

    expect(result).toEqual({ events: [] })
    expect(executor.requests).toHaveLength(1)
    const audit = await readFile(getAuditLogPath(), 'utf8')
    const records = audit
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line) as Record<string, unknown>)
    expect(records).toHaveLength(1)
    expect(records[0]).toMatchObject({
      capability: 'calendar:events:list',
      apiKeyId: key.keyId,
      decision: 'allowed',
    })
    expect(audit).not.toContain(key.token)
  })
})

describe('loadHostGovernance: configured policy', () => {
  it('enforces a policy file that forbids the call', async () => {
    await writeFile(getActivePolicyPath(), JSON.stringify(FORBID_ALL))
    const { runtime, executor } = hostRuntime()
    const key = await listKey()

    const error = await rejectionOf(runtime, key.token)

    expect(error).toBeInstanceOf(PolicyDeniedError)
    expect(error).toMatchObject({ details: { permission: 'calendar:events:list', layer: 'host' } })
    expect(executor.requests).toHaveLength(0)
  })

  it('enforces a policy file that allows the call', async () => {
    await writeFile(getActivePolicyPath(), JSON.stringify(CALENDAR_ONLY))
    const { runtime, executor } = hostRuntime()
    const key = await listKey()

    await runtime.invoke(LIST, {}, { credential: createBearerCredential(key.token) })

    expect(executor.requests).toHaveLength(1)
  })

  it('honors overridden locations', async () => {
    const policyPath = join(mactsHome, 'elsewhere-policy.json')
    const auditLogPath = join(mactsHome, 'elsewhere', 'audit.jsonl')
    await writeFile(policyPath, JSON.stringify(CALENDAR_ONLY))

    const governance = await loadHostGovernance({ policyPath, auditLogPath })

    expect(governance.policy.defaultDisposition).toBe('forbidden')
    expect(governance.policy.apps.map((app) => app.app)).toEqual(['calendar'])
    await rm(policyPath)
  })
})

describe('loadHostGovernance: fails closed', () => {
  it('denies every call with an internal error when the policy file is malformed', async () => {
    await writeFile(getActivePolicyPath(), '{ "version": "1", "defaultDisposition": ')
    const { runtime, executor } = hostRuntime()
    const key = await listKey()

    const first = await rejectionOf(runtime, key.token)
    const second = await rejectionOf(runtime, key.token)

    expect(causeOf(first)).toBeInstanceOf(ActivePolicyError)
    expect(causeOf(second)).toBeInstanceOf(ActivePolicyError)
    expect(executor.requests).toHaveLength(0)
  })

  it('denies with an internal error when the policy file is valid JSON but not a policy', async () => {
    await writeFile(getActivePolicyPath(), JSON.stringify({ defaultDisposition: 'whatever' }))
    const { runtime, executor } = hostRuntime()
    const key = await listKey()

    expect(causeOf(await rejectionOf(runtime, key.token))).toBeInstanceOf(ActivePolicyError)
    expect(executor.requests).toHaveLength(0)
  })

  it.skipIf(RUNNING_AS_ROOT)(
    'denies with an internal error when the policy file cannot be read',
    async () => {
      await writeFile(getActivePolicyPath(), JSON.stringify(ALLOW_ALL_POLICY))
      await chmod(getActivePolicyPath(), 0o000)
      try {
        const { runtime, executor } = hostRuntime()
        const key = await listKey()

        expect(causeOf(await rejectionOf(runtime, key.token))).toMatchObject({ code: 'EACCES' })
        expect(executor.requests).toHaveLength(0)
      } finally {
        await chmod(getActivePolicyPath(), 0o600)
      }
    }
  )

  it('denies with an internal error when the approval registration is malformed', async () => {
    await writeFile(getApprovalConfigPath(), 'not json')
    const { runtime, executor } = hostRuntime()
    const key = await listKey()

    expect(causeOf(await rejectionOf(runtime, key.token))).toBeInstanceOf(ApprovalProviderError)
    expect(executor.requests).toHaveLength(0)
  })

  it('denies with an internal error when the audit record cannot be written', async () => {
    // A directory where the audit log should be makes every append fail.
    await mkdir(getAuditLogPath())
    const { runtime, executor } = hostRuntime()
    const key = await listKey()

    expect(causeOf(await rejectionOf(runtime, key.token))).toMatchObject({ code: 'EISDIR' })
    expect(executor.requests).toHaveLength(0)
  })
})
