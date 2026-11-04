/**
 * The native macOS executor: the `Executor` that carries out manifest-defined
 * operations by running automation scripts against the target app.
 *
 * It owns three things and nothing else:
 *
 * - building the `NativeScript` for one operation, or for one reference to
 *   resolve, from the native body (see `native-scripts.ts`), the app's bundle
 *   identifier, the input record, the input and output value plans, and the
 *   reference table: the identifier plans the request carries for the app's
 *   resources, merged with how the manifest says the app finds each
 *   resource's objects;
 * - running it through the {@link NativeTransport} with the in-process value
 *   codec, honoring the time limit and the caller's abort signal;
 * - classifying failures, whether reported by the automation process as a
 *   `NativeOutcome` or raised by the transport itself, into the
 *   canonical structured errors from `@macts/contracts`, in consumer
 *   vocabulary.
 *
 * Authorization, policy, and input validation have already happened above the
 * executor seam.
 *
 * Value plans: every plan is executed through the codec, which decodes the
 * wire input into native arguments and encodes the native result into wire
 * form inside the automation process. Under passthrough plans the codec
 * converts nothing and plain JSON semantics apply. The executor never converts
 * values itself; the outcome's value is already in wire form.
 *
 * @packageDocumentation
 */

import {
  AppAuthorizationRequiredError,
  AppOperationError,
  AppUnavailableError,
  CollectionChangedError,
  InternalError,
  InvalidSelectionError,
  OperationCancelledError,
  OperationTimeoutError,
  TargetNotFoundError,
  UnexpectedValueError,
  ValidationError,
  PASSTHROUGH_PLAN,
  type AnyMactsError,
  type FieldPlan,
  type IssuePath,
  type OperationTarget,
  type ReferenceWire,
  type ResourcePlanTable,
  type ValuePlan,
  type WireRecord,
  type WireValue,
} from '@macts/contracts'
import type { AppManifest } from '../manifest/schemas/app.js'
import type { ExecutionRequest, Executor, ResolutionRequest } from '../execution/executor.js'
import { isWireValue, JxaExecutionError, MAX_OUTPUT_BYTES, runNativeScript } from './executor.js'
import {
  NATIVE_CODEC,
  type NativeAddressing,
  type NativeFailure,
  type NativeOutcome,
  type NativeReferencePlans,
  type NativeReferenceTable,
  type NativeScript,
} from './native-codec.js'
import {
  assertRequiredArguments,
  buildResolutionBody,
  COMMUNICATION_FAILURE_ERROR_NUMBERS,
  NO_SUCH_OBJECT_ERROR_NUMBER,
  planNativeInvocation,
  referenceAddressing,
  RESOLUTION_ENTRIES_ARGUMENT,
  RESOLUTION_KINDS_ARGUMENT,
  RESOLUTION_TARGET_ARGUMENT,
} from './native-scripts.js'
import { resolvingCommand } from '../manifest/resource-commands.js'
import { resolveRoots } from '../manifest/roots.js'

/** Time limit for one operation when none is configured, in milliseconds. */
const DEFAULT_TIMEOUT_MS = 30_000

/** Limits and cancellation for one {@link NativeTransport.run} call. */
export interface NativeRunOptions {
  /** Time limit in milliseconds. The transport stops the script when it elapses. */
  readonly timeoutMs: number
  /** The transport stops the script when this aborts. */
  readonly signal?: AbortSignal | undefined
}

/**
 * Runs one `NativeScript` with the in-process value codec and reports how it
 * ended.
 *
 * `run` resolves to the `NativeOutcome` the automation process reported:
 * everything the app or the codec raised inside the process is a failed
 * outcome, not a rejection. It rejects only when the process itself failed,
 * with a {@link JxaExecutionError} whose `kind` says whether the script was
 * stopped by the time limit or the caller, could not start, exceeded the output
 * limit, died, exited with a native error described by `stderr`, or produced an
 * unreadable outcome. The executor classifies failures from those fields alone;
 * any other rejection is a host defect.
 */
export interface NativeTransport {
  /**
   * Run one native script.
   *
   * @param script - The invocation.
   * @param options - The time limit and the caller's abort signal.
   * @returns What the automation process reported. Rejects with a
   *   `JxaExecutionError`.
   */
  run(script: NativeScript, options: NativeRunOptions): Promise<NativeOutcome>
}

/**
 * Configuration for {@link createNativeExecutor}.
 */
export interface NativeExecutorOptions {
  /**
   * Time limit for one operation, in milliseconds. The automation process is
   * stopped when it is exceeded. Defaults to 30000.
   */
  readonly timeoutMs?: number
  /**
   * How scripts are run. Defaults to the macOS automation host with
   * `NATIVE_CODEC`; replaceable so the executor can be exercised without one.
   */
  readonly transport?: NativeTransport
}

/**
 * What {@link describeNativeFailure} needs to know about the failed operation.
 */
export interface NativeFailureContext {
  /** Display name of the target app, used in messages and details. */
  readonly app: string
  /** The operation that failed. */
  readonly operation: OperationTarget
  /** The time limit the operation ran under, in milliseconds. */
  readonly timeoutMs: number
}

