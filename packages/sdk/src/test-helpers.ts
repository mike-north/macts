/**
 * A hand-written app contract and fakes for client tests.
 *
 * The contract stands in for a generated one: one resource (`Widget`) and two
 * operations, `get` and `list`, with value types built by hand from zod. The
 * record's `count` field is an integer, so its wire form is the D3 control
 * record `{ "integer": "7" }` and its SDK form is the number `7`. Operation
 * ids, permissions, and targets are derived by hand from the manifest route
 * rules (`app.resource.commandKey`; permission `app:resource:commandKey`):
 *
 * - `fixture.widgets.get`  — `fixture:widgets:get`, target `{ get, Widget }`,
 *   input `{ id }`, result one widget
 * - `fixture.widgets.list` — `fixture:widgets:list`, target `{ list, Widget }`,
 *   input `{}`, result one page of widgets (Widget has no identifier, so the
 *   list does not page and the page holds every widget)
 *
 * Production code has no fixture contract; generated app packages supply real
 * ones.
 *
 * @see phases/13-sdk-value-and-execution-contracts.md (D2, D3)
 */

import { z } from 'zod'
import type { AppManifest, ExecutionRequest, Executor, ResolutionRequest } from '@macts/core'
import {
  INTEGER_LIMITS,
  ValueTypes,
  type Page,
  type PageValueType,
  type AppContract,
  type CallOptions,
  type ClientRuntime,
  type CodecResult,
  type Integer,
  type OperationDescriptor,
  type ValidationIssue,
  type ValuePlan,
  type ValueType,
  type WireValue,
} from '@macts/contracts'

/** The fixture app's manifest. */
export const FIXTURE_MANIFEST: AppManifest = {
  version: '1.0',
  app: { name: 'Fixture', bundleId: 'com.example.fixture', tccEntitlements: [] },
  resources: {
    Widget: {
      name: 'Widget',
      plural: 'Widgets',
      description: 'A widget',
      properties: {},
      // No identifier, as the contract's resource table says: registration
      // refuses a contract whose identifier plans disagree with its manifest.
    },
  },
  enums: {},
  hierarchy: { children: {} },
  suites: [],
  relationships: [],
  commands: {
    get: {
      name: 'get',
      description: 'Get one widget',
      scope: 'resource',
      resourceType: 'Widget',
      parameters: [{ name: 'id', type: 'string', description: 'Widget id', required: true }],
    },
    list: {
      name: 'list',
      description: 'List widgets',
      scope: 'resource',
      resourceType: 'Widget',
      parameters: [],
    },
  },
}

/** A widget as SDK callers see it. */
export interface Widget {
  readonly name: string
  readonly count: Integer
}

/** The fixture app's client, as a generated client interface would declare it. */
export interface FixtureClient {
  readonly widgets: {
    get(id: string, options?: CallOptions): Promise<Widget>
    list(options?: CallOptions): Promise<Page<Widget>>
  }
}

/** Translate zod issues into the canonical issue shape. */
function issuesOf(error: z.ZodError): ValidationIssue[] {
  return error.issues.map((issue) => ({
    path: issue.path.map((segment) => (typeof segment === 'symbol' ? String(segment) : segment)),
    message: issue.message,
    code: issue.code,
  }))
}

/** Report a failed result with one issue at `path`. */
function failure(path: (string | number)[], message: string): CodecResult<never> {
  return { ok: false, issues: [{ path, message }] }
}

/** D3 canonical integer text: no `+`, no leading zeros, no `-0`. */
const INTEGER_TEXT = /^(0|-?[1-9][0-9]*)$/

/** Wire schema of an integer control record. */
const wireIntegerSchema = z.strictObject({ integer: z.string().regex(INTEGER_TEXT) })

/** Decode a D3 integer control record, rejecting anything outside the safe-integer domain. */
function decodeInteger(wire: unknown, path: (string | number)[]): CodecResult<Integer> {
  const parsed = wireIntegerSchema.safeParse(wire)
  if (!parsed.success) {
    return failure(path, 'Expected an integer control record')
  }
  const value = Number(parsed.data.integer)
  if (!Number.isSafeInteger(value) || value < INTEGER_LIMITS.min || value > INTEGER_LIMITS.max) {
    return failure(path, 'Integer is outside the supported domain')
  }
  // The brand is acquired here, by validation, as generated codecs do.
  return { ok: true, value: value as Integer }
}

