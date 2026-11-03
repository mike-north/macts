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
 * - a result that fails its contract raises `UnexpectedValueError`.
 *
 * There are two kinds of call. `invoke` runs an operation. `resolve` resolves
 * a reference (phases/13 D7): it re-encodes the reference's data through the
 * app's reference value type, so the canonical wire form is what is sent,
 * never a replay of wire the client once received, and it decodes the result
 * with the output contract of the operation the reference resolves as.
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
  resolvingOperationKey,
  type AnyOperationDescriptor,
  type AppContract,
  type CallOptions,
  type ClientRuntime,
  type CodecResult,
  type DecodeContext,
  type OperationDescriptor,
  type OperationId,
  type ReferenceCardinality,
  type ValidationIssue,
  type ValueType,
  type WireValue,
} from '@macts/contracts'
import { bindReference, type ReferenceResolver } from './bound-reference.js'

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
export type ClientApp = Pick<AppContract<unknown>, 'app' | 'resources' | 'operations'>

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
    bindReference: (data) => bindReference(data, resolve),
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
  const decoded = runCodec(`The output contract of "${operation.id}"`, () =>
    operation.output.decode(wire, context)
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

/** The error for a reference to resolve that fails its contract. */
function invalidReference(app: ClientApp, issues: readonly ValidationIssue[]): ValidationError {
  return new ValidationError(`The ${app.app} reference to resolve failed validation.`, { issues })
}

/**
 * Read the resource and cardinality of a reference to resolve.
 *
 * @remarks
 * The static types guarantee both, but a caller can bypass them. They select
 * the value type the reference is encoded with, so a reference without them
 * cannot be checked further; it is rejected here, before anything is sent.
 *
 * @throws `ValidationError` naming each missing or malformed field.
 */
function readReferenceTarget(app: ClientApp, reference: unknown): ReferenceTarget {
  if (typeof reference !== 'object' || reference === null || Array.isArray(reference)) {
    throw invalidReference(app, [
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
    throw invalidReference(app, issues)
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
 * Encode a reference to resolve into its canonical wire form, from its data
 * fields alone.
 *
 * @throws `ValidationError` listing every issue when the reference violates
 *   the app's reference contract, including an `app` other than the client's
 *   at any level (the issue is at that level's `app`).
 */
function encodeReference(app: ClientApp, target: ReferenceTarget, reference: unknown): WireValue {
  const type = referenceValueType(app, target)
  const encoded = runCodec(`The reference contract of "${app.app}"`, () => type.encode(reference))
  if (!encoded.ok) {
    throw invalidReference(app, encoded.issues)
  }
  return encoded.value
}

/**
 * The operation a reference to `target` resolves as: the one the contract's
 * resource table records for the reference's cardinality
 * (`resolvingOperationKey`). Its output contract decodes the result.
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
 * Build a client runtime for one app that encodes values, hands them to
 * `transport`, and decodes the results.
 *
 * @param app - The app's contract (its app, resource table, and operations).
 * @param transport - The locality-specific steps that run operations and
 *   resolve references.
 * @returns The runtime a generated contract's `bind` turns into an app client,
 *   and that every reference it decodes is bound to.
 */
export function createCodecClientRuntime(
  app: ClientApp,
  transport: ClientTransport
): ClientRuntime {
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
      const target = readReferenceTarget(app, reference)
      const wire = encodeReference(app, target, reference)
      const operation = resolvingOperation(app, target)
      const result = await transport.resolve(wire, options)
      return decodeOutput(
        operation,
        result,
        decodeContext,
        `The result of resolving a reference as "${operation.id}"`
      )
    },
  }
  // References in any result resolve through this same runtime.
  const decodeContext = createDecodeContext((reference, options) =>
    runtime.resolve(reference, options)
  )
  return runtime
}