/**
 * Why a native run did not produce a result: either the automation process
 * ran to completion and reported a failed outcome, or the transport rejected
 * and no outcome exists.
 */
export type NativeRunFailure =
  | { readonly kind: 'reported'; readonly failure: NativeFailure }
  | { readonly kind: 'process'; readonly error: unknown }

/**
 * Create the native macOS executor.
 *
 * @remarks
 * Cancellation: an abort before the run starts prevents it. An abort during the
 * run rejects immediately with `OperationCancelledError`, and the transport
 * stops the automation process. Whatever the app had already done by then
 * stays done: whether it completed the operation is unknown after a mid-run
 * abort.
 *
 * Reference resolution: `resolve` resolves the references the provider can
 * also convert at operation positions (phases/13 D7, native conversion
 * scope), and identity collections of them: a single identity reference to a
 * resource the app finds by its identifier, carrying, exactly when the
 * resource's get records a parent, its container in the same form. The
 * object is found exactly as conversion finds it, by the codec, container
 * first, and read as the resource's get reads its item, in one automation
 * process per request. A missing object fails with `TargetNotFoundError`
 * naming the referenced resource, with `entryIndex` for an identity
 * collection's entry; a missing container names the container's resource.
 * An empty identity collection resolves to `[]` without starting an
 * automation process; the runtime has already run permission, governance,
 * approval and audit for it, as for any resolution. Every other reference (a
 * selector, a container the target is not found within, a missing container,
 * or one to a resource outside that scope) fails with `InternalError` naming
 * the form, before any automation runs.
 *
 * @param options - Time limit and, for tests, the transport.
 * @returns An `Executor` whose provider is `'macos'`.
 */
export function createNativeExecutor(options: NativeExecutorOptions = {}): Executor {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const transport = options.transport ?? AUTOMATION_HOST

  return {
    provider: 'macos',
    async execute(request: ExecutionRequest): Promise<WireValue> {
      const { manifest, target, input, inputPlan, outputPlan, page, resourcePlans, signal } =
        request
      throwIfAborted(signal)

      // Legacy identifier aliases belong only to results that pass through
      // unconverted; a typed result contract receives exactly its fields.
      const plan = planNativeInvocation(manifest, target, {
        identifierAliases: outputPlan.kind === 'passthrough',
        paged: page !== undefined,
        // A passthrough result is not encoded, so nothing would unwrap a
        // reference handed over with its container.
        containerReferences: outputPlan.kind !== 'passthrough',
      })
      assertRequiredArguments(plan.requiredArguments, input)
      const script: NativeScript = {
        bundleId: manifest.app.bundleId,
        body: plan.body,
        input,
        inputPlan,
        outputPlan: page === undefined ? outputPlan : pageWindowPlan(outputPlan),
        ...(page === undefined ? {} : { page }),
        references: nativeReferenceTable(manifest, resourcePlans, [inputPlan, outputPlan]),
      }

      const context: NativeFailureContext = { app: manifest.app.name, operation: target, timeoutMs }
      return runToWireValue(transport, script, context, signal, {
        subject: 'The operation',
        describeFailure: (failure) => describeNativeFailure({ kind: 'reported', failure }, context),
      })
    },
    async resolve(request: ResolutionRequest): Promise<WireValue> {
      const { manifest, reference, outputPlan, resourcePlans, signal } = request
      throwIfAborted(signal)

      const rooted = resolveRoots(manifest, reference.resource) !== undefined
      const resolution = planResolution(
        reference,
        rooted ? resourcePlans[reference.resource]?.id : undefined
      )
      const references = nativeReferenceTable(manifest, resourcePlans, [
        resolution.inputPlan,
        outputPlan,
      ])
      const unresolvable = unresolvableForm(manifest, reference, references)
      if (unresolvable !== undefined) throw new InternalError(unresolvable, {})
      // An identity collection with no entries names no object, so there is
      // nothing to address and nothing to read. The runtime has already
      // authorized, governed and audited the call before it reached here.
      if (resolution.entryCount === 0) return []

      // Failures are described as the operation the runtime ran the call as:
      // the resource's get for a single reference, its list for a collection.
      const shape = reference.cardinality === 'one' ? 'get' : 'list'
      const resolving = resolvingCommand(manifest, reference.resource, shape)
      const context: NativeFailureContext = {
        app: manifest.app.name,
        operation: { command: resolving?.[0] ?? shape, resource: reference.resource },
        timeoutMs,
      }
      const script: NativeScript = {
        bundleId: manifest.app.bundleId,
        body: buildResolutionBody(manifest, reference.resource, reference.cardinality, {
          containerReferences: outputPlan.kind !== 'passthrough',
        }),
        input: resolution.input,
        inputPlan: resolution.inputPlan,
        outputPlan,
        references,
      }
      return runToWireValue(transport, script, context, signal, {
        subject: 'Resolving the reference',
        describeFailure: (failure) => describeResolutionFailure(failure, reference, context),
      })
    },
  }
}