/** SDK schema of a widget. */
const widgetSdkSchema = z.strictObject({
  name: z.string(),
  count: z.number().int() as unknown as z.ZodType<Integer>,
})

/** Wire schema of a widget. */
const widgetWireSchema = z.strictObject({ name: z.string(), count: wireIntegerSchema })

/** The native plan of a widget record. */
const WIDGET_PLAN: ValuePlan = {
  kind: 'record',
  fields: {
    name: { value: { kind: 'string' }, presence: 'required' },
    count: { value: { kind: 'integer' }, presence: 'required' },
  },
}

/** Decode one widget at `path`. */
function decodeWidget(wire: unknown, path: (string | number)[]): CodecResult<Widget> {
  const shape = z.strictObject({ name: z.string(), count: z.unknown() }).safeParse(wire)
  if (!shape.success) {
    return {
      ok: false,
      issues: issuesOf(shape.error).map((i) => ({ ...i, path: [...path, ...i.path] })),
    }
  }
  const count = decodeInteger(shape.data.count, [...path, 'count'])
  if (!count.ok) return count
  return { ok: true, value: { name: shape.data.name, count: count.value } }
}

/** Value type of one widget. */
export const WIDGET_TYPE: ValueType<Widget> = {
  plan: WIDGET_PLAN,
  sdk: widgetSdkSchema,
  wire: widgetWireSchema as z.ZodType<WireValue>,
  encode(value) {
    const parsed = widgetSdkSchema.safeParse(value)
    if (!parsed.success) return { ok: false, issues: issuesOf(parsed.error) }
    return {
      ok: true,
      value: { name: parsed.data.name, count: { integer: String(parsed.data.count) } },
    }
  },
  decode: (wire) => decodeWidget(wire, []),
}

/**
 * Value type of a page of widgets, the result of every list. Widget has no
 * identifier in the resource table, so its list takes no paging inputs and
 * answers its whole collection as one page.
 */
export const WIDGET_PAGE_TYPE: PageValueType<Widget> = ValueTypes.page(WIDGET_TYPE)

/** SDK and wire schema of the `get` input: one non-empty `id`. */
const getInputSchema = z.strictObject({ id: z.string().min(1) })

/** Value type of the `get` input record. Its wire form equals its SDK form. */
export const GET_INPUT_TYPE: ValueType<{ readonly id: string }> = {
  plan: { kind: 'record', fields: { id: { value: { kind: 'string' }, presence: 'required' } } },
  sdk: getInputSchema,
  wire: getInputSchema,
  encode(value) {
    const parsed = getInputSchema.safeParse(value)
    return parsed.success
      ? { ok: true, value: { id: parsed.data.id } }
      : { ok: false, issues: issuesOf(parsed.error) }
  },
  decode(wire) {
    const parsed = getInputSchema.safeParse(wire)
    return parsed.success
      ? { ok: true, value: parsed.data }
      : { ok: false, issues: issuesOf(parsed.error) }
  },
}

/** SDK and wire schema of the empty `list` input. */
const emptyInputSchema = z.strictObject({})

/** Value type of the empty `list` input record. */
export const EMPTY_INPUT_TYPE: ValueType<Readonly<Record<string, never>>> = {
  plan: { kind: 'record', fields: {} },
  sdk: emptyInputSchema as unknown as z.ZodType<Readonly<Record<string, never>>>,
  wire: emptyInputSchema,
  encode(value) {
    const parsed = emptyInputSchema.safeParse(value)
    return parsed.success ? { ok: true, value: {} } : { ok: false, issues: issuesOf(parsed.error) }
  },
  decode(wire) {
    const parsed = emptyInputSchema.safeParse(wire)
    return parsed.success ? { ok: true, value: {} } : { ok: false, issues: issuesOf(parsed.error) }
  },
}

