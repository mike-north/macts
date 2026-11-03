/**
 * Tests for host executor resolution and the built-in test executor hook.
 *
 * @see ../../../../phases/13-sdk-value-and-execution-contracts.md (D9)
 */

import { describe, expect, it } from 'vitest'
import { PASSTHROUGH_PLAN, TargetNotFoundError, type ValuePlan } from '@macts/contracts'
import type { AppManifest, ExecutionRequest } from '@macts/core'
import {
  TEST_EXECUTOR_NAMES,
  TEST_STUB_PROVIDER,
  UnknownTestExecutorError,
  createTestStubExecutor,
  resolveExecutor,
} from './executor.js'

/** The smallest manifest an execution request can carry. */
const MANIFEST: AppManifest = {
  version: '1.0',
  app: { name: 'Widgets', bundleId: 'com.example.widgets', tccEntitlements: [] },
  resources: {},
  enums: {},
  hierarchy: { children: {} },
  suites: [],
  relationships: [],
  commands: {},
}

describe('resolveExecutor', () => {
  it('uses the native executor when MACTS_TEST_EXECUTOR is unset', () => {
    const resolved = resolveExecutor({})

    expect(resolved.kind).toBe('native')
    expect(resolved.executor.provider).toBe('macos')
    expect(resolved.warning).toBeUndefined()
  })

  it.each(['', '   '])('treats MACTS_TEST_EXECUTOR=%j as unset', (value) => {
    const resolved = resolveExecutor({ MACTS_TEST_EXECUTOR: value })

    expect(resolved.kind).toBe('native')
    expect(resolved.warning).toBeUndefined()
  })

  it('selects the built-in stub executor by name', () => {
    const resolved = resolveExecutor({ MACTS_TEST_EXECUTOR: 'stub' })

    expect(resolved.kind).toBe('test')
    expect(resolved.executor.provider).toBe('test-stub')
  })

  it('announces an active test executor with a one-line warning', () => {
    const { warning } = resolveExecutor({ MACTS_TEST_EXECUTOR: 'stub' })

    expect(warning).toBe(
      'Warning: MACTS_TEST_EXECUTOR=stub is set: operations run on the built-in test executor (provider "test-stub"), and no app is automated. This is for tests only.'
    )
    expect(warning).not.toContain('\n')
  })

  it('throws for an unknown name, naming the known ones', () => {
    expect(() => resolveExecutor({ MACTS_TEST_EXECUTOR: 'bogus' })).toThrow(
      UnknownTestExecutorError
    )
    expect(() => resolveExecutor({ MACTS_TEST_EXECUTOR: 'bogus' })).toThrow(
      'MACTS_TEST_EXECUTOR is set to "bogus", which is not a built-in test executor. Known names: stub. Unset MACTS_TEST_EXECUTOR to use the native executor.'
    )
  })

  it.each(['constructor', 'toString', '__proto__', 'hasOwnProperty'])(
    'never treats the inherited object member %j as a test executor',
    (name) => {
      expect(() => resolveExecutor({ MACTS_TEST_EXECUTOR: name })).toThrow(UnknownTestExecutorError)
    }
  )

  it.each(['./stub.js', '/tmp/executor.mjs', 'file:///tmp/executor.mjs', '@macts/stub'])(
    'never loads a module named by MACTS_TEST_EXECUTOR=%j',
    (name) => {
      expect(() => resolveExecutor({ MACTS_TEST_EXECUTOR: name })).toThrow(UnknownTestExecutorError)
    }
  )

  it('ships exactly one built-in test executor', () => {
    expect(TEST_EXECUTOR_NAMES).toEqual(['stub'])
  })
})

/** A record plan with one required text field: what a get or create returns. */
const RECORD_PLAN = {
  kind: 'record',
  fields: { name: { value: { kind: 'string' }, presence: 'required' } },
} as const

/** The plan a list operation returns: an array of records. */
const LIST_PLAN = { kind: 'array', items: RECORD_PLAN } as const

/** An execution request for `target` whose result has `outputPlan`. */
function executionRequest(
  target: ExecutionRequest['target'],
  outputPlan: ValuePlan,
  input: ExecutionRequest['input'] = {}
): ExecutionRequest {
  return { manifest: MANIFEST, target, input, inputPlan: PASSTHROUGH_PLAN, outputPlan }
}

/** The rejection of `promise`, failing the test if it resolves. */
async function rejectionOf(promise: Promise<unknown>): Promise<unknown> {
  return promise.then(
    (value: unknown) => {
      throw new Error(`Expected a rejection, got ${JSON.stringify(value)}`)
    },
    (error: unknown) => error
  )
}