/** How {@link runToWireValue} reports what went wrong, for the call it runs. */
interface WireValueReporting {
  /**
   * What produced the result, starting a sentence: `The operation` for an
   * operation, `Resolving the reference` for a resolution.
   */
  readonly subject: string
  /** Classifies a failure the automation process reported. */
  readonly describeFailure: (failure: NativeFailure) => AnyMactsError
}

/**
 * Run `script` and return its result as a wire value, classifying a reported
 * failure with `reporting.describeFailure` and a process failure as
 * {@link describeNativeFailure} does. A result that is not a wire value is an
 * `InternalError` naming `reporting.subject`.
 */
async function runToWireValue(
  transport: NativeTransport,
  script: NativeScript,
  context: NativeFailureContext,
  signal: AbortSignal | undefined,
  reporting: WireValueReporting
): Promise<WireValue> {
  const { timeoutMs } = context
  const outcome = await runCancellable(
    () => transport.run(script, { timeoutMs, signal }),
    context,
    signal
  )
  if (!outcome.ok) throw reporting.describeFailure(outcome.failure)
  // The codec already produced a wire value; this guards a replaced
  // transport that does not honor the outcome contract.
  const value: unknown = outcome.value
  if (value === undefined) return null
  if (!isWireValue(value)) {
    throw new InternalError(`${reporting.subject} produced a result that is not valid JSON.`, {})
  }
  return value
}

// ---------------------------------------------------------------------------
// Reference resolution
// ---------------------------------------------------------------------------

/**
 * The input a resolution script decodes, and its plan: the reference, or each
 * entry of an identity collection, as a single reference control record at a
 * single reference position. The codec converts each one into the app's
 * object exactly as it converts a reference an operation takes as input, so
 * resolution has no addressing of its own.
 */
interface ResolutionInput {
  readonly input: WireRecord
  readonly inputPlan: ValuePlan
  /** How many entries an identity collection has; `undefined` for any other reference. */
  readonly entryCount?: number
}

/**
 * The resolution input for `reference` ({@link ResolutionInput}).
 *
 * @param kindPlan - The identifier plan of a singleton root, whose kinds the
 *   resolution body also receives ({@link RESOLUTION_KINDS_ARGUMENT}), decoded
 *   after the references so a malformed one is reported at the reference;
 *   `undefined` for any other resource.
 */
function planResolution(
  reference: ReferenceWire,
  kindPlan: ValuePlan | undefined
): ResolutionInput {
  const single: ValuePlan = {
    kind: 'reference',
    resource: reference.resource,
    cardinality: 'one',
  }
  const kindsField = (ids: readonly WireValue[]): ResolutionKinds =>
    kindPlan === undefined
      ? { input: {}, fields: {} }
      : {
          input: { [RESOLUTION_KINDS_ARGUMENT]: [...ids] },
          fields: {
            [RESOLUTION_KINDS_ARGUMENT]: {
              presence: 'required',
              value: { kind: 'array', items: kindPlan },
            },
          },
        }
  if (reference.cardinality === 'one') {
    const kinds = kindsField(reference.form === 'identity' ? [reference.id] : [])
    return {
      input: { [RESOLUTION_TARGET_ARGUMENT]: { reference }, ...kinds.input },
      inputPlan: {
        kind: 'record',
        fields: {
          [RESOLUTION_TARGET_ARGUMENT]: { presence: 'required', value: single },
          ...kinds.fields,
        },
      },
    }
  }
  const entries = reference.form === 'identity' ? reference.entries : []
  const kinds = kindsField(
    entries.flatMap((entry) =>
      entry.form === 'identity' && entry.cardinality === 'one' ? [entry.id] : []
    )
  )
  return {
    input: {
      [RESOLUTION_ENTRIES_ARGUMENT]: entries.map((entry) => ({ reference: entry })),
      ...kinds.input,
    },
    inputPlan: {
      kind: 'record',
      fields: {
        [RESOLUTION_ENTRIES_ARGUMENT]: {
          presence: 'required',
          value: { kind: 'array', items: single },
        },
        ...kinds.fields,
      },
    },
    ...(reference.form === 'identity' ? { entryCount: entries.length } : {}),
  }
}

/** The kinds a singleton root's resolution input carries, and their plans. */
interface ResolutionKinds {
  readonly input: WireRecord
  readonly fields: Readonly<Record<string, FieldPlan>>
}

/**
 * The message naming the reference form `reference` has that the macOS
 * provider does not resolve, or `undefined` when it resolves it.
 *
 * @remarks
 * The provider resolves exactly what it converts at operation positions
 * (phases/13 D7, native conversion scope), and identity collections of it: a
 * single identity reference to a resource whose entry in the script's
 * reference table has both an identifier plan and addressing, carrying a
 * container exactly when that addressing is `within` a parent, and then an
 * identity container of that parent, judged the same way level by level. The
 * table is the one the codec reads, built by the same helper that decides
 * conversion ({@link referenceAddressing}), so the two cannot disagree.
 */
