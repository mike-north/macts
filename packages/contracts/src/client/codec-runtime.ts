/**
 * The value-codec half of every client runtime, shared by the remote and local
 * clients.
 *
 * A client call has the same shape in both localities: encode the SDK value
 * through its contract, send the wire value somewhere that runs it, and decode
 * the wire result through the contract of what ran. Only the middle step
 * differs (an HTTP request, or the Mac-side runtime). This module owns the two
 * outer steps and the decode context, so both clients validate at the same
 * boundaries (phases/13 D11) and raise the same canonical errors for the same
 * failures:
 *
 * - an input, or a reference to resolve, that fails its contract raises
 *   `ValidationError` before anything is sent;
 * - a result that fails its contract raises `UnexpectedValueError`, as does
 *   the resolution of an identity collection that does not hold exactly one
 *   record per entry.
 *
 * There are two kinds of call. `invoke` runs an operation. `resolve` resolves
 * a reference (phases/13 D7): it re-encodes the reference's data through the
 * app's reference value type, so the canonical wire form is what is sent,
 * never a replay of wire the client once received, and it decodes the result
 * with the output contract of the operation the reference resolves as.
 *
 * It also binds references a caller built to a client, with
 * {@link bindReference} (phases/13 D7, "Caller-built references"). Binding is
 * the same encode then decode, with no call between: the data is encoded
 * through the app's reference value type, which rejects anything a client
 * could not resolve, and the wire form is decoded with the client's own
 * decode context. The binder finds that context, and the client's contract,
 * in a registry private to this module, filled in when a client is created,
 * so a client carries no member beyond the app's operations.
 *
 * It depends only on `@macts/contracts`, because the remote entry point uses it
 * and must never load the Mac-side runtime.
 *
 * @packageDocumentation
 */

import {
  InternalError,
  MactsError,
  UnexpectedValueError,
  ValidationError,
  ValueTypes as t,
  referenceResultType,
  resolvingOperationKey,
  type AnyOperationDescriptor,
  type AppContract,
  type BoundReferenceOf,
  type CallOptions,
  type ClientBrand,
  type ClientRuntime,
  type CodecResult,
  type DecodeContext,
  type OperationDescriptor,
  type OperationId,
  type ReferenceCardinality,
  type ReferenceData,
  type ResolvableReferenceData,
  type ResourceTable,
  type ValidationIssue,
  type ValueType,
  type WireValue,
} from '@macts/contracts'
import {
  bindDecodedReference,
  isBoundReference,
  type ReferenceResolver,
} from './bound-reference.js'

/**
 * Runs one operation whose input is already in wire form and returns the raw
 * wire result.
 *
 * @remarks
 * The locality-specific step of an `invoke`. It must throw only canonical
 * structured errors. The value it resolves to is untrusted: it is decoded and
 * validated against the operation's output contract before the caller sees it.
 */
export type OperationTransport = (
  operation: OperationId,
  input: WireValue,
  options: CallOptions | undefined
) => Promise<unknown>

/**
 * Resolves one reference of the client's app, already in wire form (the
 * `{"reference": …}` control record), and returns the raw wire result.
 *
 * @remarks
 * The locality-specific step of a `resolve`. Like {@link OperationTransport},
 * it must throw only canonical structured errors, and its result is untrusted.
 */
export type ResolutionTransport = (
  reference: WireValue,
  options: CallOptions | undefined
) => Promise<unknown>

/** The locality-specific steps of a client: how it runs operations and resolves references. */
export interface ClientTransport {
  /** Runs an operation. */
  readonly invoke: OperationTransport
  /** Resolves a reference. */
  readonly resolve: ResolutionTransport
}

/**
 * What a client runtime reads from the app contract: the app, whose
 * references it encodes and decodes; its resource table, which records how
 * each resource's references resolve; and its operations, whose output
 * contracts decode resolution results.
 */
type ClientApp = Pick<AppContract<unknown>, 'app' | 'resources' | 'operations'>

