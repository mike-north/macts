/**
 * Fakes for MCP adapter unit tests.
 *
 * The adapter is a pure transport, so its unit tests need only a runtime that
 * lists operations and answers `invoke`, and a logger that records what the
 * adapter reports. Nothing here ships: production code has no stub runtime.
 */

import { z } from 'zod'
import type { AppManifest } from '@macts/core'
import {
  PASSTHROUGH_PLAN,
  type InvocationContext,
  type OperationId,
  type ValueType,
  type WireValue,
} from '@macts/contracts'
import type { MactsRuntime, RegisteredOperation, RuntimeLogger } from '@macts/runtime'

/** A manifest for operations that are never executed; the adapter never reads it. */
const UNUSED_MANIFEST: AppManifest = {
  version: '1.0',
  app: { name: 'Fixture', bundleId: 'com.example.fixture', tccEntitlements: [] },
  resources: {},
  enums: {},
  hierarchy: { children: {} },
  suites: [],
  relationships: [],
  commands: {},
}

/**
 * A value type that carries only a wire schema. The adapter derives tool
 * schemas from `wire` and never encodes or decodes, so the codecs report a
 * failure if anything calls them.
 */
function wireOnlyType(wire: z.ZodType<WireValue>): ValueType<unknown> {
  const unused = { ok: false, issues: [{ path: [], message: 'Not used by the adapter' }] } as const
  return {
    plan: PASSTHROUGH_PLAN,
    sdk: z.unknown(),
    wire,
    encode: () => unused,
    decode: () => unused,
  }
}

/**
 * A registered operation with the given id and wire input contract.
 *
 * @param id - The operation id.
 * @param wire - The input record's wire schema.
 * @param description - The tool description.
 */
export function fakeOperation(
  id: OperationId,
  wire: z.ZodType<WireValue> = z.object({}).strict(),
  description = `Runs ${id}`
): RegisteredOperation {
  const [app = '', resource = '', command = ''] = id.split('.')
  return {
    descriptor: {
      id,
      permission: `${app}:${resource}:${command}`,
      target: { command },
      description,
      input: wireOnlyType(wire),
      output: wireOnlyType(z.null()),
    },
    manifest: UNUSED_MANIFEST,
    risk: 'read',
  }
}

/** One `invoke` call a stub runtime received. */
export interface InvokeCall {
  readonly id: OperationId
  readonly input: unknown
  readonly context: InvocationContext
}

/** A runtime that lists fixed operations and answers every call with `respond`. */
export interface StubRuntime extends MactsRuntime {
  /** Every `invoke` call, in order. */
  readonly calls: InvokeCall[]
}

/**
 * Build a {@link StubRuntime}.
 *
 * @param operations - What `operations()` lists.
 * @param respond - Produces each call's result, or throws its failure.
 */
export function createStubRuntime(
  operations: readonly RegisteredOperation[],
  respond: (call: InvokeCall) => Promise<WireValue> = () => Promise.resolve(null)
): StubRuntime {
  const calls: InvokeCall[] = []
  return {
    calls,
    registerManifest() {
      throw new Error('The stub runtime does not register apps')
    },
    registerContract() {
      throw new Error('The stub runtime does not register apps')
    },
    operations: () => operations,
    operation: (id) => operations.find((operation) => operation.descriptor.id === id),
    invoke(id, input, context) {
      const call = { id, input, context }
      calls.push(call)
      return respond(call)
    },
  }
}

/** One diagnostic a recording logger received. */
export interface LogEntry {
  readonly level: 'error' | 'warn' | 'info'
  readonly fields: unknown
  readonly message: string | undefined
}

/** A logger that keeps every entry, and the entries it kept. */
export interface RecordingLogger {
  readonly logger: RuntimeLogger
  readonly entries: LogEntry[]
}

/** Build a {@link RecordingLogger}. */
export function createRecordingLogger(): RecordingLogger {
  const entries: LogEntry[] = []
  const at =
    (level: LogEntry['level']) =>
    (fields: unknown, message?: string): void => {
      entries.push({ level, fields, message })
    }
  return { logger: { error: at('error'), warn: at('warn'), info: at('info') }, entries }
}