function unresolvableForm(
  manifest: AppManifest,
  reference: ReferenceWire,
  references: NativeReferenceTable
): string | undefined {
  const app = manifest.app.name
  const target = `the ${app} resource ${JSON.stringify(reference.resource)}`
  const cannot = (form: string): string => `The macOS provider cannot resolve ${form} yet.`
  // A caller error, not a missing feature (phases/13 D7, container scoping).
  const misplacedContainer = `The macOS provider cannot resolve a reference to ${target} through that container: a reference carries a container only when ${app} finds its resource within another, and then as an identity reference to that resource.`
  if (reference.form === 'selector') {
    return cannot(
      reference.cardinality === 'one'
        ? `a selector reference to ${target}`
        : `a selector collection reference to ${target}`
    )
  }
  if (reference.cardinality === 'many') {
    for (const entry of reference.entries) {
      if (entry.form !== 'identity' || entry.cardinality !== 'one') {
        return cannot(
          `an identity collection of ${target} whose entries are not identity references`
        )
      }
      const unresolvable = unresolvableChain(entry, references)
      if (unresolvable === 'container') return misplacedContainer
      if (unresolvable !== undefined) return unresolvableMessage(manifest, unresolvable)
    }
    return unresolvableMessage(manifest, unresolvableTarget(reference.resource, references))
  }
  const unresolvable = unresolvableChain(reference, references)
  if (unresolvable === 'container') return misplacedContainer
  return unresolvableMessage(manifest, unresolvable)
}

/**
 * Why a single reference's chain does not resolve: `'container'` for a
 * container the reference's resource is not found within (one on a resource
 * found at the application, one of another resource, or one not in identity
 * form); a {@link Unresolvable} for a resource with no addressing or a missing
 * container; `undefined` when every level resolves.
 */
function unresolvableChain(
  reference: ReferenceWire,
  references: NativeReferenceTable
): 'container' | Unresolvable | undefined {
  const missing = unresolvableTarget(reference.resource, references)
  if (missing !== undefined) return missing
  const within = parentWithin(references[reference.resource]?.addressing)
  const container =
    reference.form === 'identity' && reference.cardinality === 'one'
      ? reference.container
      : undefined
  if (within === undefined) return container === undefined ? undefined : 'container'
  if (container === undefined) return { kind: 'no-container', resource: reference.resource, within }
  if (
    container.resource !== within ||
    container.form !== 'identity' ||
    container.cardinality !== 'one'
  ) {
    return 'container'
  }
  return unresolvableChain(container, references)
}

/** A level of a reference that the provider cannot resolve, and why. */
type Unresolvable =
  | { readonly kind: 'no-addressing'; readonly resource: string }
  | { readonly kind: 'no-container'; readonly resource: string; readonly within: string }

/** Why references to `resource` do not resolve at all, if they do not. */
function unresolvableTarget(
  resource: string,
  references: NativeReferenceTable
): Unresolvable | undefined {
  const entry = Object.hasOwn(references, resource) ? references[resource] : undefined
  return entry?.id === undefined || entry.addressing === undefined
    ? { kind: 'no-addressing', resource }
    : undefined
}

/** The message for an {@link Unresolvable}, or `undefined` when there is none. */
function unresolvableMessage(
  manifest: AppManifest,
  unresolvable: Unresolvable | undefined
): string | undefined {
  if (unresolvable === undefined) return undefined
  const app = manifest.app.name
  const target = `the ${app} resource ${JSON.stringify(unresolvable.resource)}`
  return unresolvable.kind === 'no-addressing'
    ? `The macOS provider cannot resolve references to ${target} yet: ${app} does not find one by its identifier alone.`
    : `The macOS provider cannot resolve a reference to ${target} without its container: ${app} finds one only within its ${JSON.stringify(unresolvable.within)}.`
}

/**
 * The position in the request's reference that a codec failure at `path` in
 * the resolution input describes: the target is the reference itself, and an
 * entry is the same entry of the reference, so a path names a field the caller
 * sent.
 */
function referencePath(path: IssuePath): IssuePath {
  const [head, ...rest] = path
  if (head === RESOLUTION_TARGET_ARGUMENT) return ['reference', ...rest]
  if (head === RESOLUTION_ENTRIES_ARGUMENT) return ['reference', 'entries', ...rest]
  return path
}

/**
 * Classify a failure a resolution script reported.
 *
 * @remarks
 * A referenced object the app does not have is a missing target of the
 * referenced resource, with `entryIndex` naming the entry of an identity
 * collection, since the codec finds entries in order and stops at the first
 * missing one. A reference the codec could not convert is an internal
 * limitation, as for an operation. Every other failure is classified as an
 * operation's (see {@link describeNativeFailure}), with codec paths rewritten
 * to the reference's own fields.
 */