/**
 * Build the decode context a client binds decoded values to.
 *
 * @remarks
 * This is the one place a client decides how references and file values in a
 * result become live objects. References are bound to `resolve`, the client's
 * own resolution (see `./bound-reference.ts`). File values are not supported
 * yet, so decoding one raises `InternalError` rather than producing an object
 * that cannot be fetched.
 */
function createDecodeContext(resolve: ReferenceResolver): DecodeContext {
  return {
    bindReference: (data) => bindDecodedReference(data, resolve),
    bindFile: () => {
      throw new InternalError('This client does not support file values.', {})
    },
  }
}

/**
 * Run a codec, turning anything it throws into `InternalError`.
 *
 * @remarks
 * Codecs report invalid values as a failed result and are not expected to
 * throw. A throw is a defect in the contract, except a canonical error raised
 * on purpose (such as the decode context's unsupported-value error), which
 * passes through unchanged.
 *
 * @param contract - The contract being applied, for the error message, for
 *   example `The input contract of "notes.notes.get"`.
 */
function runCodec<T>(contract: string, codec: () => CodecResult<T>): CodecResult<T> {
  try {
    return codec()
  } catch (error) {
    if (error instanceof MactsError) {
      throw error
    }
    throw new InternalError(`${contract} failed unexpectedly.`, {}, { cause: error })
  }
}

/**
 * Encode an SDK input through the operation's input contract.
 *
 * @throws `ValidationError` listing every issue when the input violates the
 *   contract.
 */
function encodeInput<Input>(
  operation: OperationDescriptor<Input, unknown>,
  input: Input
): WireValue {
  const encoded = runCodec(`The input contract of "${operation.id}"`, () =>
    operation.input.encode(input)
  )
  if (!encoded.ok) {
    throw new ValidationError(`The input to "${operation.id}" failed validation.`, {
      issues: encoded.issues,
    })
  }
  return encoded.value
}

/**
 * Decode a wire result through an operation's output contract.
 *
 * @param subject - What produced the result, for the error message, for
 *   example `The result of "notes.notes.get"`.
 * @throws `UnexpectedValueError` listing every issue when the result violates
 *   the contract.
 */
function decodeOutput<Output>(
  operation: OperationDescriptor<unknown, Output>,
  wire: unknown,
  context: DecodeContext,
  subject = `The result of "${operation.id}"`
): Output {
  return decodeResult(operation, operation.output, wire, context, subject)
}

/**
 * Decode a wire result with `type`, a value type derived from `operation`'s
 * output contract (the output itself, or what a resolution returns).
 *
 * @throws `UnexpectedValueError` listing every issue when the result violates
 *   `type`.
 */
function decodeResult<Output>(
  operation: AnyOperationDescriptor,
  type: ValueType<Output>,
  wire: unknown,
  context: DecodeContext,
  subject: string
): Output {
  const decoded = runCodec(`The output contract of "${operation.id}"`, () =>
    type.decode(wire, context)
  )
  if (!decoded.ok) {
    throw new UnexpectedValueError(`${subject} does not match its contract.`, {
      issues: decoded.issues,
    })
  }
  return decoded.value
}

/** The resource and cardinality a reference names: what selects its value type and operation. */
interface ReferenceTarget {
  readonly resource: string
  readonly cardinality: ReferenceCardinality
}

/**
 * What a client is doing with a reference whose data it validates: resolving
 * it, or binding it to itself. It names the reference in error messages.
 */
type ReferencePurpose = 'resolve' | 'bind'

/** The error for a reference to resolve or bind that fails its contract. */
function invalidReference(
  app: ClientApp,
  purpose: ReferencePurpose,
  issues: readonly ValidationIssue[]
): ValidationError {
  return new ValidationError(`The ${app.app} reference to ${purpose} failed validation.`, {
    issues,
  })
}

/**
 * Read the resource and cardinality of a reference to resolve or bind.
 *
 * @remarks
 * The static types guarantee both, but a caller can bypass them. They select
 * the value type the reference is encoded with, so a reference without them
 * cannot be checked further; it is rejected here, before anything is sent.
 *
 * @throws `ValidationError` naming each missing or malformed field.
 */
