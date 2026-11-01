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
 * 2. check the operation's permission against that authority;
 * 3. enforce governance policy, auditing the decision and, for a held call,
 *    seeking and recording a human decision;
 * 4. validate the input against the operation's wire contract;
 * 5. hand the authorized, validated request to the executor.
 *
 * No step can be skipped: there is no trusted-caller mode, and a local caller
 * presents a credential exactly as a remote one does. Every failure is raised
 * as a canonical structured error, and any failure the runtime did not
 * anticipate denies the call rather than letting it through.
 *
 * @packageDocumentation
 */

import { randomUUID } from 'node:crypto'
import type { Logger } from 'pino'
import type { AppManifest, ApprovalRequest, ExecutionRequest, Executor } from '@macts/core'
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
  MactsError,
  OperationCancelledError,
  PermissionDeniedError,
  PolicyDeniedError,
  ValidationError,
  type AppContract,
  type Authority,
  type Credential,
  type InvocationContext,
  type OperationId,
  type WireRecord,
  type WireValue,
} from '@macts/contracts'
import { ALLOW_ALL_POLICY } from './governance/active-policy.js'
import { resolveGovernanceForRequest, type GovernanceContext } from './governance/context.js'
import { createKeyStoreVerifier, type CredentialVerifier } from './invocation/verifier.js'
import { hasPermission } from './keys/validator.js'
import { getLogger } from './logger.js'
import { toValidationIssues } from './operations/passthrough.js'
import {
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
   * Governance enforced on every call.
   *
   * @defaultValue allow-all host policy, no audit writer, no approval gate
   */
  readonly governance?: GovernanceContext
  /**
   * Turns credentials into authority.
   *
   * @defaultValue {@link createKeyStoreVerifier}
   */
  readonly verifier?: CredentialVerifier
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
   * @throws `OperationRegistrationError` when an operation id is already
   *   registered or the manifest yields a malformed id or permission.
   */
  registerManifest(manifest: AppManifest): void
  /**
   * Register a generated contract's operations after checking each against the
   * manifest.
   *
   * @throws `OperationRegistrationError` when a descriptor's permission or
   *   target disagrees with the manifest, names an operation the manifest does
   *   not expose, or an id is already registered.
   */
  registerContract(contract: AppContract<unknown>, manifest: AppManifest): void
  /** Every registered operation, in registration order. */
  operations(): readonly RegisteredOperation[]
  /** The operation registered under `id`, if any. */
  operation(id: OperationId): RegisteredOperation | undefined
  /**
   * Run one operation through the full invocation pipeline.
   *
   * @param id - The operation to run.
   * @param input - The input record in wire form, as received.
   * @param context - The caller's credential, and optional cancellation and
   *   correlation.
   * @returns The operation's result in wire form.
   * @throws A canonical structured error from `@macts/contracts` for every
   *   failure.
   */
  invoke(id: OperationId, input: unknown, context: InvocationContext): Promise<WireValue>
}

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
 * it. Governance defaults to allow-all, so a runtime with no configured policy
 * behaves as macts does with no policy file, while still verifying
 * credentials, checking permissions, and validating input.
 *
 * @param options - The executor and optional governance, verifier, clock, and
 *   logger.
 * @returns A runtime with no operations registered.
 */
export function createRuntime(options: CreateRuntimeOptions): MactsRuntime {
  const executor = options.executor
  const governance: GovernanceContext = options.governance ?? { policy: ALLOW_ALL_POLICY }
  const verifier = options.verifier ?? createKeyStoreVerifier()
  const clock = options.clock ?? (() => new Date())
  const log = (): RuntimeLogger => options.logger ?? getLogger()
  const registry = new OperationRegistry()

  /** Details for an internal failure, carrying the caller's correlation id when given. */
  function internalDetails(context: InvocationContext): { correlationId?: string } {
    return context.correlationId === undefined ? {} : { correlationId: context.correlationId }
  }

  /** Step 0 and the pre-execution check: honor a caller's abort. */
  function throwIfCancelled(context: InvocationContext): void {
    if (context.signal?.aborted === true) {
      throw new OperationCancelledError('The operation was cancelled.', {})
    }
  }

  /** Step 1: verify the credential. Anything but a canonical failure is internal. */
  async function verify(context: InvocationContext, id: OperationId): Promise<Authority> {
    try {
      return await verifier.verify(context.credential)
    } catch (error) {
      if (error instanceof MactsError) {
        throw error
      }
      log().error(
        { err: loggableError(error, context.credential), operation: id },
        'Credential verification failed unexpectedly'
      )
      throw new InternalError('Credential verification failed.', internalDetails(context), {
        cause: error,
      })
    }
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
   * Step 3: governance. Resolves the caller's key policy, enforces and audits
   * the decision, and for a held call either reports it pending (no gate) or
   * obtains and records a human decision. Returns only when the call may run.
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
    const argsSummary = redactArgs(isRecord(input) ? input : {})
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

  /** Step 5: dispatch through the executor. Non-canonical failures are sanitized. */
  async function execute(
    operation: RegisteredOperation,
    input: WireRecord,
    context: InvocationContext
  ): Promise<WireValue> {
    const { descriptor, manifest } = operation
    const request: ExecutionRequest = {
      manifest,
      target: descriptor.target,
      input,
      inputPlan: descriptor.input.plan,
      outputPlan: descriptor.output.plan,
      ...(context.signal === undefined ? {} : { signal: context.signal }),
    }
    try {
      return await executor.execute(request)
    } catch (error) {
      if (error instanceof MactsError) {
        throw error
      }
      // The raw failure may carry native or third-party detail; it stays in the
      // operator log and the local `cause`, never in the caller's message.
      log().error(
        {
          err: loggableError(error, context.credential),
          operation: descriptor.id,
          provider: executor.provider,
        },
        'Executor failed with a non-canonical error'
      )
      throw new InternalError('The operation failed unexpectedly.', internalDetails(context), {
        cause: error,
      })
    }
  }

  return {
    registerManifest(manifest) {
      registry.add(operationsFromManifest(manifest))
    },

    registerContract(contract, manifest) {
      registry.add(operationsFromContract(contract, manifest))
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
      const authority = await verify(context, id)

      const operation = registry.get(id)
      if (operation === undefined) {
        // An unknown operation is a caller error (a mistyped or stale id), not
        // an internal failure and not an authorization outcome, so it reports
        // as a validation failure of the request as a whole.
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
  }
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
