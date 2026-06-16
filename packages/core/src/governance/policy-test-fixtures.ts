/**
 * Shared governance-policy fixtures and helpers for tests.
 *
 * Extracted so the evaluator, compile, and enforcement test suites build the
 * same canonical policies without duplicating the verbose `GovernancePolicy`
 * literal (which carries fully-defaulted `restrictions`/`tags`/`operations`).
 *
 * This file is test-only (it is excluded from the public API surface) but lives
 * under `src/` so it type-checks against the real schema types.
 *
 * @packageDocumentation
 */

import type { AppRule, GovernancePolicy, OperationRule, PolicyDisposition } from './policy.js'

/** Fixed timestamp — never `new Date()` in test data. */
export const FIXED_TIMESTAMP = new Date('2025-01-15T12:00:00.000Z')

/** Build an empty, fully-defaulted restriction block (paths/urls allow/deny). */
function emptyRestrictions(): {
  pathsAllow: string[]
  pathsDeny: string[]
  urlsAllow: string[]
  urlsDeny: string[]
} {
  return { pathsAllow: [], pathsDeny: [], urlsAllow: [], urlsDeny: [] }
}

/**
 * Build a fully-defaulted {@link AppRule} from a partial spec, filling in the
 * empty `operations`, `restrictions`, and `tags` the schema would default.
 */
export function makeAppRule(spec: {
  app: string
  disposition: PolicyDisposition
  operations?: OperationRule[]
}): AppRule {
  return {
    app: spec.app,
    disposition: spec.disposition,
    operations: spec.operations ?? [],
    restrictions: emptyRestrictions(),
    tags: [],
  }
}

/**
 * Build a fully-defaulted {@link OperationRule}.
 */
export function makeOperationRule(
  operation: string,
  disposition: PolicyDisposition
): OperationRule {
  return { operation, disposition, tags: [] }
}

/**
 * Build a fully-defaulted {@link GovernancePolicy} from app rules and an optional
 * default disposition (which itself defaults to the fail-closed `forbidden`).
 */
export function makePolicy(
  apps: AppRule[],
  defaultDisposition: PolicyDisposition = 'forbidden'
): GovernancePolicy {
  return { version: '1', defaultDisposition, apps, tags: [] }
}
