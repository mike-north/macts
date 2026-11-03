/**
 * The macts runtime: the single invocation pipeline every surface dispatches
 * through.
 *
 * A runtime is constructed with an `Executor` and holds the registered
 * operations of every app it serves. {@link MactsRuntime.invoke} runs one
 * operation through the same ordered steps for every caller, whichever surface
 * the call arrived through and whether it originated locally or remotely:
 *
 * 1. verify the credential and derive the caller's authority;
 *    1b. when a rate limiter is configured, admit the call for that
 *        authority's subject (admission only turns calls away; it never
 *        changes the authority or grants anything);
 * 2. check the operation's permission against that authority;
 * 3. enforce governance policy, auditing the decision and, for a held call,
 *    seeking and recording a human decision;
 * 4. validate the input against the operation's wire contract;
 * 5. hand the authorized, validated request to the executor;
 * 6. validate the executor's result against the operation's output contract,
 *    unless its output plan is `passthrough` (a value with no wire encoding),
 *    before any adapter emits it.
 *
 * A list operation returns one page (`Page` in `@macts/contracts`). The runtime
 * owns paging: it reads the paging inputs (`pageSize`, `cursor`) of a list
 * that pages, checks the cursor against the operation and the call's other
 * inputs, hands the executor a page window instead, and assembles the page
 * and its next cursor from what the executor read. The cursor's contents are
 * never logged or audited; an audit record says only that one was presented.
 *
 * No step can be skipped: there is no trusted-caller mode, and a local caller
 * presents a credential exactly as a remote one does. Every failure is raised
 * as a canonical structured error, and any failure the runtime did not
 * anticipate denies the call rather than letting it through.
 *
 * {@link MactsRuntime.resolveReference} runs the same steps, through the same
 * code, as a call of the referenced resource's `get` operation (a single
 * reference) or `list` operation (a collection reference): the same
 * permission, the same governance and approval decision, the same audit
 * record, and the same output validation. Its executor step is
 * `Executor.resolve`. Resolution is therefore never a way around policy.
 *
 * @packageDocumentation
 */

import { randomUUID } from 'node:crypto'
import type { Logger } from 'pino'
import type {
  AppManifest,
  ApprovalRequest,
  ExecutionRequest,
  Executor,
  PageWindow,
  ResolutionRequest,
} from '@macts/core'
import {
  DEFAULT_APPROVAL_TIMEOUT_MS,
  enforceCall,
  recordApprovalDecision,
  redactArgs,
  isApprovalCancellation,
  recordApprovalCancellation,
  seekApprovalUnlessCancelled,
} from '@macts/core'
import {
  ApprovalPendingError,
  ApprovalRejectedError,
  InternalError,
  InvalidSelectionError,
  MactsError,
  OperationCancelledError,
  PermissionDeniedError,
  PolicyDeniedError,
  RateLimitedError,
  UnexpectedValueError,
  ValidationError,
  PAGE_SIZE_LIMITS,
  ValueTypes,
  isPageValueType,
  referenceResultType,
  resolvingOperationKey,
  type AppContract,
  type Authority,
  type Credential,
  type InvocationContext,
  type OperationId,
  type PageValueType,
  type ReferenceCardinality,
  type ReferenceWire,
  type ValueType,
  type WireRecord,
  type WireValue,
} from '@macts/contracts'
import { z } from 'zod'
import { resolveGovernanceForRequest, type GovernanceContext } from './governance/context.js'
import type { RateLimiter } from './invocation/rate-limiter.js'
import { createKeyStoreVerifier, type CredentialVerifier } from './invocation/verifier.js'
import { hasPermission } from './keys/validator.js'
import { getLogger } from './logger.js'
import { toValidationIssues } from './operations/passthrough.js'
import { decodePageCursor, encodePageCursor } from './operations/page-cursor.js'
import { toValueFreeIssues } from './operations/value-free-issues.js'
import {
  OperationRegistrationError,
  OperationRegistry,
  operationsFromContract,
  operationsFromManifest,
  type RegisteredOperation,
} from './operations/registry.js'

/**
 * The logging the runtime performs: operator-side diagnostics for denied and
 * failed calls.
 *
 * @remarks
 * Log entries carry the operation, permission, and subject. They never carry
 * the credential.
 */
export type RuntimeLogger = Pick<Logger, 'error' | 'warn' | 'info'>

/** What a runtime is constructed from. */
export interface CreateRuntimeOptions {
  /** Carries out authorized, validated operations. */
  readonly executor: Executor
  /**
   * Governance enforced on every call: a context, or a loader that produces
   * one.
   *
   * @remarks
   * A loader (for example `loadHostGovernance`) is called once, when the first
   * call reaches the governance step, and its result is reused for every later
   * call. If it fails, that call and every later one is denied with
   * `InternalError` and the cause is logged. The failure is kept rather than
   * retried, because the usual causes (a malformed or unreadable policy or
   * approval file) do not fix themselves while the process runs, and a call
   * must never run under governance that could not be established.
   *
   * There is no default: a runtime never runs calls under governance it was
   * not given. Hosts that act for this Mac pass `loadHostGovernance`; a test
   * or an embedder that wants no restrictions passes
   * `{ policy: ALLOW_ALL_POLICY }` and says so.
   */
  readonly governance: GovernanceContext | (() => Promise<GovernanceContext>)
  /**
   * Turns credentials into authority.
   *
   * @defaultValue {@link createKeyStoreVerifier}
   */
  readonly verifier?: CredentialVerifier
  /**
   * Admission limit applied per verified subject, after the credential is
   * verified and before the permission check.
   *
   * @remarks
   * Admission only turns calls away: a denied call raises `RateLimitedError`,
   * and an admitted call still passes through every later step. A limiter that
   * throws denies the call with `InternalError` (fail-closed), never with
   * `RateLimitedError`, because the caller did not exceed a limit.
   *
   * @defaultValue no admission limit
   */
  readonly rateLimiter?: RateLimiter
  /**
   * Source of the timestamps written to audit records and approval requests.
   *
   * @defaultValue the system clock
   */
  readonly clock?: () => Date
  /**
   * Destination for operator-side diagnostics.
   *
   * @defaultValue the process-wide logger from `getLogger()`
   */
  readonly logger?: RuntimeLogger
}