/** The `get` descriptor. */
export const GET: OperationDescriptor<{ readonly id: string }, Widget> = {
  id: 'fixture.widgets.get',
  permission: 'fixture:widgets:get',
  target: { command: 'get', resource: 'Widget' },
  description: 'Get one widget',
  input: GET_INPUT_TYPE,
  output: WIDGET_TYPE,
}

/** The `list` descriptor. */
export const LIST: OperationDescriptor<Readonly<Record<string, never>>, Page<Widget>> = {
  id: 'fixture.widgets.list',
  permission: 'fixture:widgets:list',
  target: { command: 'list', resource: 'Widget' },
  description: 'List widgets',
  input: EMPTY_INPUT_TYPE,
  output: WIDGET_PAGE_TYPE,
}

/** What a test varies about the fixture contract. */
export interface FixtureContractOptions {
  /** Replaces the `get` descriptor, for example with a tampered permission. */
  readonly get?: OperationDescriptor<{ readonly id: string }, Widget>
  /** Replaces the manifest loader. */
  readonly loadManifest?: () => Promise<unknown>
}

/**
 * Build the fixture contract. `bind` maps the two positional methods onto
 * `runtime.invoke`, as a generated `bind` does.
 */
export function fixtureContract(options: FixtureContractOptions = {}): AppContract<FixtureClient> {
  const get = options.get ?? GET
  return {
    app: 'fixture',
    operations: { [get.id]: get, [LIST.id]: LIST },
    resources: {
      Widget: { name: 'Widget', record: WIDGET_TYPE, get: get.id, list: LIST.id },
    },
    loadManifest: options.loadManifest ?? (() => Promise.resolve(FIXTURE_MANIFEST)),
    bind(runtime: ClientRuntime): FixtureClient {
      return {
        widgets: {
          get: (id, callOptions) => runtime.invoke(get, { id }, callOptions),
          list: (callOptions) => runtime.invoke(LIST, {}, callOptions),
        },
      }
    },
  }
}

/** The wire form of the widget `{ name: 'Sprocket', count: 7 }`. */
export const SPROCKET_WIRE = { name: 'Sprocket', count: { integer: '7' } } as const

/** An executor that records every request and answers with `respond`. */
export interface RecordingExecutor extends Executor {
  /** Every execution request received, in order. */
  readonly requests: ExecutionRequest[]
  /** Every resolution request received, in order. */
  readonly resolutions: ResolutionRequest[]
}

/**
 * Build a {@link RecordingExecutor}. By default `get` answers
 * {@link SPROCKET_WIRE} and `list` answers a one-element list of it; likewise
 * a single reference resolves to {@link SPROCKET_WIRE} and a collection to a
 * one-element list of it.
 */
export function createRecordingExecutor(
  respond: (request: ExecutionRequest) => Promise<WireValue> = (request) =>
    Promise.resolve(request.target.command === 'list' ? [SPROCKET_WIRE] : SPROCKET_WIRE),
  respondToResolution: (request: ResolutionRequest) => Promise<WireValue> = (request) =>
    Promise.resolve(request.reference.cardinality === 'many' ? [SPROCKET_WIRE] : SPROCKET_WIRE)
): RecordingExecutor {
  const requests: ExecutionRequest[] = []
  const resolutions: ResolutionRequest[] = []
  return {
    provider: 'recording-stub',
    requests,
    resolutions,
    execute(request) {
      requests.push(request)
      return respond(request)
    },
    resolve(request) {
      resolutions.push(request)
      return respondToResolution(request)
    },
  }
}

/** Await `promise`, expecting it to reject, and return what it rejected with. */
export async function rejection(promise: Promise<unknown>): Promise<unknown> {
  return promise.then(
    () => {
      throw new Error('expected the call to fail')
    },
    (error: unknown) => error
  )
}

/** Call `run`, expecting it to throw, and return what it threw. */
export function thrownBy(run: () => unknown): unknown {
  try {
    run()
  } catch (error) {
    return error
  }
  throw new Error('expected the call to throw')
}