function describeResolutionFailure(
  failure: NativeFailure,
  reference: ReferenceWire,
  context: NativeFailureContext
): AnyMactsError {
  if (failure.source !== 'codec') {
    return describeNativeFailure({ kind: 'reported', failure }, context)
  }
  const path = failure.direction === 'decode' ? referencePath(failure.path) : failure.path
  const cause = Object.assign(new Error(failure.message), { path })
  const { app } = context
  if (failure.missingResource !== undefined) {
    const resource = failure.missingResource
    const entryIndex = path[0] === 'reference' && path[1] === 'entries' ? path[2] : undefined
    return typeof entryIndex === 'number'
      ? new TargetNotFoundError(
          `${app} has no ${resource} matching entry ${String(entryIndex)} of the identity collection.`,
          { resource, entryIndex },
          { cause }
        )
      : new TargetNotFoundError(
          `${app} has no ${resource} matching the reference.`,
          { resource },
          { cause }
        )
  }
  if (failure.unsupportedKind !== undefined) {
    return new InternalError(
      `The macOS provider cannot resolve this reference to the ${app} resource ${JSON.stringify(reference.resource)} yet.`,
      {},
      { cause }
    )
  }
  return describeNativeFailure({ kind: 'reported', failure: { ...failure, path } }, context)
}

/**
 * The manifest key of the parent a resource with `addressing` is found
 * within, or `undefined` when it is found at the application or has no
 * addressing. A singleton root is held by the application itself.
 */
function parentWithin(addressing: NativeAddressing | undefined): string | undefined {
  return addressing === undefined || addressing.lookup === 'byRoot' ? undefined : addressing.within
}

/**
 * The reference table of a native script: an entry for every resource a
 * reference in `plans` names, directly or inside another resource's
 * identifier, and for every parent such a resource is found within, level by
 * level, with the identifier plan `resourcePlans` holds for it and the
 * addressing the manifest gives it ({@link referenceAddressing}).
 *
 * @remarks
 * Only reachable resources are embedded, so a script carries no more than its
 * plans can convert, and nothing when they hold no reference. A resource the
 * request's table does not list (an app registered without a contract) gets no
 * entry, so references to it do not convert.
 */
function nativeReferenceTable(
  manifest: AppManifest,
  resourcePlans: ResourcePlanTable,
  plans: readonly ValuePlan[]
): NativeReferenceTable {
  const table = new Map<string, NativeReferencePlans>()
  const pending = plans.flatMap(referencedResources)
  for (let resource = pending.pop(); resource !== undefined; resource = pending.pop()) {
    if (table.has(resource) || !Object.hasOwn(resourcePlans, resource)) continue
    const id = resourcePlans[resource]?.id
    const addressing = referenceAddressing(manifest, resource)
    table.set(resource, {
      ...(id === undefined ? {} : { id }),
      ...(addressing === undefined ? {} : { addressing }),
    })
    if (id !== undefined) pending.push(...referencedResources(id))
    const within = parentWithin(addressing)
    if (within !== undefined) pending.push(within)
  }
  // `Object.fromEntries` defines own properties, so no resource key can reach
  // the table's prototype.
  return Object.fromEntries(table)
}

/** The resources the reference plans inside `plan` name, outermost first. */
function referencedResources(plan: ValuePlan): string[] {
  switch (plan.kind) {
    case 'reference':
      return [plan.resource]
    case 'array':
      return referencedResources(plan.items)
    case 'nullable':
      return referencedResources(plan.value)
    case 'record':
      return Object.values(plan.fields).flatMap((field) => referencedResources(field.value))
    default:
      return []
  }
}

/**
 * The plan a paged list's result is encoded with: the items by the operation's
 * item array plan, and the collection's length and the last item's identifier
 * as plain data (see `PageWindowResult`), which the runtime reads and never
 * passes to a caller.
 */
function pageWindowPlan(itemsPlan: ValuePlan): ValuePlan {
  return {
    kind: 'record',
    fields: {
      items: { presence: 'required', value: itemsPlan },
      length: { presence: 'required', value: PASSTHROUGH_PLAN },
      last: { presence: 'optional', value: PASSTHROUGH_PLAN },
    },
  }
}

/** The default transport: run a native script in the macOS automation host. */
const AUTOMATION_HOST: NativeTransport = {
  run: (script, options) =>
    runNativeScript(script, NATIVE_CODEC, { timeout: options.timeoutMs, signal: options.signal }),
}

/** The error for a caller abort. */
function cancelled(): OperationCancelledError {
  return new OperationCancelledError('The operation was cancelled.', {})
}

function throwIfAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted === true) throw cancelled()
}

/**
 * Run `start`, classifying a rejection as a process failure, and settle early
 * with `OperationCancelledError` if `signal` aborts first. A late outcome after
 * an abort is discarded.
 */
function runCancellable(
  start: () => Promise<NativeOutcome>,
  context: NativeFailureContext,
  signal: AbortSignal | undefined
): Promise<NativeOutcome> {
  return new Promise((resolve, reject) => {
    const onAbort = (): void => {
      reject(cancelled())
    }
    signal?.addEventListener('abort', onAbort, { once: true })
    const settle = (): void => {
      signal?.removeEventListener('abort', onAbort)
    }
    // Starting from a resolved promise turns a synchronous throw into a rejection.
    Promise.resolve()
      .then(start)
      .then(
        (outcome) => {
          settle()
          resolve(outcome)
        },
        (error: unknown) => {
          settle()
          reject(
            signal?.aborted === true
              ? cancelled()
              : describeNativeFailure({ kind: 'process', error }, context)
          )
        }
      )
  })
}