/** The Mac-side runtime every macts surface dispatches operations through. */
export interface MactsRuntime {
  /**
   * Register every operation an app manifest exposes, with passthrough value
   * types.
   *
   * @throws `OperationRegistrationError` when the app's route segment is
   *   reserved (`RESERVED_APP_ROUTE_SEGMENTS`), an operation id is already
   *   registered, or the manifest yields a malformed id or permission. A
   *   refused registration adds nothing.
   */
  registerManifest(manifest: AppManifest): void
  /**
   * Register a generated contract's operations after checking each against the
   * manifest.
   *
   * @remarks
   * The contract's resource table also becomes the app's reference registry,
   * against which {@link MactsRuntime.resolveReference} validates references,
   * so an app has at most one registered contract.
   *
   * @throws `OperationRegistrationError` when the app's route segment is
   *   reserved (`RESERVED_APP_ROUTE_SEGMENTS`), a descriptor's permission or
   *   target disagrees with the manifest, names an operation the manifest does
   *   not expose, an id is already registered, a contract for the same app
   *   is already registered, or the contract's resource table records a `get`
   *   or `list` operation that is not one of its operations targeting that
   *   resource. A refused registration adds nothing.
   */
  registerContract(contract: AppContract<unknown>, manifest: AppManifest): void
  /**
   * Every registered operation, in registration order, including one marked
   * `unavailable`: a surface built from this list leaves those out, and
   * `invoke` answers them as unknown.
   */
  operations(): readonly RegisteredOperation[]
  /**
   * The operation registered under `id`, if any, including one marked
   * `unavailable`.
   */
  operation(id: OperationId): RegisteredOperation | undefined
  /**
   * Run one operation through the full invocation pipeline.
   *
   * An operation marked `unavailable` (one whose required input admits no
   * value, D7) is answered exactly as an unknown id: the same
   * `ValidationError`, after the credential is verified and the call admitted,
   * and before permission, governance or approval, so no human is ever asked
   * to approve a call that cannot run.
   *
   * @param id - The operation to run.
   * @param input - The input record in wire form, as received.
   * @param context - The caller's credential, and optional cancellation and
   *   correlation.
   * @returns The operation's result in wire form, unchanged from the
   *   executor's.
   * @throws A canonical structured error from `@macts/contracts` for every
   *   failure. `UnexpectedValueError` reports a result that violates the
   *   operation's output contract (checked unless its output plan is
   *   `passthrough`): the operation ran in the app, so it may have had an
   *   effect, and only its result is unusable. The error's issues give
   *   paths into the result but never its values.
   */
  invoke(id: OperationId, input: unknown, context: InvocationContext): Promise<WireValue>
  /**
   * Resolve one reference into the record or records it denotes, through the
   * full invocation pipeline.
   *
   * @remarks
   * The reference resolves as a call of its resource's `get` operation
   * (cardinality `'one'`) or `list` operation (`'many'`): the operation the
   * app contract records for that resource (`ResourceDescriptor.get` and
   * `.list`), never one re-derived from the manifest. A resource whose
   * recorded operation is marked `unavailable` is not resolvable, as if it
   * recorded none. The caller's key must hold that operation's permission, and the
   * call is governed, approved, and audited exactly as a direct call of that
   * operation. Only the target resource's permission is required: containers
   * locate the target and contribute no data, so they need none.
   *
   * The reference is validated by the app contract's reference value type
   * (`t.reference` over its resource table) after governance, as `invoke`
   * validates input, and the executor's result is validated against the
   * operation's output contract, unless its output plan is `passthrough`, as
   * `invoke` validates results. An identity collection's result must hold
   * exactly one record per entry, so an entry is never silently dropped.
   *
   * @param app - The app's route segment, as its contract names it (for
   *   example `'notes'`).
   * @param reference - The reference in wire form, as received: the reference
   *   control record `{"reference": {…}}` that encoding a reference produces.
   * @param context - The caller's credential, and optional cancellation and
   *   correlation.
   * @returns A single record for a single reference; an array of records,
   *   possibly empty, for a collection reference.
   * @throws A canonical structured error from `@macts/contracts` for every
   *   failure: `ValidationError` for an unknown app or a malformed reference,
   *   `InvalidSelectionError` when the resource has no operation to resolve
   *   the reference as, the same errors as `invoke` for authentication,
   *   permission, and governance, `TargetNotFoundError` and
   *   `InvalidSelectionError` from the executor unchanged, and
   *   `UnexpectedValueError` when the result violates the operation's output
   *   contract or an identity collection's result does not hold one record per
   *   entry.
   */
  resolveReference(app: string, reference: unknown, context: InvocationContext): Promise<WireValue>
}

/**
 * The ids of the registered operations references to one resource resolve as,
 * by cardinality: the `get` operation the contract records for a single
 * reference, the `list` operation for a collection. Absent when the contract
 * records none.
 */
type ResolvingOperations = Readonly<Partial<Record<ReferenceCardinality, ResolvingEntry>>>

/**
 * What a contract records for one cardinality of a resource's references: the
 * id of the operation they resolve as, looked up when a reference is resolved
 * (so an operation marked `unavailable` is not resolvable), and the value type
 * of what the resolution returns ({@link referenceResultType}).
 */
interface ResolvingEntry {
  readonly id: OperationId
  readonly result: ValueType<unknown>
}

/**
 * The operation a reference resolves as, and the value type of what the
 * resolution returns ({@link referenceResultType}): the `get` output for a
 * single reference, an array of the `list` page's items for a collection.
 */
