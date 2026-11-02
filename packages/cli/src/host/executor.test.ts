/**
 * Tests for host executor resolution and the built-in test executor hook.
 *
 * @see ../../../../phases/13-sdk-value-and-execution-contracts.md (D9)
 */

import { describe, expect, it } from 'vitest'
import { PASSTHROUGH_PLAN } from '@macts/contracts'
import type { AppManifest } from '@macts/core'
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

describe('createTestStubExecutor', () => {
  it('answers with the target and input it received', async () => {
    const executor = createTestStubExecutor()

    const result = await executor.execute({
      manifest: MANIFEST,
      target: { command: 'list', resource: 'Widget' },
      input: { name: 'Sprocket' },
      inputPlan: PASSTHROUGH_PLAN,
      outputPlan: PASSTHROUGH_PLAN,
    })

    expect(executor.provider).toBe(TEST_STUB_PROVIDER)
    expect(result).toEqual({
      executor: 'test-stub',
      target: { command: 'list', resource: 'Widget' },
      input: { name: 'Sprocket' },
    })
  })

  it('omits the resource for an application command', async () => {
    const result = await createTestStubExecutor().execute({
      manifest: MANIFEST,
      target: { command: 'quit' },
      input: {},
      inputPlan: PASSTHROUGH_PLAN,
      outputPlan: PASSTHROUGH_PLAN,
    })

    expect(result).toEqual({ executor: 'test-stub', target: { command: 'quit' }, input: {} })
  })

  it('answers a resolution with the reference it received', async () => {
    const reference = {
      resource: 'Widget',
      form: 'selector',
      cardinality: 'many',
      selector: { by: 'range', start: { integer: '0' }, end: { integer: '2' } },
    } as const

    const result = await createTestStubExecutor().resolve({
      manifest: MANIFEST,
      reference,
      outputPlan: PASSTHROUGH_PLAN,
    })

    expect(result).toEqual({
      executor: 'test-stub',
      reference: {
        resource: 'Widget',
        form: 'selector',
        cardinality: 'many',
        selector: { by: 'range', start: { integer: '0' }, end: { integer: '2' } },
      },
    })
  })
})