// ---------------------------------------------------------------------------
// Failure classification
// ---------------------------------------------------------------------------

/**
 * Native error numbers the executor classifies. Each is the `errorNumber` an
 * app or bridge error carries inside the automation process, which is also the
 * number the host prints in parentheses at the end of an uncaught error.
 */
const NativeErrorNumber = {
  /** The addressed object does not exist. Also raised by bodies for a missing target. */
  noSuchObject: NO_SUCH_OBJECT_ERROR_NUMBER,
  /** An index or range selection is invalid for its collection. */
  invalidIndex: -1719,
  /** The operating system has not authorized sending events to the app. */
  notAuthorized: COMMUNICATION_FAILURE_ERROR_NUMBERS.notAuthorized,
  /**
   * The app did not answer an event within its own event timeout, often
   * because a permission prompt is open.
   */
  noReply: COMMUNICATION_FAILURE_ERROR_NUMBERS.noReply,
  /** The app is not running. */
  appNotRunning: COMMUNICATION_FAILURE_ERROR_NUMBERS.appNotRunning,
  /** The connection to the app is no longer valid. */
  connectionInvalid: COMMUNICATION_FAILURE_ERROR_NUMBERS.connectionInvalid,
  /**
   * A script-level error. Reported, among other things, when the app cannot be
   * found, with the text "Application can't be found."
   */
  scriptError: -2700,
  /** The app cannot be found by launch services. */
  appNotFound: -10814,
} as const

/** The trailing `(-NNNN)` the automation host prints after an error message. */
const ERROR_NUMBER_PATTERN = /\((-?\d+)\)\s*$/

/** The host's description of a bundle identifier with no installed app. */
const APP_NOT_FOUND_PATTERN = /Application can.t be found/i

/**
 * The host's report that a script did not compile, `<start>:<end>: syntax
 * error: ...`. It ends in -2700 like a runtime script error, so it is told
 * apart by this prefix.
 */
const COMPILE_ERROR_PATTERN = /^\s*(?:\d+:\d+:\s*)?syntax error:/m

/**
 * Classify a native failure as a canonical structured error.
 *
 * @remarks
 * A failure the automation process reported in its outcome:
 *
 * | Reported failure                                         | Error                                    |
 * | -------------------------------------------------------- | ---------------------------------------- |
 * | codec, either direction, with an unsupported kind        | `InternalError`                          |
 * | codec, `decode`, with a missing resource                 | `TargetNotFoundError` for that resource  |
 * | codec, `decode`                                          | `ValidationError` with `issues`          |
 * | codec, `encode`                                          | `UnexpectedValueError` with `issues`     |
 * | collection changed while a list read it                  | `CollectionChangedError`                 |
 * | app, -1728 (no such object), with a missing resource     | `TargetNotFoundError` for that resource  |
 * | app, -1728 (no such object)                              | `TargetNotFoundError`                    |
 * | app, -1719 (invalid index)                               | `InvalidSelectionError`                  |
 * | app, -1743 (not authorized)                              | `AppAuthorizationRequiredError`          |
 * | app, -600 (not running), -609 (connection invalid)       | `AppUnavailableError` (`not-responding`) |
 * | app, -1712 (no answer within the app's event timeout)    | `AppUnavailableError` (`not-responding`) |
 * | app, -2700 "Application can't be found", -10814          | `AppUnavailableError` (`not-installed`)  |
 * | app, any other number                                    | `AppOperationError` with `appErrorCode`  |
 * | app, no number                                           | `AppOperationError`                      |
 *
 * A decode failure means a bridge form could not be produced from input that
 * was already validated against its wire schema; it is still reported as the
 * input not meeting the contract. Codec `path` and `message` are written by
 * macts and describe the contract, so they become the error's `issues`.
 *
 * A codec failure with an unsupported kind is never blamed on the caller or
 * the app: the operation's contract has a value kind (a reference, a file, a
 * file source) that the macOS provider cannot convert yet, so no input and no
 * result at that position could succeed. Its message names the operation,
 * the kind, and the position, and never a value; the codec's own message and
 * path are kept as `cause`, which stays local.
 *
 * A failure of the transport, with no outcome, by the rejection's `kind`:
 *
 * | Process failure                                          | Error                                    |
 * | -------------------------------------------------------- | ---------------------------------------- |
 * | `timed-out` (the transport's own time limit)             | `OperationTimeoutError`                  |
 * | `cancelled` (stopped by the caller)                      | `OperationCancelledError`                |
 * | `output-too-large`                                       | `InternalError` naming the output limit  |
 * | `not-started`, `signalled`, `unreadable-output`          | `InternalError`                          |
 * | `exited`, the script did not compile                     | `InternalError`                          |
 * | `exited`, standard error ends in an error number         | the app table above, by that number      |
 * | `exited`, no error number                                | `InternalError`                          |
 * | anything that is not a `JxaExecutionError`               | `InternalError`                          |
 *
 * Only the transport's own time limit makes a process failure a timeout: a
 * process killed by an out-of-memory kill, the output limit, or an external
 * signal is not one. Host failures are never blamed on the app: a host that
 * cannot start (reported as `InternalError` rather than `AppUnavailableError`,
 * since the target app may well be installed), a process killed from outside,
 * oversized output, a script that does not compile, and a malformed outcome
 * are macts or system faults.
 *
 * -1712 is the app's own event timeout, not the executor's time limit, so it is
 * reported as an app that did not respond, with no claim about elapsed time.
 *
 * Messages use consumer vocabulary and may name the app and the resource.
 * App-supplied text (an app failure's message, the process's standard error)
 * never reaches a message or `details`: it is kept only as `cause`, either as
 * the process failure itself or as an `Error` whose message is the app text.
 *
 * @param failure - The reported failure, or what the process boundary rejected
 *   with.
 * @param context - The app and operation, for messages and details.
 * @returns The structured error to throw.
 */