interface ResolvingOperation {
  readonly operation: RegisteredOperation
  readonly result: ValueType<unknown>
}

/**
 * How an operation's result is produced, by its output contract:
 *
 * - `direct`: the executor's result is the operation's result.
 * - `whole`: a list that does not page; the executor reads the whole
 *   collection as an array of items, which becomes the single page.
 * - `paged`: a list that pages; the runtime turns the paging inputs into a
 *   page window, and the page and its cursor from the executor's window
 *   result.
 */
type ResultShape =
  | { readonly kind: 'direct' }
  | { readonly kind: 'whole'; readonly page: PageValueType<unknown> }
  | { readonly kind: 'paged'; readonly page: PageValueType<unknown> }

/**
 * The window result a paging executor returns (`PageWindowResult` in
 * `@macts/core`): checked before it is trusted, like any executor result.
 */
const PageWindowResultSchema = z.strictObject({
  items: z.array(z.unknown()),
  length: z.number().int().nonnegative(),
  last: z.exactOptional(z.union([z.string(), z.number().refine(Number.isFinite)])),
})

/** The input key of the page size, one of the reserved paging input names. */
const PAGE_SIZE_INPUT = 'pageSize'

/** The input key of the cursor, one of the reserved paging input names. */
const CURSOR_INPUT = 'cursor'

/**
 * The result shape of an operation. A list pages when its output is a page
 * and its input record takes both paging inputs; a list whose output is a page
 * but which takes no paging inputs (a resource with no identifier) reads its
 * whole collection into one page.
 */
function resultShapeOf(operation: RegisteredOperation): ResultShape {
  const { input, output } = operation.descriptor
  if (!isPageValueType(output)) return { kind: 'direct' }
  const fields = input.plan.kind === 'record' ? input.plan.fields : {}
  const pages = Object.hasOwn(fields, PAGE_SIZE_INPUT) && Object.hasOwn(fields, CURSOR_INPUT)
  return pages ? { kind: 'paged', page: output } : { kind: 'whole', page: output }
}

/**
 * An app registered from its generated contract: what reference resolution
 * needs beyond the operation registry.
 */
interface RegisteredApp {
  /** The app's contract; its resource table is the app's reference registry. */
  readonly contract: AppContract<unknown>
  /**
   * The ids of the operations each resource's references resolve as, keyed by
   * resource key; checked against the contract's operations when the app
   * registered.
   */
  readonly resolving: ReadonlyMap<string, ResolvingOperations>
}

/** The resource and cardinality a reference names, read before any authorization. */
interface ReferenceTarget {
  /** The manifest resource key, present in the app's resource table. */
  readonly resource: string
  /** Whether the reference denotes one object or a collection. */
  readonly cardinality: ReferenceCardinality
  /** The reference payload: the content of the `reference` control record. */
  readonly payload: Readonly<Record<string, unknown>>
}

/**
 * What operator logs say about the call a pipeline step belongs to: the
 * operation id for `invoke`, the app for a reference resolution whose
 * operation is not yet known.
 */
type CallLabel = Readonly<Record<string, string>>

/** Both reference cardinalities, each resolving as the operation `resolvingOperationKey` names. */
const REFERENCE_CARDINALITIES: readonly ReferenceCardinality[] = ['one', 'many']

/** Whether `value` is a plain record (not `null`, not an array). */
function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Whether a wire value is a wire record. */
function isWireRecord(value: WireValue): value is WireRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/**
 * Build a runtime.
 *
 * @remarks
 * The executor is fixed at construction; every invocation dispatches through
 * it. Governance is either a context or a loader that runs on first use (see
 * {@link CreateRuntimeOptions.governance}). It is required: hosts that act for
 * this Mac pass `loadHostGovernance`, and anything else states the governance it
 * enforces.
 *
 * @param options - The executor and governance, and optionally the verifier,
 *   clock, and logger.
 * @returns A runtime with no operations registered.
 */
