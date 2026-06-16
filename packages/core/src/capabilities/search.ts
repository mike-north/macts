/**
 * Deterministic lexical ranking for capability discovery.
 *
 * Given a free-text intent (e.g. "create a calendar event"), rank the
 * capabilities in a registry by how well they match. The ranker is a simple,
 * fully-deterministic, well-tested lexical scorer — no embeddings, no network,
 * no randomness — so the same intent always yields the same ordering.
 *
 * ## Ranking approach
 *
 * The intent is tokenized into lowercase terms. Each capability is scored by
 * summing, per intent term, a weight that depends on *where* the term matches:
 *
 * | Match location                                  | Weight |
 * | ----------------------------------------------- | ------ |
 * | Exact operation name (`create` === `create`)    | 10     |
 * | Exact resource name (`events` === `events`)     | 8      |
 * | Exact app name (`calendar` === `calendar`)      | 6      |
 * | Keyword token exact match                       | 4      |
 * | Keyword token prefix match (`even` → `events`)  | 2      |
 *
 * Each intent term contributes only its single best (highest-weight) match
 * location — a term that hits both the operation and a keyword is credited once,
 * at the operation weight, never double-counted. Per-term best scores are then
 * summed across distinct intent terms, so a query matching both the resource and
 * operation outranks one matching only the operation. Ties break deterministically
 * by capability name (ascending), and capabilities with zero score are excluded.
 *
 * This is intentionally explainable: a reviewer can hand-derive the expected
 * ordering for any intent from the table above, which is why the tests assert
 * spec-derived orderings rather than snapshots.
 *
 * @packageDocumentation
 */

import type { GovernanceFilter } from './governance.js'
import { ALLOW_ALL_GOVERNANCE } from './governance.js'
import type { Capability, CapabilityRegistry } from './types.js'

/** Per-location scoring weights. Exported for tests to derive expectations. */
export const SEARCH_WEIGHTS = {
  operationExact: 10,
  resourceExact: 8,
  appExact: 6,
  keywordExact: 4,
  keywordPrefix: 2,
} as const

/**
 * A scored search result.
 */
export interface CapabilitySearchResult {
  /** The matched capability. */
  readonly capability: Capability
  /** The total lexical score (higher is a better match). */
  readonly score: number
}

/** Minimum token length considered for matching. */
const MIN_TOKEN_LENGTH = 2

/**
 * Tokenize an intent string into lowercase terms.
 *
 * @param intent - Free-text intent
 * @returns De-duplicated lowercase tokens (length >= {@link MIN_TOKEN_LENGTH})
 */
export function tokenizeIntent(intent: string): string[] {
  const tokens = intent
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[^A-Za-z0-9]+/g, ' ')
    .toLowerCase()
    .split(/\s+/)
    .filter((token) => token.length >= MIN_TOKEN_LENGTH)
  return [...new Set(tokens)]
}

/**
 * Score a single capability against a set of intent terms.
 *
 * @param capability - Capability to score
 * @param terms - Tokenized intent terms
 * @returns Additive lexical score (0 if nothing matches)
 */
export function scoreCapability(capability: Capability, terms: readonly string[]): number {
  const operation = capability.operation.toLowerCase()
  const resource = capability.resource.toLowerCase()
  const app = capability.app.toLowerCase()
  const keywordSet = new Set(capability.keywords)

  let score = 0
  for (const term of terms) {
    // Each intent term contributes only its single best (highest-weight) match
    // location, never a sum across locations. This keeps scoring predictable
    // and hand-derivable: a term that hits both the operation and a keyword is
    // credited once, at the operation weight.
    score += bestTermScore(term, { operation, resource, app, keywordSet })
  }
  return score
}

/**
 * Compute the single best-weighted match score for one intent term against a
 * capability's fields. Locations are checked from highest to lowest weight and
 * the first hit wins.
 */
function bestTermScore(
  term: string,
  fields: {
    operation: string
    resource: string
    app: string
    keywordSet: ReadonlySet<string>
  }
): number {
  if (fields.operation === term) {
    return SEARCH_WEIGHTS.operationExact
  }
  if (fields.resource === term) {
    return SEARCH_WEIGHTS.resourceExact
  }
  if (fields.app === term) {
    return SEARCH_WEIGHTS.appExact
  }
  if (fields.keywordSet.has(term)) {
    return SEARCH_WEIGHTS.keywordExact
  }
  // Prefix match against keywords (e.g. "even" → "events").
  for (const keyword of fields.keywordSet) {
    if (keyword.length > term.length && keyword.startsWith(term)) {
      return SEARCH_WEIGHTS.keywordPrefix
    }
  }
  return 0
}

