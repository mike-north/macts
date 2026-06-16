/**
 * Governance filter seam for capability discovery.
 *
 * Discovery results must be filterable by an active governance policy (the
 * governance workstream owns the policy itself). This module defines only the
 * integration point: a {@link GovernanceFilter} interface plus a default
 * no-op pass-through. The discovery layer (CLI, MCP, registry queries) applies
 * the active filter at the point capabilities are surfaced, so a policy can
 * hide or annotate capabilities without the discovery code knowing the policy
 * details.
 *
 * The seam is domain-agnostic: it operates on {@link Capability} descriptors
 * and carries no macOS-specific assumptions.
 *
 * @packageDocumentation
 */

import type { Capability } from './types.js'

/**
 * The disposition a governance policy assigns to a capability at discovery
 * time.
 *
 * - `allow`  — surface normally.
 * - `warn`   — surface, but flag it (e.g. requires explicit escalation).
 * - `deny`   — hide from discovery results entirely.
 */
export type GovernanceDisposition = 'allow' | 'warn' | 'deny'

/**
 * A governance decision for a single capability.
 */
export interface GovernanceDecision {
  /** Disposition to apply to the capability. */
  readonly disposition: GovernanceDisposition
  /**
   * Optional human-readable reason, surfaced to the user when a capability is
   * warned or denied (e.g. "send operations require approval under policy X").
   */
  readonly reason?: string
}

/**
 * A capability paired with its governance decision.
 */
export interface GovernedCapability {
  /** The capability. */
  readonly capability: Capability
  /** The decision the active policy made about it. */
  readonly decision: GovernanceDecision
}

/**
 * A capability paired with its governance decision **and** its lexical search
 * score. Returned by {@link governedDiscoverySearch} so callers (e.g. the
 * CLI's JSON output) can expose the score without a second search pass.
 *
 * Extends {@link GovernedCapability} — callers that only need `capability` and
 * `decision` remain unaffected.
 */
export interface GovernedCapabilityResult extends GovernedCapability {
  /** The total lexical score from {@link scoreCapability} (higher is better). */
  readonly score: number
}

/**
 * Governance filter interface.
 *
 * Implemented by the governance workstream to plug a real policy into
 * discovery. Implementations must be pure with respect to their input
 * (deciding the same way for the same capability + context) so discovery stays
 * deterministic.
 */
export interface GovernanceFilter {
  /**
   * Decide how a capability should be treated at discovery time.
   *
   * @param capability - The capability under consideration
   * @returns The governance decision
   */
  evaluate(capability: Capability): GovernanceDecision
}

/**
 * The default governance filter: a no-op pass-through that allows every
 * capability. Used when no policy is active, so discovery behaves identically
 * to having no governance layer at all.
 */
export const ALLOW_ALL_GOVERNANCE: GovernanceFilter = {
  evaluate(): GovernanceDecision {
    return { disposition: 'allow' }
  },
}

/**
 * Apply a governance filter to a list of capabilities.
 *
 * Capabilities the filter `deny`s are dropped; `allow` and `warn` capabilities
 * are kept, each paired with its decision so callers can annotate `warn`
 * results. Order is preserved.
 *
 * @param capabilities - Capabilities to filter (e.g. search results)
 * @param filter - Active governance filter (defaults to
 *   {@link ALLOW_ALL_GOVERNANCE})
 * @returns Surviving capabilities paired with their governance decisions
 */
export function applyGovernance(
  capabilities: readonly Capability[],
  filter: GovernanceFilter = ALLOW_ALL_GOVERNANCE
): GovernedCapability[] {
  const governed: GovernedCapability[] = []
  for (const capability of capabilities) {
    const decision = filter.evaluate(capability)
    if (decision.disposition === 'deny') {
      continue
    }
    governed.push({ capability, decision })
  }
  return governed
}