export function createRuntime(options: CreateRuntimeOptions): MactsRuntime {
  const executor = options.executor
  const governanceSource = options.governance
  /** The single load of a governance loader, kept whether it succeeds or fails. */
  let governanceLoad: Promise<GovernanceContext> | undefined
  const verifier = options.verifier ?? createKeyStoreVerifier()
  const clock = options.clock ?? (() => new Date())
  const log = (): RuntimeLogger => options.logger ?? getLogger()
  const registry = new OperationRegistry()
  /** Apps registered from a contract, keyed by the contract's app segment. */
  const apps = new Map<string, RegisteredApp>()

  /**
   * The operation a call names, if it can run: registered under `id` and not
   * marked `unavailable`. Every entry that runs an operation finds it here, so
   * an operation no input can call (D7) is answered exactly as one that is not
   * registered, before its permission, governance or approval is consulted.
   */
  function callableOperation(id: OperationId): RegisteredOperation | undefined {
    const operation = registry.get(id)
    return operation?.descriptor.unavailable === undefined ? operation : undefined
  }

  /** Details for an internal failure, carrying the caller's correlation id when given. */
  function internalDetails(context: InvocationContext): { correlationId?: string } {
    return context.correlationId === undefined ? {} : { correlationId: context.correlationId }
  }

  /**
   * The governance context calls are enforced against. A loader runs once; a
   * synchronous throw from it is captured like a rejection.
   */
  function loadGovernance(): Promise<GovernanceContext> {
    if (typeof governanceSource !== 'function') {
      return Promise.resolve(governanceSource)
    }
    governanceLoad ??= (async () => governanceSource())()
    return governanceLoad
  }

  /** Step 0 and the pre-execution check: honor a caller's abort. */
  function throwIfCancelled(context: InvocationContext): void {
    if (context.signal?.aborted === true) {
      throw new OperationCancelledError('The operation was cancelled.', {})
    }
  }

  /** Step 1: verify the credential. Anything but a canonical failure is internal. */
  async function verify(context: InvocationContext, call: CallLabel): Promise<Authority> {
    try {
      return await verifier.verify(context.credential)
    } catch (error) {
      if (error instanceof MactsError) {
        throw error
      }
      log().error(
        { err: loggableError(error, context.credential), ...call },
        'Credential verification failed unexpectedly'
      )
      throw new InternalError('Credential verification failed.', internalDetails(context), {
        cause: error,
      })
    }
  }

  /**
   * Step 1b: admission. Counts the call against the subject's limit and turns
   * it away when the limit is exhausted. Never alters the authority.
   */
  function admit(authority: Authority, context: InvocationContext, call: CallLabel): void {
    if (options.rateLimiter === undefined) {
      return
    }
    let admission
    try {
      admission = options.rateLimiter.admit(authority.subject)
    } catch (error) {
      // Fail closed. Not a rate-limit denial: the caller exceeded nothing, and a
      // 429 would invite a retry that cannot help.
      log().error(
        { err: error, ...call, subject: authority.subject },
        'Rate limiter failed; denying the call'
      )
      throw new InternalError('Admission control failed.', internalDetails(context), {
        cause: error,
      })
    }
    if (admission.allowed) {
      return
    }
    const { retryAfterSeconds } = admission
    if (!Number.isSafeInteger(retryAfterSeconds) || retryAfterSeconds < 0) {
      // A denial whose delay cannot be stated truthfully is a limiter defect.
      log().error(
        { ...call, subject: authority.subject, retryAfterSeconds },
        'Rate limiter returned an invalid retry delay; denying the call'
      )
      throw new InternalError('Admission control failed.', internalDetails(context))
    }
    throw new RateLimitedError(
      `Rate limit exceeded. Try again in ${String(retryAfterSeconds)} seconds.`,
      { retryAfterSeconds }
    )
  }

  /** Step 2: the authority must hold the operation's permission. */
  function checkPermission(operation: RegisteredOperation, authority: Authority): void {
    const required = operation.descriptor.permission
    const result = hasPermission([...authority.permissions], required, operation.permissionHistory)
    if (!result.granted) {
      throw new PermissionDeniedError(result.hint ?? `Missing required permission: ${required}`, {
        required,
        ...(result.hint === undefined ? {} : { hint: result.hint }),
        ...(result.changelog === undefined ? {} : { changelog: result.changelog }),
      })
    }
  }

  /**
   * Step 3: governance. Loads the governance context (once, for a loader),
   * resolves the caller's key policy, enforces and audits the decision, and
   * for a held call either reports it pending (no gate) or obtains and records
   * a human decision. Returns only when the call may run.
   */
  async function enforceGovernance(
    operation: RegisteredOperation,
    authority: Authority,
    input: unknown,
    context: InvocationContext
  ): Promise<void> {
    const permission = operation.descriptor.permission
    const risk = operation.risk
    const apiKeyId = authority.subject
    const argsSummary = redactArgs(auditableArguments(operation, input))
    // Minted before enforcement so a held call's 'pending' record and its
    // resolving record share a correlation key.
    const approvalId = randomUUID()

    const enforcementFailed = (error: unknown, message: string): InternalError => {
      log().error(
        {
          err: loggableError(error, context.credential),
          operation: operation.descriptor.id,
          permission,
          apiKeyId,
        },
        message
      )
      return new InternalError('Governance enforcement failed.', internalDetails(context), {
        cause: error,
      })
    }

    let governance: GovernanceContext
    try {
      governance = await loadGovernance()
    } catch (error) {
      // Fail closed: governance that could not be established never degrades
      // into a default policy.
      log().error(
        { err: error, operation: operation.descriptor.id, permission, apiKeyId },
        'Could not load the governance context; denying the call'
      )
      throw new InternalError('Governance could not be loaded.', internalDetails(context), {
        cause: error,
      })
    }

    let resolved
    try {
      resolved = await resolveGovernanceForRequest(governance, apiKeyId)
    } catch (error) {
      // Fail closed: an unreadable key policy must never degrade into "this key
      // has no policy", which would widen the boundary to the host policy alone.
      throw enforcementFailed(error, 'Could not resolve the per-key governance policy')
    }

    let decision
    try {
      decision = await enforceCall({
        policy: resolved.policy,
        ...(resolved.keyPolicy === undefined ? {} : { keyPolicy: resolved.keyPolicy }),
        permission,
        risk,
        audit: { apiKeyId, argsSummary, timestamp: clock(), approvalId },
        ...(resolved.writer === undefined ? {} : { writer: resolved.writer }),
      })
    } catch (error) {
      // Includes a failed audit write: a decision that cannot be recorded does
      // not let the call through.
      throw enforcementFailed(error, 'Governance enforcement failed')
    }

    const layer = decision.evaluation.layer
    if (decision.outcome === 'allowed') {
      return
    }
    if (decision.outcome === 'denied') {
      throw new PolicyDeniedError(decision.reason, { permission, layer })
    }

    // pending-approval
    if (governance.approvals === undefined) {
      // Nobody to ask: a confirm-first call is withheld, never executed.
      throw new ApprovalPendingError(decision.reason, { permission, layer })
    }

    // The approvals arm of GovernanceContext requires a writer, so the human
    // decision below always has somewhere durable to be recorded.
    const gate = governance.approvals
    const writer = governance.writer
    const request: ApprovalRequest = {
      id: approvalId,
      permission,
      risk,
      identity: {
        apiKeyId,
        ...(authority.displayName === undefined ? {} : { apiKeyName: authority.displayName }),
      },
      argsSummary,
      rule: decision.evaluation.rule,
      reason: decision.reason,
      timeoutMs: gate.timeoutMs ?? DEFAULT_APPROVAL_TIMEOUT_MS,
      requestedAt: clock(),
      layer,
    }

    // The wait never rejects, and reports anything but an explicit approval
    // (rejection, timeout, provider failure) as not approved. A caller abort
    // ends the wait at once and is recorded as a cancellation, never as a
    // decision. Without a caller signal the wait can only end by decision or
    // timeout.
    const result = await seekApprovalUnlessCancelled({
      provider: gate.provider,
      request,
      signal: context.signal ?? new AbortController().signal,
    })
    if (isApprovalCancellation(result)) {
      try {
        await recordApprovalCancellation({
          permission,
          cancellation: result,
          audit: { apiKeyId, argsSummary, timestamp: clock(), approvalId },
          writer,
        })
      } catch (error) {
        // The call is not executed either way; a missing record is an
        // operator-side problem, not a reason to report anything but the
        // cancellation to the caller.
        log().error(
          { err: loggableError(error, context.credential), permission, approvalId },
          'Approval cancellation could not be audited'
        )
      }
      throw new OperationCancelledError('The operation was cancelled while awaiting approval.', {})
    }
    const outcome = result

    try {
      await recordApprovalDecision({
        permission,
        outcome,
        audit: { apiKeyId, argsSummary, timestamp: clock(), approvalId },
        writer,
      })
    } catch (error) {
      // An approval that leaves no durable record is not acted on.
      log().error(
        {
          err: loggableError(error, context.credential),
          permission,
          approvalId,
          approvalState: outcome.state,
        },
        'Approval decision could not be audited; denying the call'
      )
      throw new ApprovalRejectedError(
        `The approval decision for "${permission}" could not be durably recorded, so the call was not released. Treated as rejected (fail-closed).`,
        { permission, layer, state: 'rejected' }
      )
    }

    if (outcome.approved) {
      log().info(
        { permission, approvalId, provider: gate.provider.name, layer },
        'Capability call approved by a human'
      )
      return
    }

    log().warn(
      {
        permission,
        approvalId,
        provider: gate.provider.name,
        layer,
        approvalState: outcome.state,
        ...(outcome.failure === undefined ? {} : { approvalFailure: outcome.failure }),
        // Full detail, including any third-party exception text, stays in
        // operator-side logs and the audit trail, never in the caller's error.
        detail: outcome.auditReason,
      },
      'Capability call denied at the approval gate'
    )
    throw new ApprovalRejectedError(outcome.reason, { permission, layer, state: outcome.state })
  }

  /** Step 4: the input must be a record that satisfies the operation's wire contract. */
  function validateInput(
    operation: RegisteredOperation,
    input: unknown,
    context: InvocationContext
  ): WireRecord {
    if (!isRecord(input)) {
      throw new ValidationError('Operation input must be a record.', {
        issues: [{ path: [], message: 'Expected the operation input to be a record' }],
      })
    }
    const parsed = operation.descriptor.input.wire.safeParse(input)
    if (!parsed.success) {
      throw new ValidationError('Operation input failed validation.', {
        issues: toValidationIssues(parsed.error.issues),
      })
    }
    if (!isWireRecord(parsed.data)) {
      // The descriptor's own schema turned a record into something else: a
      // contract defect, not a caller error.
      log().error(
        { operation: operation.descriptor.id },
        'Operation input schema produced a non-record value'
      )
      throw new InternalError('The operation input contract is invalid.', internalDetails(context))
    }
    return parsed.data
  }

  /**
   * Step 5, shared by execution and resolution: run one executor call.
   * Canonical failures pass through unchanged; anything else is sanitized.
   */
  async function dispatch(
    operation: RegisteredOperation,
    context: InvocationContext,
    call: CallLabel,
    run: () => Promise<WireValue>
  ): Promise<WireValue> {
    try {
      return await run()
    } catch (error) {
      if (error instanceof MactsError) {
        throw error
      }
      // The raw failure may carry native or third-party detail; it stays in the
      // operator log and the local `cause`, never in the caller's message.
      log().error(
        {
          err: loggableError(error, context.credential),
          ...call,
          operation: operation.descriptor.id,
          provider: executor.provider,
        },
        'Executor failed with a non-canonical error'
      )
      throw new InternalError('The operation failed unexpectedly.', internalDetails(context), {
        cause: error,
      })
    }
  }

  /**
   * Step 5 of `invoke`: execute the operation, then validate its result
   * against the operation's output contract ({@link validateOutput}).
   */
  async function execute(
    operation: RegisteredOperation,
    input: WireRecord,
    context: InvocationContext
  ): Promise<WireValue> {
    const { descriptor, manifest } = operation
    const shape = resultShapeOf(operation)
    const base = {
      manifest,
      target: descriptor.target,
      inputPlan: descriptor.input.plan,
      ...(context.signal === undefined ? {} : { signal: context.signal }),
    }
    const run = (request: ExecutionRequest): Promise<WireValue> =>
      dispatch(operation, context, { operation: descriptor.id }, () => executor.execute(request))

    switch (shape.kind) {
      case 'direct':
        return validateOutput(
          operation,
          descriptor.output,
          await run({ ...base, input, outputPlan: descriptor.output.plan })
        )
      case 'whole': {
        const items = await run({ ...base, input, outputPlan: itemsPlan(shape.page) })
        return validateOutput(operation, descriptor.output, { items })
      }
      case 'paged': {
        const { window, inputs } = pageWindowOf(descriptor.id, input)
        const result = await run({
          ...base,
          input: inputs,
          outputPlan: itemsPlan(shape.page),
          page: window,
        })
        const page = assemblePage(operation, window, inputs, result)
        return validateOutput(operation, descriptor.output, page)
      }
    }
  }

  /**
   * The page window a paged call reads, from its paging inputs, and the call's
   * other inputs, which the executor receives without the paging inputs.
   *
   * @throws `ValidationError` at `["cursor"]` for a cursor that cannot
   *   continue this call (see `decodePageCursor`).
   */
  function pageWindowOf(
    operation: OperationId,
    input: WireRecord
  ): { window: PageWindow; inputs: WireRecord } {
    const inputs: Record<string, WireValue> = {}
    for (const [key, value] of Object.entries(input)) {
      if (key !== PAGE_SIZE_INPUT && key !== CURSOR_INPUT) inputs[key] = value
    }
    const size = pageSizeOf(input[PAGE_SIZE_INPUT])
    const cursor = input[CURSOR_INPUT]
    if (typeof cursor !== 'string') return { window: { offset: 0, size }, inputs }
    const position = decodePageCursor(cursor, { operation, inputs })
    return { window: { offset: position.offset, size, anchor: position.anchor }, inputs }
  }

  /**
   * The page an executor's window result makes, with the cursor of the next
   * page when more items remain: exactly when `offset + size < length`. The
   * next page starts after the items returned and is anchored on the last of
   * them.
   *
   * @throws `UnexpectedValueError` when the executor's result is not a window
   *   result, or claims more items remain after a page with none.
   */
  function assemblePage(
    operation: RegisteredOperation,
    window: PageWindow,
    inputs: WireRecord,
    result: WireValue
  ): WireValue {
    const id = operation.descriptor.id
    const parsed = PageWindowResultSchema.safeParse(result)
    if (!parsed.success) {
      const issues = toValueFreeIssues(parsed.error.issues, result)
      log().warn(
        { operation: id, provider: executor.provider, issues },
        'Executor page window result is malformed'
      )
      throw new UnexpectedValueError(
        `The "${id}" operation ran in the app, but its page of results is malformed.`,
        { issues }
      )
    }
    // The schema admits only JSON content, which is what a wire value is.
    const items = parsed.data.items as WireValue[]
    const { length, last } = parsed.data
    if (window.offset + window.size >= length) return { items }
    if (items.length === 0 || last === undefined) {
      log().warn(
        { operation: id, provider: executor.provider },
        'Executor page window claims more items after an empty page'
      )
      throw new UnexpectedValueError(
        `The "${id}" operation ran in the app, but its page of results is malformed.`,
        { issues: [{ path: [], message: 'More items remain, but the page holds none' }] }
      )
    }
    const nextCursor = encodePageCursor(
      { operation: id, inputs },
      { offset: window.offset + items.length, anchor: last }
    )
    return { items, nextCursor }
  }

  /**
   * Read the resource and cardinality a reference names, which select the
   * operation it resolves as. Only these routing fields are checked here; the
   * whole reference is validated after governance ({@link validateReference}).
   */
  function readReferenceTarget(app: RegisteredApp, reference: unknown): ReferenceTarget {
    const payload = isRecord(reference) ? reference['reference'] : undefined
    if (!isRecord(payload)) {
      throw new ValidationError('A reference must be a reference control record.', {
        issues: [{ path: [], message: 'Expected a reference control record, {"reference": {…}}' }],
      })
    }
    const resource = payload['resource']
    if (typeof resource !== 'string' || !Object.hasOwn(app.contract.resources, resource)) {
      throw new ValidationError('The reference names no resource of the app.', {
        issues: [
          {
            path: ['reference', 'resource'],
            message:
              typeof resource === 'string'
                ? `The ${app.contract.app} app has no resource "${resource}"`
                : 'Expected a resource key',
          },
        ],
      })
    }
    const cardinality = payload['cardinality']
    if (cardinality !== 'one' && cardinality !== 'many') {
      throw new ValidationError('The reference has no valid cardinality.', {
        issues: [{ path: ['reference', 'cardinality'], message: 'Expected "one" or "many"' }],
      })
    }
    return { resource, cardinality, payload }
  }

  /**
   * The registered operation a reference resolves as, with the value type of
   * what it returns: the resource's `get` operation for a single reference,
   * its `list` operation for a collection (whose result is an array of the
   * page's items, see {@link referenceResultType}).
   *
   * @remarks
   * The contract records which operation that is (`ResourceDescriptor.get` and
   * `.list`, chosen when the contract was generated), so the runtime reads it
   * from the contract, the source of truth, and never re-derives it from the
   * manifest. Registration has already checked every recorded id against the
   * contract's operations. The operation is found through the same lookup as
   * `invoke`'s ({@link callableOperation}), so a resource that records no such
   * operation, or one marked `unavailable`, is not resolvable.
   */
  function resolvingOperation(app: RegisteredApp, target: ReferenceTarget): ResolvingOperation {
    const { resource, cardinality } = target
    const entry = app.resolving.get(resource)?.[cardinality]
    const operation = entry === undefined ? undefined : callableOperation(entry.id)
    if (entry === undefined || operation === undefined) {
      const shape = resolvingOperationKey(cardinality)
      throw new InvalidSelectionError(
        `References to "${resource}" cannot be resolved: the ${app.contract.app} app has no ${shape} operation for it.`,
        { resource }
      )
    }
    return { operation, result: entry.result }
  }

  /**
   * Validate the whole reference with the app contract's reference value type,
   * `t.reference(() => contract, resource, cardinality)`, whose scope is the
   * contract (its app and resource table), and return its payload in wire form.
   */
  function validateReference(
    app: RegisteredApp,
    target: ReferenceTarget,
    reference: unknown
  ): ReferenceWire {
    const type =
      target.cardinality === 'one'
        ? ValueTypes.reference(() => app.contract, target.resource, 'one')
        : ValueTypes.reference(() => app.contract, target.resource, 'many')
    const parsed = type.wire.safeParse(reference)
    if (!parsed.success) {
      throw new ValidationError('The reference failed validation.', {
        issues: toValidationIssues(parsed.error.issues),
      })
    }
    // The schema admits exactly `{ reference: ReferenceWire }`; its declared
    // output type (`WireValue`) cannot say so.
    return (parsed.data as { readonly reference: ReferenceWire }).reference
  }

  /**
   * Validate an executor result against the operation's output contract
   * (D11), and return it unchanged when it conforms.
   *
   * @remarks
   * Every result is checked, on `invoke` and on resolution alike, unless the
   * operation's output plan is `passthrough`: such a value has no wire
   * encoding, so `output.wire` does not describe it (D9). The skip is decided
   * by the operation's descriptor, which the runtime holds; nothing an
   * executor returns or declares about itself can turn the check off.
   *
   * A mismatch means the app operation ran: whatever it changed in the app has
   * happened, and only the result is unusable. The error says so, so a caller
   * never retries a create or a send on the assumption that nothing happened.
   * Its issues name paths and expectations but never repeat the result, which
   * may hold user content and crosses to remote callers. The operator log
   * records each mismatch at warn level, with the operation, the executor's
   * provider, and the same value-free issues.
   *
   * @param output - The contract the result must meet: the operation's
   *   output, or for a resolution the value type of what it resolves to.
   * @param purpose - Why the operation ran, when it ran on the caller's
   *   behalf for something other than a direct call (`'to resolve a
   *   reference'`); named in the error message.
   */
  function validateOutput(
    operation: RegisteredOperation,
    output: ValueType<unknown>,
    result: WireValue,
    purpose?: string
  ): WireValue {
    if (output.plan.kind === 'passthrough') {
      return result
    }
    const parsed = output.wire.safeParse(result)
    if (!parsed.success) {
      const id = operation.descriptor.id
      const issues = toValueFreeIssues(parsed.error.issues, result)
      // Nothing else records a mismatch: governance has already audited the
      // call as allowed, and adapters log only non-canonical failures. The
      // value-free issues are logged, never the result.
      log().warn(
        { operation: id, provider: executor.provider, issues },
        'Executor result violates the output contract'
      )
      throw new UnexpectedValueError(
        `The "${id}" operation ran in the app${purpose === undefined ? '' : ` ${purpose}`}, but its result does not match its contract; do not assume it had no effect.`,
        { issues }
      )
    }
    return result
  }

  /**
   * Validate a resolution result against what the reference resolves to
   * ({@link referenceResultType}: the `get` output, or an array of the `list`
   * page's items, since resolution is not paged) with {@link validateOutput},
   * and, for an identity collection,
   * that it holds exactly one record per entry. A mismatch is an app result
   * that violated the contract.
   *
   * @remarks
   * The count check enforces at the runtime boundary that an identity
   * collection's entry is never silently dropped (D7): an executor must report
   * a missing entry as `TargetNotFoundError`, not omit it. It applies whatever
   * the output plan, because it is about the reference, not the record shape.
   */
  function validateResolution(
    resolving: ResolvingOperation,
    reference: ReferenceWire,
    result: WireValue
  ): WireValue {
    const { operation } = resolving
    const id = operation.descriptor.id
    validateOutput(operation, resolving.result, result, 'to resolve a reference')
    if (reference.form === 'identity' && reference.cardinality === 'many') {
      const expected = reference.entries.length
      const received = Array.isArray(result) ? result.length : undefined
      if (received !== expected) {
        const got = received === undefined ? 'a value that is not an array' : String(received)
        throw new UnexpectedValueError(
          `The result of resolving an identity collection as "${id}" must hold one record per entry: expected ${String(expected)} records, received ${got}.`,
          {
            issues: [
              {
                path: [],
                message: `Expected ${String(expected)} records, one per entry, but received ${got}`,
              },
            ],
          }
        )
      }
    }
    return result
  }

  /**
   * Check that every operation the contract's resource table records as how
   * a resource's references resolve is one of the contract's operations and
   * targets that resource, and index them by resource and cardinality with
   * the value type of what a resolution returns.
   *
   * @throws {@link OperationRegistrationError} naming the resource, the field,
   *   and the id, when a recorded id is not one of the contract's operations,
   *   targets a different resource, or (for `list`) does not return a page: the
   *   contract is inconsistent and must be regenerated.
   */
  function resolvingOperationsOf(
    contract: AppContract<unknown>,
    operations: readonly RegisteredOperation[]
  ): Map<string, ResolvingOperations> {
    const byId = new Map(operations.map((operation) => [operation.descriptor.id, operation]))
    const resolving = new Map<string, ResolvingOperations>()
    for (const [resource, descriptor] of Object.entries(contract.resources)) {
      const entry: Partial<Record<ReferenceCardinality, ResolvingEntry>> = {}
      for (const cardinality of REFERENCE_CARDINALITIES) {
        const field = resolvingOperationKey(cardinality)
        const id = descriptor[field]
        if (id === undefined) continue
        const operation = byId.get(id)
        const targeted = operation?.descriptor.target.resource
        if (operation === undefined || targeted !== resource) {
          const problem =
            operation === undefined
              ? 'which is not one of its operations'
              : targeted === undefined
                ? 'which targets no resource'
                : `which targets resource "${targeted}"`
          throw new OperationRegistrationError(
            `The ${contract.app} contract is inconsistent: resource "${resource}" records "${id}" as its ${field} operation, ${problem}. Regenerate the contract.`
          )
        }
        let result: ValueType<unknown>
        try {
          result = referenceResultType(cardinality, operation.descriptor.output)
        } catch (error) {
          throw new OperationRegistrationError(
            `The ${contract.app} contract is inconsistent: resource "${resource}" records "${id}" as its ${field} operation, whose output is not a page. Regenerate the contract.`,
            { cause: error }
          )
        }
        entry[cardinality] = { id, result }
      }
      resolving.set(resource, entry)
    }
    return resolving
  }

  return {
    registerManifest(manifest) {
      registry.add(operationsFromManifest(manifest))
    },

    registerContract(contract, manifest) {
      const operations = operationsFromContract(contract, manifest)
      if (apps.has(contract.app)) {
        throw new OperationRegistrationError(
          `A contract for app "${contract.app}" is already registered. A runtime serves one contract per app, because that contract's resource table is the app's reference registry; register each app once, or create a separate runtime for a different contract of the same app.`
        )
      }
      // Checked before anything is added, so a refused contract registers nothing.
      const resolving = resolvingOperationsOf(contract, operations)
      registry.add(operations)
      apps.set(contract.app, { contract, resolving })
    },

    operations() {
      return registry.list()
    },

    operation(id) {
      return registry.get(id)
    },

    async invoke(id, input, context) {
      throwIfCancelled(context)
      // The credential is verified before anything else, including the
      // operation lookup: an unauthenticated caller learns nothing beyond the
      // authentication failure, as on every other step.
      const authority = await verify(context, { operation: id })
      admit(authority, context, { operation: id })

      const operation = callableOperation(id)
      if (operation === undefined) {
        // An unknown operation is a caller error (a mistyped or stale id), not
        // an internal failure and not an authorization outcome, so it reports
        // as a validation failure of the request as a whole. An operation
        // marked unavailable can never run, so it is answered the same way.
        throw new ValidationError(`Unknown operation "${id}".`, {
          issues: [{ path: [], message: `No operation is registered with id "${id}"` }],
        })
      }

      checkPermission(operation, authority)
      await enforceGovernance(operation, authority, input, context)
      const validated = validateInput(operation, input, context)

      throwIfCancelled(context)
      return execute(operation, validated, context)
    },

    async resolveReference(appName, reference, context) {
      throwIfCancelled(context)
      const call: CallLabel = { app: appName, call: 'resolveReference' }
      // As in `invoke`, the credential is verified before anything is looked
      // up, so an unauthenticated caller learns nothing about registered apps.
      const authority = await verify(context, call)
      admit(authority, context, call)

      const app = apps.get(appName)
      if (app === undefined) {
        // The counterpart of an unknown operation id in `invoke`: a caller
        // error about the request as a whole.
        throw new ValidationError(`Unknown app "${appName}".`, {
          issues: [{ path: [], message: `No app contract is registered for "${appName}"` }],
        })
      }

      // The resource and cardinality are routing, like `invoke`'s operation id:
      // they select the operation whose permission and policy apply, so they
      // are read first. Everything else about the reference is validated after
      // governance, in the same place `invoke` validates input (D11): an
      // unauthorized caller is denied before the app's reference contract (its
      // resources and identifier types) is used to judge its request, and a
      // malformed reference from an authorized caller is still governed and
      // audited like any other call of that operation.
      const target = readReferenceTarget(app, reference)
      const resolving = resolvingOperation(app, target)
      const { operation } = resolving

      // Only the target resource's permission is checked. A container chain
      // only locates the target natively and contributes no data to the
      // result, so it needs no permission of its own.
      checkPermission(operation, authority)
      await enforceGovernance(operation, authority, target.payload, context)
      const validated = validateReference(app, target, reference)

      throwIfCancelled(context)
      // Resolution is not paged: a collection resolves to its whole selection,
      // shaped by an array of the list's item plan, never by its page plan.
      const request: ResolutionRequest = {
        manifest: operation.manifest,
        reference: validated,
        outputPlan: resolving.result.plan,
        ...(context.signal === undefined ? {} : { signal: context.signal }),
      }
      const result = await dispatch(operation, context, call, () => executor.resolve(request))
      return validateResolution(resolving, validated, result)
    },
  }
}