describe('createTestStubExecutor: execute', () => {
  it('answers a list operation with an empty array', async () => {
    const executor = createTestStubExecutor()

    const result = await executor.execute(
      executionRequest({ command: 'list', resource: 'Widget' }, LIST_PLAN)
    )

    expect(executor.provider).toBe(TEST_STUB_PROVIDER)
    expect(result).toEqual([])
  })

  it('answers a paged list window with an empty collection', async () => {
    const executor = createTestStubExecutor()

    const result = await executor.execute({
      ...executionRequest({ command: 'list', resource: 'Widget' }, LIST_PLAN),
      page: { offset: 0, size: 25 },
    })

    expect(result).toEqual({ items: [], length: 0 })
  })

  it.each([
    ['a get', { command: 'get', resource: 'Widget' }, RECORD_PLAN],
    ['a create', { command: 'make', resource: 'Widget' }, RECORD_PLAN],
    ['a delete', { command: 'delete', resource: 'Widget' }, { kind: 'none' }],
  ] as const)('fails %s with TargetNotFoundError naming the resource', async (_, target, plan) => {
    const error = await rejectionOf(
      createTestStubExecutor().execute(executionRequest(target, plan))
    )

    expect(error).toBeInstanceOf(TargetNotFoundError)
    expect((error as TargetNotFoundError).details).toEqual({ resource: 'Widget' })
  })

  it('fails an application command with TargetNotFoundError and no resource', async () => {
    const error = await rejectionOf(
      createTestStubExecutor().execute(executionRequest({ command: 'quit' }, { kind: 'none' }))
    )

    expect(error).toBeInstanceOf(TargetNotFoundError)
    expect((error as TargetNotFoundError).details).toEqual({})
  })

  it('answers a passthrough operation with the target and input it received', async () => {
    const result = await createTestStubExecutor().execute(
      executionRequest({ command: 'list', resource: 'Widget' }, PASSTHROUGH_PLAN, {
        name: 'Sprocket',
      })
    )

    expect(result).toEqual({
      executor: 'test-stub',
      target: { command: 'list', resource: 'Widget' },
      input: { name: 'Sprocket' },
    })
  })

  it('omits the resource of a passthrough application command', async () => {
    const result = await createTestStubExecutor().execute(
      executionRequest({ command: 'quit' }, PASSTHROUGH_PLAN)
    )

    expect(result).toEqual({ executor: 'test-stub', target: { command: 'quit' }, input: {} })
  })
})

describe('createTestStubExecutor: resolve', () => {
  const identity = { resource: 'Widget', form: 'identity', id: 'w-1' } as const

  it('resolves a selector collection to an empty array', async () => {
    const result = await createTestStubExecutor().resolve({
      manifest: MANIFEST,
      reference: {
        resource: 'Widget',
        form: 'selector',
        cardinality: 'many',
        selector: { by: 'range', start: { integer: '0' }, end: { integer: '2' } },
      },
      outputPlan: LIST_PLAN,
    })

    expect(result).toEqual([])
  })

  it('resolves an identity collection with no entries to an empty array', async () => {
    const result = await createTestStubExecutor().resolve({
      manifest: MANIFEST,
      reference: { resource: 'Widget', form: 'identity', cardinality: 'many', entries: [] },
      outputPlan: LIST_PLAN,
    })

    expect(result).toEqual([])
  })

  it('fails an identity collection with entries at its first entry (D7)', async () => {
    const error = await rejectionOf(
      createTestStubExecutor().resolve({
        manifest: MANIFEST,
        reference: {
          resource: 'Widget',
          form: 'identity',
          cardinality: 'many',
          entries: [
            { ...identity, cardinality: 'one' },
            { ...identity, id: 'w-2', cardinality: 'one' },
          ],
        },
        outputPlan: LIST_PLAN,
      })
    )

    expect(error).toBeInstanceOf(TargetNotFoundError)
    expect((error as TargetNotFoundError).details).toEqual({ resource: 'Widget', entryIndex: 0 })
  })

  it('fails a single reference with TargetNotFoundError', async () => {
    const error = await rejectionOf(
      createTestStubExecutor().resolve({
        manifest: MANIFEST,
        reference: { ...identity, cardinality: 'one' },
        outputPlan: RECORD_PLAN,
      })
    )

    expect(error).toBeInstanceOf(TargetNotFoundError)
    expect((error as TargetNotFoundError).details).toEqual({ resource: 'Widget' })
  })

  it('answers a passthrough resolution with the reference it received', async () => {
    const reference = { ...identity, cardinality: 'one' } as const

    const result = await createTestStubExecutor().resolve({
      manifest: MANIFEST,
      reference,
      outputPlan: PASSTHROUGH_PLAN,
    })

    expect(result).toEqual({
      executor: 'test-stub',
      reference: { resource: 'Widget', form: 'identity', id: 'w-1', cardinality: 'one' },
    })
  })
})
