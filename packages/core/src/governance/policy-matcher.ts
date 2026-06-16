/**
 * Governance-policy wildcard matching helpers.
 *
 * A governance policy rule uses an `AppPattern` (`*` or a concrete app name)
 * and an `OperationPattern` (`*` or a concrete operation name). When resolving
 * what policy governs a specific `app:resource:operation` capability string,
 * we need a consistent wildcard semantic that agrees with the existing
 * permission-system matcher in `../permissions/matcher.ts`.
 *
 * ## Wildcard semantics (mirroring `permissions/matcher.ts`)
 *
 * The `permissions/matcher.ts` internal `matchesWildcard` function establishes
 * the canonical rules:
 *
 *   1. App must match **exactly** — no app-level wildcard in that model.
 *   2. `resource === '*'` in the permission grant matches any resource.
 *   3. `operation === '*'` in the permission grant matches any operation.
 *
 * The governance policy extends that with an **app-level wildcard**: a rule
 * whose `app` is `'*'` governs any app. This is additive and consistent — the
 * same "wildcard in the pattern position matches anything in the concrete
 * position" rule, applied one level up.
 *
 * ## Rule selection
 *
 * Rules are matched in declaration order; the first matching rule wins. This
 * mirrors how permission checks are performed in the permissions system (first
 * match in `grantedPermissions` wins). A separate precedence-compilation step
 * (e.g. most-specific rule wins) is out of scope at this foundation layer and
 * belongs to the enforcement sub-issues.
 *
 * @see `../permissions/matcher.ts` — `matchesWildcard` (internal) for the
 *   canonical wildcard logic this module aligns with.
 * @packageDocumentation
 */

import type { AppRule, GovernancePolicy } from './policy.js'

/**
 * Check whether a governance policy rule's `app` pattern matches a concrete
 * app name.
 *
 * Mirrors the permission-system rule: the wildcard `'*'` matches any value;
 * any other pattern must equal the concrete value exactly.
 *
 * @param ruleApp - The `app` field from an {@link AppRule} (a concrete name or `'*'`).
 * @param concreteApp - The app from the capability being evaluated.
 * @returns `true` if the rule's app pattern covers the concrete app.
 */
export function appPatternMatches(ruleApp: string, concreteApp: string): boolean {
  return ruleApp === '*' || ruleApp === concreteApp
}

/**
 * Check whether a governance policy operation pattern matches a concrete
 * operation name.
 *
 * Mirrors the permission-system rule: the wildcard `'*'` matches any value;
 * any other pattern must equal the concrete value exactly.
 *
 * @param ruleOperation - The `operation` field from an operation rule (a concrete name or `'*'`).
 * @param concreteOperation - The operation from the capability being evaluated.
 * @returns `true` if the rule's operation pattern covers the concrete operation.
 */
export function operationPatternMatches(ruleOperation: string, concreteOperation: string): boolean {
  return ruleOperation === '*' || ruleOperation === concreteOperation
}

/**
 * The result of resolving which governance rule governs a capability call.
 */
export interface PolicyRuleMatch {
  /**
   * The app rule whose `app` pattern matched the capability's app.
   * This is the rule that provides the governing disposition (either directly
   * via `disposition` or via an operation-level override in `operations`).
   */
  readonly appRule: AppRule
  /**
   * Index of the matched operation rule within `appRule.operations`, or `-1`
   * if no per-operation override matched and the app-level `disposition` applies.
   */
  readonly operationRuleIndex: number
}

/**
 * Find the first governance policy rule that governs a given capability call,
 * expressed as `app`, `resource`, and `operation` segments parsed from an
 * `app:resource:operation` string.
 *
 * Resolution order (first match wins, consistent with how `hasPermission` in
 * `../permissions/matcher.ts` iterates granted permissions):
 *
 * 1. Iterate `policy.apps` in declaration order.
 * 2. For each app rule whose `app` pattern matches (via {@link appPatternMatches}),
 *    check `operations` for a per-operation override that matches (via
 *    {@link operationPatternMatches}).
 * 3. The first matching operation override wins; if none match, the app rule's
 *    own `disposition` applies (returned with `operationRuleIndex: -1`).
 * 4. If no app rule matches at all, returns `undefined` and the caller should
 *    apply `policy.defaultDisposition`.
 *
 * Note: `resource` is accepted so this function can be called directly with a
 * parsed `app:resource:operation` triple, but the current policy model does not
 * have resource-level rules — only app-level and operation-level. The `resource`
 * parameter is accepted for forward compatibility and to make the call-site
 * signature self-documenting.
 *
 * @param policy - The validated governance policy.
 * @param app - The concrete app name from the capability (e.g. `'calendar'`).
 * @param _resource - The concrete resource name (reserved; not used in current schema).
 * @param operation - The concrete operation name (e.g. `'create'`).
 * @returns The first matching rule, or `undefined` if no rule covers this capability.
 */
export function findMatchingPolicyRule(
  policy: GovernancePolicy,
  app: string,
  _resource: string,
  operation: string
): PolicyRuleMatch | undefined {
  for (const appRule of policy.apps) {
    if (!appPatternMatches(appRule.app, app)) {
      continue
    }

    // Check for a per-operation override first (first match wins).
    const opIndex = appRule.operations.findIndex((opRule) =>
      operationPatternMatches(opRule.operation, operation)
    )

    return { appRule, operationRuleIndex: opIndex }
  }

  return undefined
}
