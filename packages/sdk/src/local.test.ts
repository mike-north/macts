/**
 * Tests for the local client, with an injected executor in a temporary
 * `MACTS_HOME`.
 *
 * Calls run through a real Mac-side runtime: the key-store verifier over real
 * keys, permission checks against the manifest, and governance. Only the
 * executor is a recording stub, so "never executed" is observable. Expected
 * outcomes are hand-written from phases/13:
 *
 * - D2: the runtime asserts that each descriptor's permission equals the
 *   manifest's and fails closed on a mismatch; the manifest is validated with
 *   `AppManifestSchema`; encode failures are `ValidationError` and client
 *   decode failures `UnexpectedValueError`.
 * - D4/D9: the executor receives an `ExecutionRequest` with the operation's
 *   typed input and output plans and a wire input record.
 * - D5: local mode runs the same pipeline as remote; there is no shortcut
 *   past verification, permission, or governance. Missing governance files
 *   mean the default policy; malformed ones deny every call with
 *   `InternalError`.
 *
 * @see phases/13-sdk-value-and-execution-contracts.md (D2, D4, D5, D9, D11)
 */

import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { GovernancePolicy } from '@macts/core'
import {
  AuthenticationError,
  InternalError,
  PermissionDeniedError,
  PolicyDeniedError,
  TargetNotFoundError,
  UnexpectedValueError,
  ValidationError,
} from '@macts/contracts'
import {
  ALLOW_ALL_POLICY,
  closeKeyStore,
  createApiKey,
  createLogger,
  OperationRegistrationError,
  setLogger,
  type GovernanceContext,
} from '@macts/runtime'
import { createClient, type LocalClientOptions } from './local-client.js'
import {
  FIXTURE_MANIFEST,
  GET,
  LIST,
  SPROCKET_WIRE,
  createRecordingExecutor,
  fixtureContract,
  rejection,
  type FixtureClient,
  type FixtureContractOptions,
  type RecordingExecutor,
} from './test-helpers.js'

// The key store resolves MACTS_HOME when its module loads, so the temporary
// home must be in place before any import runs.
const { mactsHome } = await vi.hoisted(async () => {
  const fs = await import('node:fs')
  const os = await import('node:os')
  const path = await import('node:path')
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'macts-sdk-local-'))
  process.env['MACTS_HOME'] = home
  delete process.env['MACTS_API_KEY_SECRET']
  return { mactsHome: home }
})

// Denied calls log to the process-wide logger; keep expected failures quiet.
setLogger(createLogger({ level: 'silent' }))

const governanceDir = join(mactsHome, 'governance')
const ALLOW_ALL: GovernanceContext = { policy: ALLOW_ALL_POLICY }
const FORBID_ALL: GovernancePolicy = {
  version: '1',
  defaultDisposition: 'forbidden',
  apps: [],
  tags: [],
}

/** A real key holding `permissions`. */
async function keyWith(...permissions: string[]): Promise<string> {
  const key = await createApiKey({ name: 'Local client test', permissions })
  return key.token
}

/** A local fixture client with a recording executor. */
function localClient(
  token: string,
  options: Omit<LocalClientOptions, 'token' | 'executor'> & {
    readonly executor?: RecordingExecutor
    readonly contract?: FixtureContractOptions
  } = {}
): { client: FixtureClient; executor: RecordingExecutor } {
  const { executor = createRecordingExecutor(), contract, ...rest } = options
  const client = createClient(fixtureContract(contract), { token, executor, ...rest })
  return { client, executor }
}

beforeEach(async () => {
  await rm(governanceDir, { recursive: true, force: true })
})

afterAll(async () => {
  closeKeyStore()
  await rm(mactsHome, { recursive: true, force: true })
})

