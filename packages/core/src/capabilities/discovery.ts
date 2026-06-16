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
import { searchCapabilities, searchCapabilitiesHasAnyMatch } from './search.js'
import type { CapabilitySearchResult, SearchCapabilitiesOptions } from './search.js'
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
 * **Governance ordering:** For correct `--limit` behaviour, governance must be
 * applied *before* slicing. Use {@link governedDiscoverySearch} (the
 * all-in-one entry point) instead of calling `searchCapabilities` then this
 * function, unless you have already applied governance upstream.
 *
 * @param ranked - Ranked search results. For `no-match` / `governance-blocked`
 *   to be distinguishable these must represent all matches for the intent, not
 *   a pre-sliced subset (or the caller must guarantee they were pre-governed
 *   with `options.filter` in {@link searchCapabilities}).
 * @param filter - Active governance filter (defaults to allow-all). When
 *   {@link searchCapabilities} was called with `options.filter`, pass
 *   {@link ALLOW_ALL_GOVERNANCE} here (or omit it) to avoid double-applying.
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
 * Governance-first capability discovery: apply governance to the **full**
 * ranked match set, then slice to `limit`.
 *
 * This is the correct entry point for discovery surfaces (CLI, MCP). It
 * guarantees that "give me the top N results" means "N *allowed* results",
 * backfilling from lower-ranked capabilities when higher-ranked ones are
 * denied by the active policy.
 *
 * Prefer this over calling `searchCapabilities` and
 * `summarizeDiscoverySearch` separately when a real governance policy is
 * active. With the default allow-all filter the behaviour is identical to the
 * pre-fix call sequence.
 *
 * @param registry - Capability registry (or any iterable of capabilities)
 * @param intent - Free-text intent
 * @param limit - Maximum number of *allowed* results to return
 * @param filter - Active governance filter (defaults to allow-all)
 * @returns The discovery outcome
 */
export function governedDiscoverySearch(
  registry: CapabilityRegistry | readonly Capability[],
  intent: string,
  limit: number,
  filter: GovernanceFilter = ALLOW_ALL_GOVERNANCE
): DiscoverySearchOutcome {
  // Check whether any capability matches before governance is applied, so
  // we can distinguish "nothing matched" (no-match) from "matches existed
  // but all were denied" (governance-blocked).
  const hasAnyMatch = searchCapabilitiesHasAnyMatch(registry, intent)
  if (!hasAnyMatch) {
    return { kind: 'no-match' }
  }

  // Apply governance BEFORE slicing: fetch all matches, govern, then trim.
  const options: SearchCapabilitiesOptions = { limit, filter }
  const governed = searchCapabilities(registry, intent, options)

  if (governed.length === 0) {
    // At least one match existed (hasAnyMatch) but governance denied them all
    // before we could collect `limit` results. Count the full denied set by
    // fetching without governance to get the total match count.
    const allMatches = searchCapabilities(registry, intent, { limit: Number.MAX_SAFE_INTEGER })
    return { kind: 'governance-blocked', deniedCount: allMatches.length }
  }

  // governed contains only allow/warn results (up to limit), with scores.
  // Convert to GovernedCapability pairs by re-evaluating decisions.
  const governedCapabilities: GovernedCapability[] = governed.map((r) => ({
    capability: r.capability,
    decision: filter.evaluate(r.capability),
  }))

  return { kind: 'matches', governed: governedCapabilities }
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
