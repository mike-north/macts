/**
 * Governance-policy enforcement middleware for the macts API server.
 *
 * This is the call-time enforcement layer for issue #53: an **additional**
 * authorization check, layered *after* the API-key permission check
 * ({@link ../middleware/permission.js}). Where `requirePermission` answers "does
 * this key carry this permission?", this middleware answers "does the active
 * governance policy permit this capability *at all*?".
 *
 * For every capability call it:
 *
 * 1. Evaluates the active `GovernancePolicy` against the endpoint's
 *    `app:resource:operation` permission and the command's risk class, using
 *    {@link enforceCall} from `@macts/core` (the single source of truth).
 * 2. Writes one audit record per decision (via the injected `AuditWriter`),
 *    using the `'pending'` audit decision for confirm-first calls (never
 *    `'denied'`).
 * 3. On a denial, fails loud with a 403 and the human-readable reason naming the
 *    violated rule and the exact permission.
 * 4. On a `confirm-first` rule, **withholds the call** — it does NOT call
 *    `next()` — and then either asks a human or reports the call as held:
 *
 *    - **With an approval provider configured**, it asks that provider for a
 *      decision and awaits it in-request within a bounded timeout. An explicit
 *      approval releases the call to `next()` and is audited `'approved'`;
 *      everything else (rejection, timeout, provider failure) denies with a 403
 *      and is audited `'rejected'`.
 *    - **With no provider configured**, the operation stays withheld and the
 *      middleware returns a structured 202 pending-approval response naming the
 *      gating rule and the exact permission. This is safe-by-default: executing
 *      a confirm-first op with nobody to ask would be a governance hole.
 *
 * ## No unaudited approvals
 *
 * A `confirm-first` operation must never execute without its decision being
 * persisted, and that is enforced in two layers:
 *
 * - **Structurally.** {@link GovernanceContext} is a union: the arm that carries
 *   an `approvals` gate *requires* a `writer`. A context that seeks approval but
 *   has nowhere to record it does not type-check, and `loadApprovalGate` refuses
 *   to build one at runtime.
 * - **At runtime.** If writing the resolving audit record fails anyway (a full
 *   disk, a broken sink), the call is **denied** rather than released. An
 *   approval that leaves no durable record is not an approval this middleware
 *   will act on.
 *
 * The active policy, audit writer, and approval gate are resolved by a
 * {@link GovernanceContext} supplied when the router is built, so a server with
 * no policy configured defaults to allow-all and existing behavior is preserved.
 *
 * That host policy is machine-wide, but an API key may carry a policy of its own
 * that only ever *tightens* it. Which key policy applies depends on who
 * authenticated, so it is resolved **per request** from `apiKeyPayload.sub` via
 * {@link resolveGovernanceForRequest} and composed with the host policy inside
 * `enforceCall`: the effective decision is the stricter of the two, and a key
 * policy can never grant what the host policy withholds. A key with no policy of
 * its own is governed by the host policy alone, unchanged.
 *
 * @packageDocumentation
 */

import { randomUUID } from 'node:crypto'
import type { MiddlewareHandler } from 'hono'
import type {
  GovernancePolicy,
  ApprovalDeniedState,
  ApprovalProvider,
  ApprovalRequest,
  AuditWriter,
  PolicyLayer,
  RiskClass,
} from '@macts/core'
import {
  DEFAULT_APPROVAL_TIMEOUT_MS,
  enforceCall,
  recordApprovalDecision,
  redactArgs,
  seekApproval,
} from '@macts/core'
import { getTracer, SpanStatusCode } from '../../telemetry.js'
import { getLogger } from '../../logger.js'
import type { KeyPolicyResolver } from '../governance/key-policy.js'
import type { AuthVariables } from './auth.js'

/**
 * Error-response body for a governance-policy denial.
 */
export interface GovernanceDeniedResponse {
  error: {
    code: 'GOVERNANCE_DENIED'
    /** Human-readable reason naming the violated rule and the exact permission. */
    message: string
    /** The `app:resource:operation` that was denied. */
    permission: string
  }
}

