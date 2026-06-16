/**
 * Compile a governance policy to the concrete `app:resource:operation`
 * permissions it grants.
 *
 * Issue #53 asks for the policy declaration to be projected onto the existing
 * permission model so the two integrate cleanly: a declared policy should yield
 * the exact set of fine-grained permissions an agent is allowed to invoke. This
 * module performs that projection.
 *
 * ## Why candidates are required
 *
 * A policy is written with wildcards and dispositions (`calendar:*` → read-only,
 * `*` → forbidden), not as an enumerated permission list. To turn it into a
 * *concrete* permission set you must intersect it with the universe of
 * capabilities that actually exist — otherwise "what does `read-only` grant?"
 * has no finite answer. {@link compilePolicyToPermissions} therefore takes the
 * candidate capabilities (each a permission string plus its {@link RiskClass})
 * and returns the subset the policy grants.
 *
 * ## Consistency with the evaluator
 *
 * Granting uses {@link evaluatePolicy} — the single source of truth — so the
 * compiled permission set can never disagree with call-time enforcement:
 *
 * - `allowed`       → granted.
 * - `read-only`     → granted **only** for read-class candidates (a read-only
 *                     rule grants the read operations and nothing else).
 * - `confirm-first` → NOT granted unconditionally (it is gated behind human
 *                     approval, so it is not a standing permission).
 * - `forbidden` / unmatched (default `forbidden`) → not granted.
 *
 * @packageDocumentation
 */

import type { GovernancePolicy } from './policy.js'
import { evaluatePolicy } from './evaluator.js'
import type { RiskClass } from '../capabilities/risk.js'

/**
 * A candidate capability to test against a policy when compiling.
 *
 * The `risk` is required so `read-only` rules can be resolved correctly (a
 * read-only rule grants read-class operations only).
 */
export interface PolicyCandidate {
  /** The capability in `app:resource:operation` form. */
  readonly permission: string
  /** The capability's pre-computed risk class. */
  readonly risk: RiskClass
}

/**
 * Compile a governance policy to the set of `app:resource:operation` permissions
 * it grants, drawn from a list of candidate capabilities.
 *
 * For each candidate, the policy is evaluated via {@link evaluatePolicy}; the
 * candidate's permission is included in the result **iff** the decision is
 * `'allowed'`. `'confirm-first'` candidates are intentionally excluded — they
 * are gated behind human approval rather than granted as a standing permission —
 * as are `'denied'` candidates.
 *
 * Because granting reuses the evaluator, this set is guaranteed consistent with
 * call-time enforcement: a permission present here will pass enforcement, and
 * one absent here (for a `denied` reason) will be rejected.
 *
 * The result preserves candidate order and de-duplicates repeated permission
 * strings (keeping the first occurrence).
 *
 * @param policy - The validated governance policy to compile.
 * @param candidates - The universe of candidate capabilities to test.
 * @returns The granted permissions, in candidate order, de-duplicated.
 */
export function compilePolicyToPermissions(
  policy: GovernancePolicy,
  candidates: readonly PolicyCandidate[]
): string[] {
  const granted: string[] = []
  const seen = new Set<string>()

  for (const candidate of candidates) {
    const { decision } = evaluatePolicy(policy, candidate.permission, candidate.risk)
    if (decision === 'allowed' && !seen.has(candidate.permission)) {
      seen.add(candidate.permission)
      granted.push(candidate.permission)
    }
  }

  return granted
}

/**
 * Test whether a policy grants a single concrete permission as a standing
 * (non-confirmation-gated) permission.
 *
 * A thin convenience over {@link compilePolicyToPermissions} for the common
 * "is this one permission in-policy?" question. Returns `true` only when the
 * evaluator's decision is `'allowed'`.
 *
 * @param policy - The validated governance policy.
 * @param candidate - The candidate capability to test.
 * @returns `true` if the policy grants the permission outright.
 */
export function policyGrantsPermission(
  policy: GovernancePolicy,
  candidate: PolicyCandidate
): boolean {
  return evaluatePolicy(policy, candidate.permission, candidate.risk).decision === 'allowed'
}
