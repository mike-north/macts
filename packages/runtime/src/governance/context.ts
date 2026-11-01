/**
 * The governance context an invocation is enforced against, and its
 * per-caller resolution.
 *
 * A governance context bundles everything call-time enforcement needs: the
 * machine-wide (host) policy, an optional audit sink, an optional
 * human-in-the-loop approval gate, and an optional resolver for the policy
 * attached to an individual API key. Every surface that enforces governance
 * (the HTTP adapter, the local SDK, MCP) builds one of these and resolves it
 * per caller through {@link resolveGovernanceForRequest}, so "which policy
 * applies to this caller" has exactly one answer.
 *
 * ## No unaudited approvals
 *
 * {@link GovernanceContext} is a union whose approvals arm *requires* an audit
 * writer. A context that seeks human approval but has nowhere to record the
 * decision does not type-check, so a `confirm-first` operation can never be
 * released without a durable, attributable trace.
 *
 * ## Key policies only tighten
 *
 * The host policy is bound once. A key policy depends on who authenticated, so
 * it is resolved per caller from the key id and composed with the host policy by
 * `enforceCall` in `@macts/core`: the effective decision is the stricter of the
 * two. A key with no policy of its own is governed by the host policy alone.
 *
 * @packageDocumentation
 */

import type { ApprovalProvider, AuditWriter, GovernancePolicy } from '@macts/core'
import type { KeyPolicyResolver } from './key-policy.js'

/**
 * The configured human-in-the-loop approval gate.
 *
 * Supplying one turns a `confirm-first` hold from "withhold the call and report
 * it as pending" into "ask a human now, within a bounded wait".
 */
export interface ApprovalGateContext {
  /** The provider asked to obtain a human decision. */
  readonly provider: ApprovalProvider
  /**
   * Bound, in milliseconds, on how long a call waits for a human. Past it the
   * call is denied (fail-closed).
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
   * applies depends on who authenticated, so it is resolved per caller from the
   * key id (see {@link resolveGovernanceForRequest}). When omitted, or when the
   * key has no policy of its own, the host policy alone governs.
   *
   * A key policy can only ever tighten the host policy, so this never widens
   * what a deployment allows — including which calls reach an approval gate.
   */
  readonly keyPolicies?: KeyPolicyResolver | undefined
}

/**
 * Governance state for a deployment with **no** approval channel configured.
 *
 * `confirm-first` calls are withheld and reported as pending. The audit writer
 * is optional here: enforcement still runs without one, it just persists
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
 * Shared governance state for a surface: the active policy to enforce, an audit
 * writer to record decisions, and — optionally — an approval gate.
 *
 * When `policy` permits everything (allow-all) and `writer` is omitted,
 * enforcement is a near-no-op.
 */
export type GovernanceContext = GovernanceContextWithoutApprovals | GovernanceContextWithApprovals

/**
 * A {@link GovernanceContext} with the authenticated key's policy resolved for
 * one caller.
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
 * Resolve the governance context for a single call from the authenticated API
 * key.
 *
 * This is the per-caller half of governance resolution. It is a named, shared
 * seam because "which policy applies to this caller" must be answered the same
 * way by every surface that enforces governance.
 *
 * The whole context is carried through, not just the policy, so an approval gate
 * configured on the surface reaches the call untouched.
 *
 * A resolver failure propagates to the caller, which must fail the call closed:
 * an unreadable key policy is *not* the same as no key policy, and treating it
 * as such would silently widen the boundary back to the host policy.
 *
 * @param governance - The surface-bound governance context (host policy, writer,
 *   optional approval gate, optional key-policy resolver).
 * @param apiKeyId - The authenticated key's id (`ApiKeyPayload.sub`).
 * @returns The context with `keyPolicy` resolved for this caller.
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
