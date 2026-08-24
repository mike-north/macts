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
 *    `next()`, so the underlying operation never executes — and returns a
 *    structured 202 pending-approval response naming the gating rule and the
 *    exact permission. This is safe-by-default: with no approval flow yet
 *    (issue #54), executing a confirm-first op would be a governance hole, so
 *    the operation is held pending approval rather than allowed through.
 *
 * The active policy and audit writer are resolved by a {@link GovernanceContext}
 * supplied when the router is built, so a server with no policy configured
 * defaults to allow-all and existing behavior is preserved.
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

import type { MiddlewareHandler } from 'hono'
import type { GovernancePolicy, AuditWriter, PolicyLayer, RiskClass } from '@macts/core'
import { enforceCall, redactArgs } from '@macts/core'
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
 * (`confirm-first`).
 *
 * The underlying operation is **not executed**: the middleware short-circuits
 * with this body and HTTP 202 (Accepted-but-not-yet-acted-on) instead of calling
 * `next()`. The approval flow itself (issue #54) is not built yet, so the call is
 * withheld pending approval rather than allowed through — executing it would be a
 * governance hole. Clients receive the gating rule and exact permission so they
 * can surface "approval required" to the user.
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
 * Shared governance state for an RPC router: the active policy to enforce and an
 * optional audit writer to record decisions.
 *
 * When `policy` permits everything (allow-all) and `writer` is omitted, the
 * middleware is a near-no-op — preserving pre-governance behavior.
 */
export interface GovernanceContext {
  /** The active machine-wide (host) governance policy to enforce against every call. */
  readonly policy: GovernancePolicy
  /**
   * Optional audit sink. When provided, every decision (allow / deny / pending)
   * is appended to it. When omitted, enforcement still runs but nothing is
   * persisted.
   */
  readonly writer?: AuditWriter | undefined
  /**
   * Optional resolver for the policy attached to the authenticated API key.
   *
   * The host policy is machine-wide and can be bound once; *which* key policy
   * applies depends on who authenticated, so it is resolved per request from
   * `apiKeyPayload.sub` (see {@link resolveGovernanceForRequest}). When omitted,
   * or when the key has no policy of its own, the host policy alone governs —
   * exactly the behavior before per-key policies existed.
   */
  readonly keyPolicies?: KeyPolicyResolver | undefined
}

/**
 * A {@link GovernanceContext} with the authenticated key's policy resolved for
 * this request.
 *
 * Carries every field of the context it was resolved from, so downstream
 * consumers keep whatever else the context holds (audit writer, approval
 * wiring) and only gain `keyPolicy`.
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
 * A resolver failure propagates to the caller, which must fail the request
 * closed: an unreadable key policy is *not* the same as no key policy, and
 * treating it as such would silently widen the boundary back to the host policy.
 *
 * @param governance - The router-bound governance context (host policy, writer,
 *   optional key-policy resolver).
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
  /** The shared governance context (active policy + audit writer). */
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
 * - `pending-approval` (`confirm-first`) → 202 {@link GovernancePendingResponse};
 *   the handler **never runs**. The operation is withheld pending approval. This
 *   is safe-by-default: with no approval flow yet (issue #54), letting a
 *   confirm-first call execute would be a governance hole, so it is held rather
 *   than allowed through. The decision is audited as `'pending'`.
 *
 * @param options - Endpoint permission, risk class, and governance context.
 * @returns A Hono middleware handler.
 */
export function requirePolicy(
  options: RequirePolicyOptions
): MiddlewareHandler<{ Variables: AuthVariables }> {
  const { permission, risk, governance } = options

  return async (c, next) => {
    // The API-key id (`sub`) attributes the audit record. This middleware runs
    // after auth, so the payload is present and typed as such.
    const apiKeyId = c.get('apiKeyPayload').sub

    // Summarize the request body for the audit record. Redaction is best-effort;
    // a body that is absent or not an object yields "(no arguments)".
    const argsSummary = await summarizeRequestArgs(c)

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
      // Safe-by-default: a confirm-first call must NOT execute while no approval
      // flow exists (issue #54). Withhold the operation — do not call next() —
      // and return a structured 202 pending-approval body naming the gating rule
      // and the exact permission. The decision was already audited as 'pending'.
      return c.json<GovernancePendingResponse>(
        {
          pendingApproval: {
            message: decision.reason,
            permission,
            // Names the layer whose rule held the call, so the hold can be routed
            // to the approver responsible for that layer.
            layer: decision.evaluation.layer,
          },
        },
        202
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
