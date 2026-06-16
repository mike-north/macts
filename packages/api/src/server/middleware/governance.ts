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
 * @packageDocumentation
 */

import type { MiddlewareHandler } from 'hono'
import type { GovernancePolicy, AuditWriter, RiskClass } from '@macts/core'
import { enforceCall, redactArgs } from '@macts/core'
import { getTracer, SpanStatusCode } from '../../telemetry.js'
import { getLogger } from '../../logger.js'
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
  /** The active governance policy to enforce against every call. */
  readonly policy: GovernancePolicy
  /**
   * Optional audit sink. When provided, every decision (allow / deny / pending)
   * is appended to it. When omitted, enforcement still runs but nothing is
   * persisted.
   */
  readonly writer?: AuditWriter | undefined
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

    let decision
    try {
      decision = await enforceCall({
        policy: governance.policy,
        permission,
        risk,
        audit: {
          apiKeyId,
          argsSummary,
          timestamp: new Date(),
        },
        ...(governance.writer ? { writer: governance.writer } : {}),
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