function readReferenceTarget(
  app: ClientApp,
  purpose: ReferencePurpose,
  reference: unknown
): ReferenceTarget {
  if (typeof reference !== 'object' || reference === null || Array.isArray(reference)) {
    throw invalidReference(app, purpose, [
      { path: [], message: `Expected a reference to an object of "${app.app}"` },
    ])
  }
  const resource: unknown = Reflect.get(reference, 'resource')
  const cardinality: unknown = Reflect.get(reference, 'cardinality')
  const issues: ValidationIssue[] = []
  if (typeof resource !== 'string' || resource === '') {
    issues.push({ path: ['resource'], message: 'Expected a resource key (a non-empty string)' })
  }
  if (cardinality !== 'one' && cardinality !== 'many') {
    issues.push({ path: ['cardinality'], message: 'Expected the cardinality "one" or "many"' })
  }
  if (typeof resource !== 'string' || resource === '' || issues.length > 0) {
    throw invalidReference(app, purpose, issues)
  }
  // `issues` is empty, so the cardinality is one of the two.
  return { resource, cardinality: cardinality === 'one' ? 'one' : 'many' }
}

/**
 * The value type of references to `target`: the app's reference value type,
 * `t.reference(() => app, resource, cardinality)`, the same one every
 * operation of the app encodes and decodes such references with.
 */
function referenceValueType(app: ClientApp, target: ReferenceTarget): ValueType<unknown> {
  return target.cardinality === 'one'
    ? t.reference(() => app, target.resource, 'one')
    : t.reference(() => app, target.resource, 'many')
}

/**
 * Encode a reference to resolve or bind into its canonical wire form, from
 * its data fields alone.
 *
 * @throws `ValidationError` listing every issue when the reference violates
 *   the app's reference contract, including an `app` other than the client's
 *   at any level (the issue is at that level's `app`) and a target, container,
 *   or entry whose resource has no resolving operation.
 */
function encodeReference(
  app: ClientApp,
  purpose: ReferencePurpose,
  target: ReferenceTarget,
  reference: unknown
): WireValue {
  const type = referenceValueType(app, target)
  const encoded = runCodec(`The reference contract of "${app.app}"`, () => type.encode(reference))
  if (!encoded.ok) {
    throw invalidReference(app, purpose, encoded.issues)
  }
  return encoded.value
}

/**
 * Check that the resolution of an identity collection holds exactly one
 * record per entry.
 *
 * @remarks
 * The runtime that resolved the reference enforces this already (phases/13
 * D7, Resolution step 8), so an entry is never silently dropped. The client
 * checks it again because what it received is untrusted: a service or
 * runtime that skipped the check must not hand the caller a collection that
 * lost entries without saying which.
 *
 * @param subject - What produced the result, for the error message.
 * @throws `UnexpectedValueError` when the number of records is not the
 *   number of entries.
 */
function checkEntryCount(reference: ReferenceData, resolved: unknown, subject: string): void {
  if (reference.form !== 'identity' || reference.cardinality !== 'many') return
  // Anything but an array already failed the list operation's output contract.
  if (!Array.isArray(resolved)) return
  const expected = reference.entries.length
  if (resolved.length === expected) return
  const received = String(resolved.length)
  throw new UnexpectedValueError(
    `${subject} must hold one record per entry: expected ${String(expected)} records, received ${received}.`,
    {
      issues: [
        {
          path: [],
          message: `Expected ${String(expected)} records, one per entry, but received ${received}`,
        },
      ],
    }
  )
}

/**
 * The operation a reference to `target` resolves as: the one the contract's
 * resource table records for the reference's cardinality
 * (`resolvingOperationKey`). The result is decoded with the value type
 * derived from its output contract ({@link resolutionResultType}).
 *
 * @throws `InternalError` when the contract records no such operation, or
 *   records one it does not contain. A reference that encoded is always
 *   resolvable, so either means the contract is inconsistent.
 */
function resolvingOperation(app: ClientApp, target: ReferenceTarget): AnyOperationDescriptor {
  const key = resolvingOperationKey(target.cardinality)
  const entry = Object.hasOwn(app.resources, target.resource)
    ? app.resources[target.resource]
    : undefined
  const id = entry?.[key]
  const operation =
    id !== undefined && Object.hasOwn(app.operations, id) ? app.operations[id] : undefined
  if (operation === undefined) {
    throw new InternalError(
      `The ${app.app} contract has no ${key} operation for "${target.resource}", so its ` +
        'references cannot be resolved.',
      {}
    )
  }
  return operation
}