/**
 * Response body returned when a capability requires human confirmation
 * (`confirm-first`) and **no approval provider is configured**.
 *
 * The underlying operation is **not executed**: the middleware short-circuits
 * with this body and HTTP 202 (Accepted-but-not-yet-acted-on) instead of calling
 * `next()`. With nobody to ask, the call is withheld pending approval rather
 * than allowed through — executing it would be a governance hole. Clients
 * receive the gating rule and exact permission so they can surface "approval
 * required" to the user.
 *
 * Configure an approval provider (see {@link ApprovalGateContext}) to have the
 * middleware seek a human decision in-request instead.
 */
export interface GovernancePendingResponse {
  pendingApproval: {
    /** Human-readable reason naming the gating rule and the exact permission. */
    message: string
    /** The `app:resource:operation` awaiting approval (and withheld). */
    permission: string
    /**
     * Which policy layer held the call: the machine-wide `host` policy, or the
     * narrower policy attached to the authenticated API `key`.
     *
     * A host-layer hold and a key-layer hold are different questions and may
     * belong to different approvers, so the layer travels with the hold rather
     * than being re-derived downstream.
     */
    layer: PolicyLayer
  }
}

/**
 * Error-response body returned when a `confirm-first` call was put to a human
 * and did not come back approved.
 *
 * Distinct from {@link GovernanceDeniedResponse}: that means "policy forbids
 * this outright", whereas this means "policy routed this to a human, and the
 * answer was not yes". Clients that surface these differently can tell a user
 * "your admin does not allow this" from "your approval request was declined /
 * timed out — try again".
 */
export interface GovernanceApprovalDeniedResponse {
  error: {
    code: 'GOVERNANCE_APPROVAL_DENIED'
    /** Human-readable reason, naming the permission and how the request ended. */
    message: string
    /** The `app:resource:operation` that was denied. */
    permission: string
    /**
     * How the approval request ended: `'rejected'` (a human declined, or the
     * approval channel failed) or `'timeout'` (no decision arrived in time).
     * Both deny the call — the distinction is diagnostic.
     *
     * Narrowed to the denied states, so a client can model this response
     * exhaustively without an impossible `approved` branch.
     */
    approval: ApprovalDeniedState
  }
}

/**
 * The configured human-in-the-loop approval gate.
 *
 * Supplying one turns a `confirm-first` hold from "return 202, call withheld"
 * into "ask a human now, within a bounded wait".
 */
export interface ApprovalGateContext {
  /** The provider asked to obtain a human decision. */
  readonly provider: ApprovalProvider
  /**
   * Bound, in milliseconds, on how long a request waits for a human. Past it
   * the call is denied (fail-closed).
   *
   * @defaultValue `DEFAULT_APPROVAL_TIMEOUT_MS` (two minutes)
   */
  readonly timeoutMs?: number | undefined
}

/**
 * Governance state shared by every deployment, whichever approval channel it
 * does or does not have.
 *
 * Both arms of {@link GovernanceContext} extend this, so the machine-wide policy
 * and the per-key resolver are declared once and the two arms cannot drift.
 */
export interface GovernanceContextBase {
  /** The active machine-wide (host) governance policy to enforce against every call. */
  readonly policy: GovernancePolicy
  /**
   * Optional resolver for the policy attached to the authenticated API key.
   *
   * The host policy is machine-wide and can be bound once; *which* key policy
   * applies depends on who authenticated, so it is resolved per request from
   * `apiKeyPayload.sub` (see {@link resolveGovernanceForRequest}). When omitted,
   * or when the key has no policy of its own, the host policy alone governs —
   * exactly the behavior before per-key policies existed.
   *
   * A key policy can only ever tighten the host policy, so this never widens
   * what a deployment allows — including which calls reach an approval gate.
   */
  readonly keyPolicies?: KeyPolicyResolver | undefined
}

/**
 * Governance state for a deployment with **no** approval channel configured.
 *
 * `confirm-first` calls are withheld and reported as
 * {@link GovernancePendingResponse} (202). The audit writer is optional here,
 * as it has always been: enforcement still runs without one, it just persists
 * nothing.
 */
export interface GovernanceContextWithoutApprovals extends GovernanceContextBase {
  /**
   * Optional audit sink. When provided, every decision (allow / deny / pending)
   * is appended to it.
   */
  readonly writer?: AuditWriter | undefined
  /** No approval gate. */
  readonly approvals?: undefined
}