describe('local client: allowed calls', () => {
  it('runs a permitted call and decodes its result', async () => {
    const token = await keyWith('fixture:widgets:get')
    const { client, executor } = localClient(token, { governance: ALLOW_ALL })

    const widget = await client.widgets.get('w-1')

    // D3: {"integer":"7"} decodes to the number 7.
    expect(widget).toEqual({ name: 'Sprocket', count: 7 })
    expect(executor.requests).toHaveLength(1)
  })

  it('hands the executor the manifest, target, wire input, and the typed plans', async () => {
    const token = await keyWith('fixture:widgets:get')
    const { client, executor } = localClient(token, { governance: ALLOW_ALL })
    const controller = new AbortController()

    await client.widgets.get('w-1', { signal: controller.signal })

    const [request] = executor.requests
    expect(request?.manifest.app).toEqual(FIXTURE_MANIFEST.app)
    expect(request?.target).toEqual({ command: 'get', resource: 'Widget' })
    expect(request?.input).toEqual({ id: 'w-1' })
    // The contract's plans, not passthrough: the native codec converts values.
    expect(request?.inputPlan).toBe(GET.input.plan)
    expect(request?.outputPlan).toBe(GET.output.plan)
    expect(request?.signal).toBe(controller.signal)
  })

  it('decodes a list result', async () => {
    const token = await keyWith('fixture:widgets:list')
    const { client, executor } = localClient(token, { governance: ALLOW_ALL })

    expect(await client.widgets.list()).toEqual([{ name: 'Sprocket', count: 7 }])
    expect(executor.requests[0]?.outputPlan).toBe(LIST.output.plan)
  })

  it('passes a canonical executor failure through as the same class', async () => {
    const token = await keyWith('fixture:widgets:get')
    const failure = new TargetNotFoundError('No such widget.', { resource: 'Widget' })
    const executor = createRecordingExecutor(() => Promise.reject(failure))
    const { client } = localClient(token, { governance: ALLOW_ALL, executor })

    expect(await rejection(client.widgets.get('w-404'))).toBe(failure)
  })
})

describe('local client: the pipeline has no shortcut', () => {
  it('rejects an unknown token', async () => {
    const { client, executor } = localClient('macts_sk_not-a-real-key', { governance: ALLOW_ALL })

    expect(await rejection(client.widgets.get('w-1'))).toBeInstanceOf(AuthenticationError)
    expect(executor.requests).toHaveLength(0)
  })

  it('denies a key without the operation permission, naming it', async () => {
    const token = await keyWith('fixture:widgets:list')
    const { client, executor } = localClient(token, { governance: ALLOW_ALL })

    const error = await rejection(client.widgets.get('w-1'))

    expect(error).toBeInstanceOf(PermissionDeniedError)
    expect(error).toMatchObject({ details: { required: 'fixture:widgets:get' } })
    expect(executor.requests).toHaveLength(0)
  })

  it('denies a call the injected governance forbids', async () => {
    const token = await keyWith('fixture:widgets:get')
    const { client, executor } = localClient(token, { governance: { policy: FORBID_ALL } })

    const error = await rejection(client.widgets.get('w-1'))

    expect(error).toBeInstanceOf(PolicyDeniedError)
    expect(error).toMatchObject({ details: { permission: 'fixture:widgets:get', layer: 'host' } })
    expect(executor.requests).toHaveLength(0)
  })
})

describe("local client: this Mac's governance by default", () => {
  it('runs a permitted call when no governance files exist', async () => {
    const token = await keyWith('fixture:widgets:get')
    const { client, executor } = localClient(token)

    await client.widgets.get('w-1')

    expect(executor.requests).toHaveLength(1)
  })

  it('denies a call the policy file under MACTS_HOME forbids', async () => {
    await mkdir(governanceDir, { recursive: true })
    await writeFile(join(governanceDir, 'policy.json'), JSON.stringify(FORBID_ALL))
    const token = await keyWith('fixture:widgets:get')
    const { client, executor } = localClient(token)

    expect(await rejection(client.widgets.get('w-1'))).toBeInstanceOf(PolicyDeniedError)
    expect(executor.requests).toHaveLength(0)
  })

  it('denies every call with InternalError when the policy file is malformed', async () => {
    await mkdir(governanceDir, { recursive: true })
    await writeFile(join(governanceDir, 'policy.json'), '{ "version": ')
    const token = await keyWith('fixture:widgets:get')
    const { client, executor } = localClient(token)

    expect(await rejection(client.widgets.get('w-1'))).toBeInstanceOf(InternalError)
    expect(await rejection(client.widgets.get('w-1'))).toBeInstanceOf(InternalError)
    expect(executor.requests).toHaveLength(0)
  })
})