/**
 * The value type a resolution through `operation` is decoded with
 * (`referenceResultType`, the runtime's own rule): the `get` output for a
 * single reference, and for a collection an array of the items of the
 * `list` operation's page, never the page. A collection reference resolves to
 * all of its members, not to one page of them.
 *
 * @throws `InternalError` when the contract's list operation does not return
 *   a page, so the contract is inconsistent.
 */
function resolutionResultType(
  app: ClientApp,
  target: ReferenceTarget,
  operation: AnyOperationDescriptor
): ValueType<unknown> {
  try {
    return referenceResultType(target.cardinality, operation.output)
  } catch (cause) {
    if (!(cause instanceof TypeError)) throw cause
    throw new InternalError(
      `The ${app.app} contract records "${operation.id}" as how references to "${target.resource}" resolve, but its output is not a page, so its references cannot be resolved.`,
      {},
      { cause }
    )
  }
}

/** A client runtime and the decode context it binds every decoded value with. */
interface CodecClientRuntime {
  readonly runtime: ClientRuntime
  readonly decodeContext: DecodeContext
}

/**
 * Build a client runtime for one app that encodes values, hands them to
 * `transport`, and decodes the results.
 */
function buildCodecClientRuntime(app: ClientApp, transport: ClientTransport): CodecClientRuntime {
  const runtime: ClientRuntime = {
    async invoke<Input, Output>(
      operation: OperationDescriptor<Input, Output>,
      input: Input,
      options?: CallOptions
    ): Promise<Output> {
      const wire = encodeInput(operation, input)
      const result = await transport.invoke(operation.id, wire, options)
      return decodeOutput(operation, result, decodeContext)
    },
    async resolve(reference, options) {
      const target = readReferenceTarget(app, 'resolve', reference)
      const wire = encodeReference(app, 'resolve', target, reference)
      const operation = resolvingOperation(app, target)
      const resultType = resolutionResultType(app, target, operation)
      const result = await transport.resolve(wire, options)
      const subject = `The result of resolving a reference as "${operation.id}"`
      const resolved = decodeResult(operation, resultType, result, decodeContext, subject)
      checkEntryCount(reference, resolved, subject)
      return resolved
    },
  }
  // References in any result resolve through this same runtime.
  const decodeContext = createDecodeContext((reference, options) =>
    runtime.resolve(reference, options)
  )
  return { runtime, decodeContext }
}

/** What {@link bindReference} reads from a client: its app, and how it binds decoded values. */
interface ClientBinding {
  readonly app: ClientApp
  readonly decodeContext: DecodeContext
}

/**
 * Every client created by {@link createCodecClient}, with what binding a
 * reference to it needs.
 *
 * @remarks
 * Kept here, keyed weakly by the client object, so a client carries no member
 * beyond its app's operations (phases/13 D7, "Caller-built references") and a
 * discarded client is not kept alive.
 */
const clientBindings = new WeakMap<object, ClientBinding>()

/** Whether `value` can key a `WeakMap`: an object or a function. */
function isObject(value: unknown): value is object {
  return (typeof value === 'object' && value !== null) || typeof value === 'function'
}

/**
 * Create an app's client whose calls encode values, hand them to `transport`,
 * and decode the results, and record it so references can be bound to it.
 *
 * @param app - The app's contract.
 * @param transport - The locality-specific steps that run operations and
 *   resolve references.
 * @returns The client the contract's `bind` builds on the runtime; every
 *   reference it decodes, or that {@link bindReference} binds to it, resolves
 *   through that runtime.
 * @throws `InternalError` when the contract's `bind` returns a client that
 *   was already created over another runtime. Recording it again would make
 *   references bound to the earlier client resolve under this one's
 *   credential.
 */