/** The plan of a page's items as an array: what an executor reads for a list. */
function itemsPlan(page: PageValueType<unknown>) {
  return ValueTypes.array(page.item).plan
}

/**
 * The page size of a paged call: its validated `pageSize` input, or the
 * default when it has none. The input contract has already checked the value
 * is an integer from 1 to the maximum.
 */
function pageSizeOf(value: WireValue | undefined): number {
  if (value !== undefined && isWireRecord(value)) {
    const text = value['integer']
    if (typeof text === 'string') return Number(text)
  }
  return PAGE_SIZE_LIMITS.default
}

/**
 * A call's arguments as audit and approval records summarize them: a list's
 * cursor is recorded only as present (`true`), never its contents, which can
 * include an item's identifier and therefore user content.
 */
function auditableArguments(
  operation: RegisteredOperation,
  input: unknown
): Readonly<Record<string, unknown>> {
  if (!isRecord(input)) return {}
  if (!Object.hasOwn(input, CURSOR_INPUT) || resultShapeOf(operation).kind !== 'paged') {
    return input
  }
  return { ...input, [CURSOR_INPUT]: true }
}

/** The smallest secret worth scrubbing; shorter text would match unrelated words. */
const MIN_SCRUBBED_SECRET_LENGTH = 8

/**
 * An error's operator-log form: name, code, message, and stack, with the
 * caller's credential replaced wherever it appears.
 *
 * Third-party code (a credential verifier, an approval provider, an executor)
 * can echo a request's token in its exception text. The raw error object is
 * never logged, because a logger serializes every enumerable field it carries.
 * Only these four fields are, and each is scrubbed.
 */
function loggableError(
  error: unknown,
  credential: Credential
): {
  readonly name: string
  readonly message: string
  readonly code?: string
  readonly stack?: string
} {
  const secret = credential.reveal()
  const scrub = (text: string): string =>
    secret.length >= MIN_SCRUBBED_SECRET_LENGTH
      ? text.split(secret).join('[redacted credential]')
      : text
  if (!(error instanceof Error)) {
    return { name: typeof error, message: scrub(String(error)) }
  }
  const code = (error as { code?: unknown }).code
  return {
    name: error.name,
    message: scrub(error.message),
    ...(typeof code === 'string' ? { code: scrub(code) } : {}),
    ...(error.stack === undefined ? {} : { stack: scrub(error.stack) }),
  }
}