/**
 * Governance state for a deployment that seeks human approval.
 *
 * The audit writer is **required** on this arm. Seeking a human decision and
 * then having nowhere to record it would let a `confirm-first` operation
 * execute with no attributable trace of who permitted it — so that combination
 * is made unrepresentable rather than merely discouraged.
 */
export interface GovernanceContextWithApprovals extends GovernanceContextBase {
  /**
   * Audit sink for every decision (allow / deny / pending / approved /
   * rejected). Required whenever an approval gate is present.
   */
  readonly writer: AuditWriter
  /** The approval gate consulted on a `confirm-first` hold. */
  readonly approvals: ApprovalGateContext
}

/**
 * Shared governance state for an RPC router: the active policy to enforce, an
 * audit writer to record decisions, and — optionally — an approval gate.
 *
 * When `policy` permits everything (allow-all) and `writer` is omitted, the
 * middleware is a near-no-op — preserving pre-governance behavior.
 */
export type GovernanceContext = GovernanceContextWithoutApprovals | GovernanceContextWithApprovals

/**
 * A {@link GovernanceContext} with the authenticated key's policy resolved for
 * this request.
 *
 * Distributes over the union, so the approvals arm survives resolution: a
 * resolved context that came in with an approval gate still carries it (and its
 * required writer) on the way out.
 */
export type ResolvedGovernanceContext = GovernanceContext & {
  /**
   * The authenticated key's own policy, or `undefined` when it has none. Never
   * a permissive placeholder: absence means "host policy alone".
   */
  readonly keyPolicy?: GovernancePolicy | undefined
}

/**
 * Resolve the governance context for a single request from the authenticated
 * API key.
 *
 * This is the per-request half of governance resolution. It exists as a named,
 * exported seam (rather than inline middleware code) because "which policy
 * applies to this caller" is a question other surfaces need to answer the same
 * way.
 *
 * The whole context is carried through, not just the policy, so an approval gate
 * configured on the router reaches the request untouched.
 *
 * A resolver failure propagates to the caller, which must fail the request
 * closed: an unreadable key policy is *not* the same as no key policy, and
 * treating it as such would silently widen the boundary back to the host policy.
 *
 * @param governance - The router-bound governance context (host policy, writer,
 *   optional approval gate, optional key-policy resolver).
 * @param apiKeyId - The authenticated key's id (`ApiKeyPayload.sub`).
 * @returns The context with `keyPolicy` resolved for this request.
 */
export async function resolveGovernanceForRequest(
  governance: GovernanceContext,
  apiKeyId: string
): Promise<ResolvedGovernanceContext> {
  if (governance.keyPolicies === undefined) {
    return governance
  }
  const keyPolicy = await governance.keyPolicies.resolve(apiKeyId)
  return { ...governance, keyPolicy }
}

/**
 * Options for {@link requirePolicy}.
 */
export interface RequirePolicyOptions {
  /** The `app:resource:operation` permission this endpoint maps to. */
  readonly permission: string
  /** The pre-computed risk class of the endpoint's operation. */
  readonly risk: RiskClass
  /**
   * The shared governance context (active policy, audit writer, approval gate).
   */
  readonly governance: GovernanceContext
}

/**
 * Create governance-enforcement middleware for a single endpoint.
 *
 * Must run AFTER {@link ../middleware/auth.js} (so the API-key id is available
 * for audit attribution) and is intended to run AFTER
 * {@link ../middleware/permission.js} (policy enforcement is an additive layer,
 * not a replacement).
 *
 * Short-circuit behavior by outcome:
 *
 * - `allowed` → calls `next()`; the existing handler runs.
 * - `denied` → 403 {@link GovernanceDeniedResponse}; the handler never runs.
 * - `pending-approval` (`confirm-first`) → the handler is withheld and the
 *   decision is audited as `'pending'`. Then:
 *   - with an approval gate configured, a human is asked in-request within the
 *     gate's bounded timeout. Approved → audited `'approved'` and released to
 *     `next()`. Rejected, timed out, or the provider failed → audited
 *     `'rejected'` and answered 403 {@link GovernanceApprovalDeniedResponse}.
 *     If the resolving audit record cannot be written, the call is denied the
 *     same way rather than released.
 *   - with no gate configured, 202 {@link GovernancePendingResponse}; the
 *     handler **never runs**. Letting a confirm-first call execute with nobody
 *     to ask would be a governance hole, so it is held rather than allowed
 *     through.
 *
 * @param options - Endpoint permission, risk class, and governance context.
 * @returns A Hono middleware handler.
 */