export function createCodecClient<Client, Resources extends ResourceTable>(
  app: AppContract<Client, Resources>,
  transport: ClientTransport
): Client & ClientBrand<Resources> {
  const { runtime, decodeContext } = buildCodecClientRuntime(app, transport)
  const client = app.bind(runtime)
  if (isObject(client)) {
    if (clientBindings.has(client)) {
      throw new InternalError(
        `The ${app.app} contract's bind returned a client that already belongs to another runtime.`,
        {}
      )
    }
    clientBindings.set(client, { app, decodeContext })
  }
  return client
}

/**
 * Bind a reference to `client`: reference data the caller built, or a
 * reference bound to another client of the same app.
 *
 * @remarks
 * The data is encoded through the app's reference value type,
 * `t.reference(() => contract, data.resource, data.cardinality)`, and the
 * wire form is decoded with the client's own decode context. The result is
 * therefore indistinguishable from a reference the client decoded: its
 * `resolve()`, and that of every container and entry in it, hydrates through
 * `client` (phases/13 D7, "Caller-built references").
 *
 * Binding is synchronous and makes no call. Encoding reads only the data
 * fields, so a reference bound to another client of the same app is rebound,
 * not copied with its old client. Whether the target exists is learned only
 * when the result is resolved.
 *
 * The client's type carries its contract's resource table: a factory's
 * result does, and so does a generated client interface such as
 * `NotesClient`, so a variable or parameter annotated with it binds the same
 * data. `data` type-checks only when the table records the operation every level resolves
 * through (`resolvingOperationKey`): `get` for a single-object target, a
 * container, and an identity-collection entry, and `list` for a collection
 * target. The result is the bound variant of `data`'s form and cardinality,
 * with the resource's record and identifier types, so its `resolve()` yields
 * the record, or an array of records. A container that is itself a bound
 * reference is admitted as it is, because a client already decoded it. For a
 * contract that declares no table type, any reference data type-checks.
 *
 * @example
 * ```typescript
 * import { bindReference, createClient, resolveClientOptions } from '@macts/sdk'
 * import { notesContract } from '@macts/notes/contract'
 *
 * const notes = createClient(notesContract, resolveClientOptions())
 * const groceries = bindReference(notes, {
 *   app: 'notes',
 *   resource: 'Note',
 *   form: 'selector',
 *   cardinality: 'one',
 *   selector: { by: 'name', name: 'Groceries' },
 * })
 * const note = await groceries.resolve()
 * ```
 *
 * @param client - A client created by `createClient` from `@macts/sdk` or
 *   `@macts/sdk/local`.
 * @param data - The reference to bind.
 * @returns The reference bound to `client`: the bound variant of `data`
 *   (`BoundReferenceOf`).
 * @throws `TypeError` when `client` is not a client created by either
 *   factory.
 * @throws `ValidationError` listing every issue the encoding raises: an `app`
 *   other than the client's at any level, a malformed field or a field of the
 *   other form, and a target, container, or entry whose resource has no
 *   resolving operation.
 */
export function bindReference<
  Resources extends ResourceTable,
  const Data extends ResolvableReferenceData<Resources>,
>(client: ClientBrand<Resources>, data: Data): BoundReferenceOf<Resources, Data> {
  const binding = clientBindings.get(client)
  if (binding === undefined) {
    throw new TypeError(
      'bindReference expects a client created by createClient from @macts/sdk or @macts/sdk/local.'
    )
  }
  const { app, decodeContext } = binding
  const target = readReferenceTarget(app, 'bind', data)
  const wire = encodeReference(app, 'bind', target, data)
  const decoded = runCodec(`The reference contract of "${app.app}"`, () =>
    referenceValueType(app, target).decode(wire, decodeContext)
  )
  // A reference that encoded always decodes, and the client's decode context
  // always binds it, so anything else is a defect of the reference contract.
  if (!decoded.ok || !isBoundReference(decoded.value)) {
    throw new InternalError(
      `The ${app.app} reference contract did not decode a reference it encoded.`,
      {}
    )
  }
  // The variant is the one `data` names: decoding keeps the resource, form,
  // and cardinality that encoding read, and the record and identifier types
  // are those of the contract the reference was checked against.
  return decoded.value as BoundReferenceOf<Resources, Data>
}
