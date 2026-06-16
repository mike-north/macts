/**
 * Policy-backed governance filter for capability discovery.
 *
 * Bridges the governance *policy declaration* ({@link GovernancePolicy}) —
 * which speaks in `PolicyDisposition` terms (`allowed`, `read-only`,
 * `confirm-first`, `forbidden`) — and the discovery *governance filter seam*
 * ({@link GovernanceFilter}) — which speaks in `GovernanceDisposition` terms
 * (`allow`, `warn`, `deny`). The mapping is:
 *
 * | Policy disposition | Discovery disposition | Rationale |
 * | ------------------ | --------------------- | --------- |
 * | `allowed`          | `allow`               | Unrestricted — surface normally. |
 * | `read-only`        | `warn`                | Restricted use — surface with a flag. |
 * | `confirm-first`    | `warn`                | Needs approval — surface with a flag. |
 * | `forbidden`        | `deny`                | Hard deny — omit from results. |
 *
 * The `defaultDisposition` from the policy is used for capabilities that
 * match no rule. The policy is fail-closed: if `defaultDisposition` is
 * `forbidden` (the Zod default), unmatched capabilities are denied.
 *
 * @packageDocumentation
 */

import { findMatchingPolicyRule } from '../governance/policy-matcher.js'
import type { GovernancePolicy, PolicyDisposition } from '../governance/policy.js'
import type { GovernanceDecision, GovernanceFilter } from './governance.js'
import type { Capability } from './types.js'

/**
 * Map a {@link PolicyDisposition} to a {@link GovernanceDecision.disposition}
 * for discovery purposes.
 *
 * `warn` is used for both `read-only` and `confirm-first` because both mean
 * "surface the capability but flag it" — the distinction between the two
 * (enforcement at invocation time vs. UI prompt) is not relevant at discovery.
 *
 * @param disposition - The policy disposition to translate
 * @returns The equivalent discovery disposition
 */
function policyDispositionToGovernanceDisposition(
  disposition: PolicyDisposition
): GovernanceDecision['disposition'] {
  switch (disposition) {
    case 'allowed':
      return 'allow'
    case 'read-only':
      return 'warn'
    case 'confirm-first':
      return 'warn'
    case 'forbidden':
      return 'deny'
  }
}

/**
 * A governance filter backed by a parsed {@link GovernancePolicy}.
 *
 * Applies `findMatchingPolicyRule` to each capability's `app:resource:operation`
 * triple. When a rule matches, its effective disposition (the operation-level
 * override if present, otherwise the app-level default) is translated into a
 * {@link GovernanceDecision}. When no rule matches, the policy's
 * `defaultDisposition` is used (fail-closed: `forbidden` unless overridden).
 *
 * Create via {@link createPolicyGovernanceFilter}; do not construct directly.
 */
export class PolicyGovernanceFilter implements GovernanceFilter {
  readonly #policy: GovernancePolicy

  /** @internal Use {@link createPolicyGovernanceFilter} instead. */
  constructor(policy: GovernancePolicy) {
    this.#policy = policy
  }

  /**
   * Evaluate a capability against the active governance policy.
   *
   * Resolves the most specific matching rule for the capability's
   * `app:resource:operation` triple. Operation-level overrides take precedence
   * over the app-level disposition; when no rule matches at all,
   * `policy.defaultDisposition` applies.
   *
   * @param capability - The capability to evaluate
   * @returns The governance decision for this capability
   */
  evaluate(capability: Capability): GovernanceDecision {
    const { app, resource, operation } = capability

    const match = findMatchingPolicyRule(this.#policy, app, resource, operation)

    if (match === undefined) {
      // No rule matched — apply the policy-level default (fail-closed).
      const disposition = policyDispositionToGovernanceDisposition(this.#policy.defaultDisposition)
      return { disposition }
    }

    // Resolve the effective disposition: operation-level override wins if present.
    const { appRule, operationRuleIndex } = match

    if (operationRuleIndex >= 0) {
      const opRule = appRule.operations[operationRuleIndex]
      if (opRule === undefined) {
        // Defensive: operationRuleIndex should always be a valid index when >= 0.
        const disposition = policyDispositionToGovernanceDisposition(appRule.disposition)
        return {
          disposition,
          ...(appRule.reason !== undefined ? { reason: appRule.reason } : {}),
        }
      }
      const disposition = policyDispositionToGovernanceDisposition(opRule.disposition)
      return { disposition, ...(opRule.reason !== undefined ? { reason: opRule.reason } : {}) }
    }

    // App-level disposition applies.
    const disposition = policyDispositionToGovernanceDisposition(appRule.disposition)
    return { disposition, ...(appRule.reason !== undefined ? { reason: appRule.reason } : {}) }
  }
}

/**
 * Create a {@link GovernanceFilter} backed by a parsed {@link GovernancePolicy}.
 *
 * This is the primary integration point for wiring a real governance policy
 * into capability discovery (CLI `capabilities search`, MCP discovery tool).
 * Pass the result as the `filter` / `governance` option of
 * {@link governedDiscoverySearch} or {@link createDiscoveryTool}.
 *
 * When no policy is active, use {@link ALLOW_ALL_GOVERNANCE} instead (the
 * default when no filter is supplied to discovery functions).
 *
 * @param policy - A fully-parsed governance policy (from {@link parsePolicy}).
 * @returns A governance filter that applies the policy at discovery time.
 *
 * @example
 * ```typescript
 * import { parsePolicy } from '@macts/core'
 * import { createPolicyGovernanceFilter } from '@macts/core'
 *
 * const result = parsePolicy(rawPolicyDeclaration)
 * if (!result.success) {
 *   throw new Error('Invalid policy')
 * }
 * const filter = createPolicyGovernanceFilter(result.data)
 * const outcome = governedDiscoverySearch(registry, intent, limit, filter)
 * ```
 */
export function createPolicyGovernanceFilter(policy: GovernancePolicy): GovernanceFilter {
  return new PolicyGovernanceFilter(policy)
}