export function describeNativeFailure(
  failure: NativeRunFailure,
  context: NativeFailureContext
): AnyMactsError {
  return failure.kind === 'reported'
    ? describeReportedFailure(failure.failure, context)
    : describeProcessFailure(failure.error, context)
}

function describeReportedFailure(
  failure: NativeFailure,
  context: NativeFailureContext
): AnyMactsError {
  const { app } = context
  if (failure.source === 'codec' && failure.unsupportedKind !== undefined) {
    return describeUnsupportedKind(failure, failure.unsupportedKind, context)
  }
  if (failure.source === 'codec' && failure.missingResource !== undefined) {
    return describeMissingReference(failure, failure.missingResource, context)
  }
  if (failure.source === 'collection') {
    return new CollectionChangedError(
      `The ${context.operation.resource ?? 'item'} collection in ${app} changed while it was being read, so no consistent result exists. The same request can be retried, from the first page if it was paged.`,
      {}
    )
  }
  if (failure.source === 'codec') {
    const issues = [{ path: failure.path, message: failure.message }]
    return failure.direction === 'encode'
      ? new UnexpectedValueError(
          `${app} returned a value that does not match the operation's contract.`,
          { issues }
        )
      : new ValidationError(`The input could not be converted to the values ${app} expects.`, {
          issues,
        })
  }
  const options = { cause: new Error(failure.message) }
  if (failure.errorNumber === undefined) {
    return new AppOperationError(`${app} could not complete the operation.`, { app }, options)
  }
  if (
    failure.errorNumber === NativeErrorNumber.noSuchObject &&
    failure.missingResource !== undefined
  ) {
    // The body found the parent of a scoped operation missing, so the error
    // names the parent: a tab cannot be found in a window that does not exist.
    const resource = failure.missingResource
    return new TargetNotFoundError(
      `${app} has no ${resource} matching the request.`,
      { resource },
      options
    )
  }
  return classifyErrorNumber(failure.errorNumber, failure.message, context, options)
}

/** Words for a value plan kind in a message: `file-source` → `file source`. */
function kindWords(kind: string): string {
  switch (kind) {
    case 'file':
      return kind
    case 'file-source':
      return 'file source'
    default:
      return JSON.stringify(kind)
  }
}

/**
 * A value position for a message, outermost first: `for`, `events[0].status`,
 * `["odd key"]`. The value itself has no position, so it renders empty.
 */
function describePosition(path: IssuePath): string {
  let rendered = ''
  for (const step of path) {
    if (typeof step === 'number') rendered += `[${String(step)}]`
    else if (/^[A-Za-z_$][\w$]*$/.test(step)) rendered += rendered === '' ? step : `.${step}`
    else rendered += `[${JSON.stringify(step)}]`
  }
  return rendered
}

/**
 * The error for a value kind the macOS provider cannot convert: an internal
 * limitation, never the caller's input or the app's result.
 */
function describeUnsupportedKind(
  failure: Extract<NativeFailure, { source: 'codec' }>,
  kind: string,
  context: NativeFailureContext
): InternalError {
  const { app, operation } = context
  const name =
    operation.resource === undefined
      ? operation.command
      : `${operation.resource} ${operation.command}`
  const position = describePosition(failure.path)
  const verb = failure.direction === 'decode' ? 'takes' : 'returns'
  const at = position === '' ? '' : ` at \`${position}\``
  // Some references convert, so the message speaks of this one, not of every
  // reference; the codec's message, kept as the cause, says why it does not.
  const message =
    kind === 'reference'
      ? `The ${app} operation "${name}" ${verb} a reference${at} that the macOS provider cannot convert yet.`
      : `The ${app} operation "${name}" ${verb} ${kindWords(kind)} values${at}, which the macOS provider does not support yet.`
  return new InternalError(
    message,
    {},
    // The codec's own message and path stay local: `cause` never reaches the
    // wire.
    { cause: Object.assign(new Error(failure.message), { path: failure.path }) }
  )
}