export function requirePolicy(
  options: RequirePolicyOptions
): MiddlewareHandler<{ Variables: AuthVariables }> {
  const { permission, risk, governance } = options

  return async (c, next) => {
    // The API-key id (`sub`) attributes the audit record, and the optional
    // human-readable name makes an approval prompt legible. This middleware runs
    // after auth, so the payload is present and typed as such.
    const payload = c.get('apiKeyPayload')
    const apiKeyId = payload.sub

    // Summarize the request body for the audit record. Redaction is best-effort;
    // a body that is absent or not an object yields "(no arguments)".
    const argsSummary = await summarizeRequestArgs(c)

    // Minted before enforcement so the 'pending' record and the later
    // approved/rejected record share a correlation key. Two identical
    // overlapping calls from the same key are otherwise indistinguishable in the
    // trail, and an audit consumer could not tell which resolution paired with
    // which hold. Unused (and unrecorded) when the call is not withheld.
    const approvalId = randomUUID()

    const span = getTracer('macts-api').startSpan('governance.enforce', {
      attributes: { 'governance.permission': permission, 'governance.risk': risk },
    })

    // Which policy applies depends on who authenticated, so it is resolved here,
    // per request, rather than bound when the router was built.
    let resolved
    try {
      resolved = await resolveGovernanceForRequest(governance, apiKeyId)
    } catch (error) {
      // Fail closed. A key policy we cannot read must never degrade into "this
      // key has no policy", which would widen the boundary back to the host
      // policy alone.
      span.setStatus({ code: SpanStatusCode.ERROR })
      span.end()
      getLogger().error(
        { err: error, permission, apiKeyId },
        'Could not resolve the per-key governance policy'
      )
      return c.json(
        {
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Governance enforcement failed',
          },
        },
        500
      )
    }

    let decision
    try {
      decision = await enforceCall({
        policy: resolved.policy,
        ...(resolved.keyPolicy === undefined ? {} : { keyPolicy: resolved.keyPolicy }),
        permission,
        risk,
        audit: {
          apiKeyId,
          argsSummary,
          timestamp: new Date(),
          approvalId,
        },
        ...(resolved.writer ? { writer: resolved.writer } : {}),
      })
    } catch (error) {
      // An audit-writer failure must not silently allow the call through. Treat a
      // failed enforcement as a server error and fail closed.
      span.setStatus({ code: SpanStatusCode.ERROR })
      span.end()
      getLogger().error({ err: error, permission }, 'Governance enforcement failed')
      return c.json(
        {
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Governance enforcement failed',
          },
        },
        500
      )
    }

    span.setAttribute('governance.outcome', decision.outcome)
    span.setAttribute('governance.layer', decision.evaluation.layer)
    span.setStatus({
      code: decision.outcome === 'denied' ? SpanStatusCode.ERROR : SpanStatusCode.OK,
    })
    span.end()

    if (decision.outcome === 'denied') {
      return c.json<GovernanceDeniedResponse>(
        {
          error: {
            code: 'GOVERNANCE_DENIED',
            message: decision.reason,
            permission,
          },
        },
        403
      )
    }

    if (decision.outcome === 'pending-approval') {
      if (governance.approvals === undefined) {
        // Safe-by-default: with no approval channel configured there is nobody
        // to ask, so a confirm-first call must NOT execute. Withhold the
        // operation — do not call next() — and return a structured 202
        // pending-approval body naming the gating rule and the exact permission.
        // The decision was already audited as 'pending'.
        return c.json<GovernancePendingResponse>(
          {
            pendingApproval: {
              message: decision.reason,
              permission,
              // Names the layer whose rule held the call, so an operator (or a
              // client retrying later) knows which policy to look at.
              layer: decision.evaluation.layer,
            },
          },
          202
        )
      }

      // Narrowed to the approvals arm of GovernanceContext, so `writer` is
      // present by construction — an approval gate cannot exist without one.
      const gate = governance.approvals
      const writer = governance.writer

      const approvalSpan = getTracer('macts-api').startSpan('governance.approval', {
        attributes: {
          'governance.permission': permission,
          'governance.risk': risk,
          'governance.approval.provider': gate.provider.name,
        },
      })

      const request: ApprovalRequest = {
        id: approvalId,
        permission,
        risk,
        identity: {
          apiKeyId,
          ...(payload.name === undefined ? {} : { apiKeyName: payload.name }),
        },
        argsSummary,
        rule: decision.evaluation.rule,
        reason: decision.reason,
        timeoutMs: gate.timeoutMs ?? DEFAULT_APPROVAL_TIMEOUT_MS,
        requestedAt: new Date(),
        // The layer whose rule held this call — host-wide policy, or the policy
        // attached to this specific key. A provider that declares
        // `supportsDistinctRouting` can route the two to different approvers.
        layer: decision.evaluation.layer,
      }

      // seekApproval never rejects and never returns `approved` for a hang, a
      // provider failure, or a malformed response — so no branch below can turn
      // a broken approval channel into an executed call.
      const outcome = await seekApproval({ provider: gate.provider, request })

      approvalSpan.setAttribute('governance.approval.state', outcome.state)
      approvalSpan.setAttribute('governance.approval.id', request.id)
      approvalSpan.setAttribute('governance.approval.layer', request.layer)
      approvalSpan.setStatus({
        code: outcome.approved ? SpanStatusCode.OK : SpanStatusCode.ERROR,
      })
      approvalSpan.end()

      try {
        await recordApprovalDecision({
          permission,
          outcome,
          audit: { apiKeyId, argsSummary, timestamp: new Date(), approvalId },
          writer,
        })
      } catch (error) {
        // Runtime backstop to the structural guarantee: an approval that leaves
        // no durable record is not one this middleware will act on. Deny — do
        // not release, and do not report a generic server error that a client
        // might retry into an unaudited execution.
        getLogger().error(
          { err: error, permission, approvalId, approvalState: outcome.state },
          'Approval decision could not be audited; denying the call'
        )
        return c.json<GovernanceApprovalDeniedResponse>(
          {
            error: {
              code: 'GOVERNANCE_APPROVAL_DENIED',
              message: `The approval decision for "${permission}" could not be durably recorded, so the call was not released. Treated as rejected (fail-closed).`,
              permission,
              approval: 'rejected',
            },
          },
          403
        )
      }

      if (outcome.approved) {
        getLogger().info(
          {
            permission,
            approvalId,
            provider: gate.provider.name,
            layer: request.layer,
            hasEvidence: outcome.evidence !== undefined,
          },
          'Capability call approved by a human'
        )
        return next()
      }

      getLogger().warn(
        {
          permission,
          approvalId,
          provider: gate.provider.name,
          layer: request.layer,
          approvalState: outcome.state,
          ...(outcome.failure === undefined ? {} : { approvalFailure: outcome.failure }),
          // The full detail (including any third-party exception text) belongs
          // in operator-side logs, never in the response body below.
          detail: outcome.auditReason,
        },
        'Capability call denied at the approval gate'
      )
      return c.json<GovernanceApprovalDeniedResponse>(
        {
          error: {
            code: 'GOVERNANCE_APPROVAL_DENIED',
            message: outcome.reason,
            permission,
            approval: outcome.state,
          },
        },
        403
      )
    }

    return next()
  }
}

/**
 * Best-effort summary of the request body for an audit record.
 *
 * Reads the JSON body (cloning the request so the downstream handler can still
 * read it), then runs {@link redactArgs} to strip sensitive top-level keys. Any
 * failure (no body, non-JSON, non-object) yields the safe empty summary rather
 * than throwing — auditing must never break a request.
 */
async function summarizeRequestArgs(c: { req: { raw: Request } }): Promise<string> {
  try {
    // Clone so reading the body here does not consume it for the handler.
    const cloned = c.req.raw.clone()
    const body: unknown = await cloned.json()
    if (typeof body === 'object' && body !== null && !Array.isArray(body)) {
      return redactArgs(body as Record<string, unknown>)
    }
    return redactArgs({})
  } catch {
    return redactArgs({})
  }
}