/**
 * Options for {@link searchCapabilities}.
 */
export interface SearchCapabilitiesOptions {
  /** Maximum number of results to return (default: 10). */
  readonly limit?: number
  /**
   * Active governance filter to apply **before** slicing to `limit`.
   *
   * When provided, `deny`-d capabilities are dropped from the ranked list
   * before the limit is applied, so lower-ranked allowed capabilities
   * backfill the result set up to `limit`. This ensures "give me the top N"
   * means "N *usable* results", not "N results then silently drop some".
   *
   * The returned array contains only `allow`/`warn` capabilities (up to
   * `limit`). Use {@link governedDiscoverySearch} (in `discovery.ts`) when
   * you also need to distinguish "nothing matched" from "all matches denied".
   */
  readonly filter?: GovernanceFilter
}

/**
 * Whether any capability in the registry matched the given intent (before
 * governance). Used by the discovery layer to distinguish a genuine "no match"
 * from "matches existed but were all denied by the active governance policy".
 *
 * @param registry - Capability registry (or any iterable of capabilities)
 * @param intent - Free-text intent
 * @returns `true` if at least one capability has a positive score for `intent`
 */
export function searchCapabilitiesHasAnyMatch(
  registry: CapabilityRegistry | readonly Capability[],
  intent: string
): boolean {
  const capabilities = Array.isArray(registry)
    ? (registry as readonly Capability[])
    : (registry as CapabilityRegistry).capabilities
  const terms = tokenizeIntent(intent)
  if (terms.length === 0) {
    return false
  }
  for (const capability of capabilities) {
    if (scoreCapability(capability, terms) > 0) {
      return true
    }
  }
  return false
}

/**
 * Rank capabilities in a registry by how well they match an intent.
 *
 * When `options.filter` is provided, governance is applied to the **full**
 * ranked list *before* the limit is applied. This ensures that denied
 * capabilities are replaced by lower-ranked allowed ones so the caller
 * receives up to `limit` usable results rather than up to `limit` results
 * that may include silently-dropped denied entries.
 *
 * @param registry - Capability registry (or any iterable of capabilities)
 * @param intent - Free-text intent
 * @param options - Search options
 * @returns Matching results in descending score order; ties broken by name.
 *   When `options.filter` is set, only `allow`/`warn` capabilities are
 *   returned (up to `limit`). Returns an empty array when nothing matches
 *   or when all matches are denied.
 */
export function searchCapabilities(
  registry: CapabilityRegistry | readonly Capability[],
  intent: string,
  options: SearchCapabilitiesOptions = {}
): CapabilitySearchResult[] {
  const capabilities = Array.isArray(registry)
    ? (registry as readonly Capability[])
    : (registry as CapabilityRegistry).capabilities
  const terms = tokenizeIntent(intent)
  if (terms.length === 0) {
    return []
  }

  const results: CapabilitySearchResult[] = []
  for (const capability of capabilities) {
    const score = scoreCapability(capability, terms)
    if (score > 0) {
      results.push({ capability, score })
    }
  }

  results.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score
    }
    return a.capability.name < b.capability.name
      ? -1
      : a.capability.name > b.capability.name
        ? 1
        : 0
  })

  const limit = options.limit ?? 10
  const filter = options.filter ?? ALLOW_ALL_GOVERNANCE

  // When a real governance filter is active (not the default allow-all
  // pass-through), apply governance to the FULL sorted list BEFORE slicing.
  // This lets lower-ranked allowed capabilities backfill up to `limit` so that
  // a caller asking for "N results" gets N *usable* results, not N results
  // that may be reduced by silent denial.
  if (options.filter !== undefined) {
    const governed: CapabilitySearchResult[] = []
    for (const result of results) {
      const decision = filter.evaluate(result.capability)
      if (decision.disposition !== 'deny') {
        governed.push(result)
        if (governed.length === limit) {
          break
        }
      }
    }
    return governed
  }

  return results.slice(0, limit)
}