/**
 * The error for an input reference whose object the app does not have: the
 * reference's target is missing, so the failure names that resource, not the
 * operation's own.
 */
function describeMissingReference(
  failure: Extract<NativeFailure, { source: 'codec' }>,
  resource: string,
  context: NativeFailureContext
): TargetNotFoundError {
  const position = describePosition(failure.path)
  const at = position === '' ? '' : ` at \`${position}\``
  return new TargetNotFoundError(
    `${context.app} has no ${resource} matching the reference${at}.`,
    { resource },
    { cause: Object.assign(new Error(failure.message), { path: failure.path }) }
  )
}

function describeProcessFailure(error: unknown, context: NativeFailureContext): AnyMactsError {
  const { app, timeoutMs } = context
  const options = { cause: error }
  if (!(error instanceof JxaExecutionError)) {
    return new InternalError(`The automation for ${app} failed unexpectedly.`, {}, options)
  }
  switch (error.kind) {
    case 'timed-out':
      return new OperationTimeoutError(
        `${app} did not finish the operation within ${String(timeoutMs)} ms. If this is the first time ${app} is automated on this Mac, it may be waiting for an automation permission prompt to be answered.`,
        { timeoutMs },
        options
      )
    case 'cancelled':
      return new OperationCancelledError('The operation was cancelled.', {}, options)
    case 'output-too-large':
      return new InternalError(
        `The result from ${app} exceeded the ${String(MAX_OUTPUT_BYTES / (1024 * 1024))} MiB output limit.`,
        {},
        options
      )
    case 'not-started':
      return new InternalError('The macOS automation host could not be started.', {}, options)
    case 'signalled':
      return new InternalError(`The automation for ${app} was stopped unexpectedly.`, {}, options)
    case 'unreadable-output':
      return new InternalError(
        `The automation for ${app} reported a result macts could not read.`,
        {},
        options
      )
    case 'exited': {
      if (COMPILE_ERROR_PATTERN.test(error.stderr)) {
        return new InternalError(`The automation for ${app} could not be prepared.`, {}, options)
      }
      const errorNumber = parseNativeErrorNumber(error.stderr)
      if (errorNumber === undefined) {
        return new InternalError(
          `The automation for ${app} failed without reporting an error.`,
          {},
          options
        )
      }
      return classifyErrorNumber(errorNumber, error.stderr, context, options)
    }
  }
}

/**
 * Classify a native error number by the error table above. `text` is the host's or the
 * app's description of the failure; it is read only to recognize a missing
 * app behind the generic -2700 number, and never copied into the result.
 */
function classifyErrorNumber(
  errorNumber: number,
  text: string,
  context: NativeFailureContext,
  options: ErrorOptions
): AnyMactsError {
  const { app, operation } = context
  const resourceDetails = operation.resource === undefined ? {} : { resource: operation.resource }
  const subject = operation.resource ?? 'item'

  switch (errorNumber) {
    case NativeErrorNumber.noSuchObject:
      return new TargetNotFoundError(
        `${app} has no ${subject} matching the request.`,
        resourceDetails,
        options
      )
    case NativeErrorNumber.invalidIndex:
      return new InvalidSelectionError(
        `The selection is not valid for the ${subject} collection in ${app}.`,
        resourceDetails,
        options
      )
    case NativeErrorNumber.notAuthorized:
      return new AppAuthorizationRequiredError(
        `This Mac has not authorized automating ${app}. Allow it in System Settings > Privacy & Security > Automation.`,
        { app },
        options
      )
    case NativeErrorNumber.appNotRunning:
    case NativeErrorNumber.connectionInvalid:
      return new AppUnavailableError(
        `${app} is not running or is not responding.`,
        { app, reason: 'not-responding' },
        options
      )
    case NativeErrorNumber.noReply:
      return new AppUnavailableError(
        `${app} did not respond in time. It may be waiting for an automation permission prompt to be answered on this Mac.`,
        { app, reason: 'not-responding' },
        options
      )
    case NativeErrorNumber.appNotFound:
      return notInstalled(app, options)
    case NativeErrorNumber.scriptError:
      if (APP_NOT_FOUND_PATTERN.test(text)) return notInstalled(app, options)
      return appOperationFailed(app, errorNumber, options)
    default:
      return appOperationFailed(app, errorNumber, options)
  }
}

function notInstalled(app: string, options: ErrorOptions): AppUnavailableError {
  return new AppUnavailableError(
    `${app} is not installed on this Mac.`,
    { app, reason: 'not-installed' },
    options
  )
}

function appOperationFailed(
  app: string,
  appErrorCode: number,
  options: ErrorOptions
): AppOperationError {
  return new AppOperationError(
    `${app} could not complete the operation (error ${String(appErrorCode)}).`,
    { app, appErrorCode },
    options
  )
}

/** The error number at the end of the host's error output, if any. */
function parseNativeErrorNumber(stderr: string): number | undefined {
  const match = ERROR_NUMBER_PATTERN.exec(stderr.trimEnd())
  const digits = match?.[1]
  return digits === undefined ? undefined : Number(digits)
}