describe('local client: setup', () => {
  it('refuses a contract whose permission differs from the manifest, on the first call', async () => {
    const token = await keyWith('fixture:widgets:get', 'fixture:widgets:list')
    const tampered = { ...GET, permission: 'fixture:widgets:list' as const }
    const { client, executor } = localClient(token, {
      governance: ALLOW_ALL,
      contract: { get: tampered },
    })

    const error = await rejection(client.widgets.get('w-1'))

    expect(error).toBeInstanceOf(InternalError)
    if (!(error instanceof InternalError)) return
    expect(error.message).toBe('The fixture client could not be set up.')
    expect(error.cause).toBeInstanceOf(OperationRegistrationError)
    expect(executor.requests).toHaveLength(0)
  })

  it('keeps a failed setup: every later call fails the same way without retrying', async () => {
    const token = await keyWith('fixture:widgets:get', 'fixture:widgets:list')
    const cause = new Error('manifest module missing')
    const loadManifest = vi.fn(() => Promise.reject(cause))
    const { client, executor } = localClient(token, {
      governance: ALLOW_ALL,
      contract: { loadManifest },
    })

    const first = await rejection(client.widgets.get('w-1'))
    const second = await rejection(client.widgets.list())

    for (const error of [first, second]) {
      expect(error).toBeInstanceOf(InternalError)
      if (!(error instanceof InternalError)) return
      expect(error.message).not.toContain('manifest module missing')
      expect(error.cause).toBe(cause)
    }
    expect(loadManifest).toHaveBeenCalledTimes(1)
    expect(executor.requests).toHaveLength(0)
  })

  it('refuses a manifest that fails AppManifestSchema', async () => {
    const token = await keyWith('fixture:widgets:get')
    const { client, executor } = localClient(token, {
      governance: ALLOW_ALL,
      contract: { loadManifest: () => Promise.resolve({ version: '1.0', app: {} }) },
    })

    expect(await rejection(client.widgets.get('w-1'))).toBeInstanceOf(InternalError)
    expect(executor.requests).toHaveLength(0)
  })

  it('loads the manifest once, on the first call, and reuses the registration', async () => {
    const token = await keyWith('fixture:widgets:get', 'fixture:widgets:list')
    const loadManifest = vi.fn(() => Promise.resolve(FIXTURE_MANIFEST))
    const { client } = localClient(token, { governance: ALLOW_ALL, contract: { loadManifest } })

    expect(loadManifest).not.toHaveBeenCalled()
    await client.widgets.get('w-1')
    await client.widgets.list()

    expect(loadManifest).toHaveBeenCalledTimes(1)
  })
})

describe('local client: values', () => {
  it('rejects an input that fails its contract before setup or execution', async () => {
    const token = await keyWith('fixture:widgets:get')
    const loadManifest = vi.fn(() => Promise.resolve(FIXTURE_MANIFEST))
    const { client, executor } = localClient(token, {
      governance: ALLOW_ALL,
      contract: { loadManifest },
    })

    const error = await rejection(client.widgets.get(''))

    expect(error).toBeInstanceOf(ValidationError)
    expect(loadManifest).not.toHaveBeenCalled()
    expect(executor.requests).toHaveLength(0)
  })

  it('rejects a result that fails its contract with UnexpectedValueError', async () => {
    const token = await keyWith('fixture:widgets:get')
    const executor = createRecordingExecutor(() =>
      Promise.resolve({ ...SPROCKET_WIRE, count: { integer: '9007199254740993' } })
    )
    const { client } = localClient(token, { governance: ALLOW_ALL, executor })

    const error = await rejection(client.widgets.get('w-1'))

    expect(error).toBeInstanceOf(UnexpectedValueError)
    expect(error).toMatchObject({ details: { issues: [{ path: ['count'] }] } })
  })
})
