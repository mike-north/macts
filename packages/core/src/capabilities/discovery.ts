/**
 * Shared decision logic for the capability-discovery surfaces (CLI + MCP).
 *
 * The CLI (`macts capabilities search` / `inspect`) and the MCP discovery tool
 * present results differently, but the *decisions* they make are identical and
 * must stay consistent:
 *
 * - validating a user-supplied result limit,
 * - distinguishing a genuine "no capability matched" from "matches existed but
 *   were all denied by the active governance policy" (the two are NOT the same
 *   and only the former should suggest generating a new capability), and
 * - applying governance to an inspect-by-name lookup so a `deny`d capability is
 *   never leaked through inspection while it is hidden from search.
 *
 * Keeping these as pure, surface-agnostic functions lets both surfaces share
 * one implementation and lets the logic be unit-tested directly (including the
 * governance-blocked and denied-inspect paths) without driving a CLI or MCP
 * transport.
 *
 * @packageDocumentation
 */

import { applyGovernance, ALLOW_ALL_GOVERNANCE } from './governance.js'
import type { GovernanceDecision, GovernanceFilter, GovernedCapability } from './governance.js'
import type { CapabilitySearchResult } from './search.js'
import type { Capability, CapabilityRegistry } from './types.js'

/**
 * Validate a user-supplied result limit, falling back to a default when the
 * input is not a positive integer.
 *
 * The discovery surfaces accept a `--limit` flag / `limit` argument that flows
 * into `Array.prototype.slice`. A `NaN` (e.g. `--limit foo`), zero, negative, or
 * fractional value would silently produce wrong results (`slice(0, NaN)` yields
 * an empty list), so anything that is not a positive integer is rejected in
 * favor of the default.
 *
 * @param raw - The raw limit value: a string (CLI flag), number (MCP arg), or
 *   `undefined`/other (absent or wrong type)
 * @param defaultLimit - The limit to use when `raw` is absent or invalid
 * @returns A positive integer limit, or `defaultLimit` when `raw` is invalid
 */
export function resolveDiscoveryLimit(raw: unknown, defaultLimit: number): number {
  // For string inputs, require an exact base-10 integer representation before
  // parsing. `Number.parseInt('2.5', 10)` silently yields 2, which would let a
  // fractional CLI value like `--limit 2.5` appear valid. `/^\d+$/` on the
  // trimmed string rejects `2.5`, `1e3`, and `foo` before parseInt ever runs.
  const value =
    typeof raw === 'string'
      ? /^\d+$/.test(raw.trim())
        ? Number.parseInt(raw, 10)
        : Number.NaN
      : typeof raw === 'number'
        ? raw
        : Number.NaN
  if (Number.isInteger(value) && value > 0) {
    return value
  }
  return defaultLimit
}

/**
 * The outcome of a governance-aware discovery search.
 *
 * A discriminated union so callers can render the three distinct cases
 * correctly — critically, only `no-match` should suggest generating a new
 * capability; `governance-blocked` means matches existed but policy hid them.
 */
export type DiscoverySearchOutcome =
  | {
      /** At least one capability matched and survived governance. */
      readonly kind: 'matches'
      /** Surviving capabilities paired with their governance decisions. */
      readonly governed: readonly GovernedCapability[]
    }
  | {
      /** No capability matched the intent at all. */
      readonly kind: 'no-match'
    }
  | {
      /**
       * Capabilities matched the intent, but the active governance policy
       * denied every one of them. This is NOT a no-match: a different/elevated
       * policy could surface them, so generating a new capability is the wrong
       * suggestion.
       */
      readonly kind: 'governance-blocked'
      /** How many matched capabilities were denied by governance. */
      readonly deniedCount: number
    }

/**
 * Classify ranked search results against a governance filter into one of the
 * three {@link DiscoverySearchOutcome} cases.
 *
 * @param ranked - Ranked search results (already limited)
 * @param filter - Active governance filter (defaults to allow-all)
 * @returns The discovery outcome
 */
export function summarizeDiscoverySearch(
  ranked: readonly CapabilitySearchResult[],
  filter: GovernanceFilter = ALLOW_ALL_GOVERNANCE
): DiscoverySearchOutcome {
  if (ranked.length === 0) {
    return { kind: 'no-match' }
  }
  const governed = applyGovernance(
    ranked.map((r) => r.capability),
    filter
  )
  if (governed.length === 0) {
    // Matches existed (ranked.length > 0) but governance denied all of them.
    return { kind: 'governance-blocked', deniedCount: ranked.length }
  }
  return { kind: 'matches', governed }
}

/**
 * The outcome of a governance-aware inspect-by-name lookup.
 */
export type InspectOutcome =
  | {
      /** The capability exists and is allowed (or only warned) by governance. */
      readonly kind: 'found'
      /** The capability. */
      readonly capability: Capability
      /** The governance decision (`allow` or `warn`). */
      readonly decision: GovernanceDecision
    }
  | {
      /** No capability with that exact name is registered. */
      readonly kind: 'not-found'
    }
  | {
      /**
       * The capability exists but the active governance policy denies it. The
       * full descriptor is withheld so inspection cannot bypass the same
       * `deny` that hides it from search results.
       */
      readonly kind: 'denied'
      /** Optional human-readable reason from the governance policy. */
      readonly reason: string | undefined
    }

/**
 * Inspect a single capability by exact name, applying the active governance
 * filter — the same seam search uses — so a `deny`d capability is never leaked
 * through inspection.
 *
 * @param registry - Capability registry to look up in
 * @param name - Exact stable capability name
 * @param filter - Active governance filter (defaults to allow-all)
 * @returns The inspect outcome
 */
export function inspectCapability(
  registry: CapabilityRegistry,
  name: string,
  filter: GovernanceFilter = ALLOW_ALL_GOVERNANCE
): InspectOutcome {
  const capability = registry.get(name)
  if (!capability) {
    return { kind: 'not-found' }
  }
  const decision = filter.evaluate(capability)
  if (decision.disposition === 'deny') {
    return { kind: 'denied', reason: decision.reason }
  }
  return { kind: 'found', capability, decision }
}
