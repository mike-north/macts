/**
 * Governance-policy *evaluator* — the single source of truth for "does this
 * policy allow this capability?".
 *
 * Given a parsed {@link GovernancePolicy} and a capability identified by its
 * `app:resource:operation` permission string (plus its pre-computed
 * {@link RiskClass}), {@link evaluatePolicy} returns a structured
 * {@link PolicyEvaluation}: a disposition, the rule that produced it, and a
 * human-readable reason naming the rule and the exact permission.
 *
 * ## Why this module exists separately
 *
 * Several governance surfaces need the *same* allow/deny decision:
 *
 * - **Call-time enforcement** (`@macts/api`) gates each capability invocation
 *   (issue #53). The audit-writing wrapper lives in {@link ./enforcement.js},
 *   which delegates the decision to this module.
 * - **Discovery filtering** (issue #55) hides out-of-policy capabilities from
 *   the catalog. It consumes {@link evaluatePolicy} directly.
 * - **Compile-to-permissions** ({@link ./compile.js}) projects a policy onto the
 *   concrete `app:resource:operation` permissions it grants, again using the
 *   same disposition logic.
 *
 * Keeping the decision in one pure, dependency-light module guarantees those
 * surfaces never drift apart. This module is deliberately decoupled from any
 * server/CLI specifics, audit I/O, or approval flow.
 *
 * ## Decision semantics
 *
 * 1. The first matching rule is found via {@link findMatchingPolicyRule}
 *    (declaration-order, first-match-wins; wildcard semantics mirror
 *    `../permissions/matcher.ts`).
 * 2. The matched rule's effective {@link PolicyDisposition} maps to a
 *    {@link PolicyDecision}:
 *    - `forbidden`     → `'denied'`.
 *    - `read-only`     → `'allowed'` for `read`-risk-class operations; any other
 *                        risk class → `'denied'`.
 *    - `confirm-first` → `'confirm-first'` (a pending-approval signal; this
 *                        module does NOT implement the approval flow).
 *    - `allowed`       → `'allowed'`.
 * 3. If no rule matches, `policy.defaultDisposition` applies — which defaults to
 *    `'forbidden'` (fail-closed): a capability no rule covers is denied unless
 *    the policy explicitly opens it.
 *
 * A malformed permission string (not exactly `app:resource:operation`) is
 * evaluated as `'denied'` — it is safer to block an unrecognised capability than
 * to let it through.
 *
 * This module is domain-agnostic: it operates on the permission string and the
 * capability's {@link RiskClass} (computed by the caller). No macOS-specific
 * assumptions.
 *
 * @packageDocumentation
 */

import type { AppRule, GovernancePolicy, OperationRule, PolicyDisposition } from './policy.js'
import { findMatchingPolicyRule } from './policy-matcher.js'
import type { RiskClass } from '../capabilities/risk.js'

/**
 * The terminal decision the evaluator reaches for a capability.
 *
 * - `'allowed'`       — the policy permits the call.
 * - `'denied'`        — the policy blocks the call.
 * - `'confirm-first'` — the policy permits the call only after a human confirms
 *                       it (disposition `confirm-first`). The approval flow
 *                       itself is out of scope here; this module only surfaces
 *                       the pending-approval signal.
 *
 * Note this is distinct from {@link PolicyDisposition} (the *declared*
 * disposition on a rule): `read-only` and `forbidden` dispositions both reduce
 * to a `'denied'` or `'allowed'` decision depending on the operation's risk.
 */
export type PolicyDecision = 'allowed' | 'denied' | 'confirm-first'

/**
 * The source of the disposition that governed an evaluation.
 *
 * - `'operation'` — a per-operation override inside a matched app rule.
 * - `'app'`       — the matched app rule's top-level disposition.
 * - `'default'`   — no rule matched; `policy.defaultDisposition` applied.
 */
export type PolicyRuleSource = 'operation' | 'app' | 'default'

/**
 * The rule (and its provenance) that produced an evaluation decision.
 *
 * When `source` is `'default'`, no app/operation rule matched and the policy's
 * `defaultDisposition` was used; `appRule` and `operationRule` are then
 * `undefined`. Otherwise `appRule` is always present and `operationRule` is
 * present only when an operation-level override matched (`source === 'operation'`).
 */
export interface MatchedPolicyRule {
  /** Where the governing disposition came from. */
  readonly source: PolicyRuleSource
  /** The declared disposition that governed this evaluation. */
  readonly disposition: PolicyDisposition
  /** The matched app rule, or `undefined` when `source` is `'default'`. */
  readonly appRule?: AppRule | undefined
  /**
   * The matched per-operation override, present only when an operation-level
   * rule matched (`source === 'operation'`).
   */
  readonly operationRule?: OperationRule | undefined
}

/**
 * The structured result of evaluating a governance policy against one capability.
 *
 * Carries the terminal {@link PolicyDecision}, the {@link MatchedPolicyRule} that
 * produced it, and a human-readable `reason` that names the rule and the exact
 * `app:resource:operation` so callers can surface it without re-deriving it.
 *
 * The `permission` is echoed back so consumers (discovery filtering, audit) have
 * the exact capability string the decision applies to.
 */
export interface PolicyEvaluation {
  /** The terminal decision for this capability. */
  readonly decision: PolicyDecision
  /** The exact `app:resource:operation` permission that was evaluated. */
  readonly permission: string
  /** The rule (and provenance) that produced {@link PolicyEvaluation.decision}. */
  readonly rule: MatchedPolicyRule
  /**
   * Human-readable explanation naming the governing rule and the exact
   * permission. Always present, including for `'allowed'`, so logs and audit
   * records have a consistent justification.
   */
  readonly reason: string
}

/**
 * Parse an `app:resource:operation` permission string into its three segments.
 *
 * Returns `undefined` when the string does not have exactly three non-empty
 * colon-separated parts, so the evaluator can fail closed on malformed input.
 */
function parsePermissionSegments(
  permission: string
): { app: string; resource: string; operation: string } | undefined {
  const parts = permission.split(':')
  if (parts.length !== 3) return undefined
  const [app, resource, operation] = parts
  if (!app || !resource || !operation) return undefined
  return { app, resource, operation }
}

/**
 * Render a stable, human-readable label for the rule that governed a decision.
 *
 * Examples:
 * - operation override: `operation rule "events:create" → forbidden`
 * - app rule:           `app rule "calendar" → read-only`
 * - wildcard app rule:  `app rule "*" → allowed`
 * - default:            `default disposition → forbidden`
 */
function describeRule(rule: MatchedPolicyRule): string {
  switch (rule.source) {
    case 'operation': {
      const op = rule.operationRule?.operation ?? '*'
      const app = rule.appRule?.app ?? '*'
      return `operation rule "${app}:${op}" → ${rule.disposition}`
    }
    case 'app': {
      const app = rule.appRule?.app ?? '*'
      return `app rule "${app}" → ${rule.disposition}`
    }
    case 'default':
      return `default disposition → ${rule.disposition}`
  }
}

/**
 * Build the human-readable `reason` for an evaluation, naming the governing rule
 * and the exact permission and phrasing it by decision.
 */
function buildReason(
  decision: PolicyDecision,
  rule: MatchedPolicyRule,
  permission: string
): string {
  const ruleLabel = describeRule(rule)
  switch (decision) {
    case 'allowed':
      return `Permission "${permission}" allowed by ${ruleLabel}.`
    case 'denied': {
      if (rule.disposition === 'read-only') {
        return (
          `Permission "${permission}" denied by ${ruleLabel}: ` +
          `a read-only rule permits only read-class operations, and this operation mutates state.`
        )
      }
      return `Permission "${permission}" denied by ${ruleLabel}.`
    }
    case 'confirm-first':
      return (
        `Permission "${permission}" requires human approval: ${ruleLabel} gates this ` +
        `operation pending confirmation.`
      )
  }
}

/**
 * Resolve the {@link MatchedPolicyRule} that governs a capability from a policy.
 *
 * Delegates matching to {@link findMatchingPolicyRule} (so wildcard semantics
 * and first-match-wins ordering are never re-implemented) and reports the
 * provenance of the winning disposition.
 */
function resolveMatchedRule(
  policy: GovernancePolicy,
  app: string,
  resource: string,
  operation: string
): MatchedPolicyRule {
  const match = findMatchingPolicyRule(policy, app, resource, operation)
  if (match === undefined) {
    return { source: 'default', disposition: policy.defaultDisposition }
  }

  const { appRule, operationRuleIndex } = match
  if (operationRuleIndex >= 0) {
    const operationRule = appRule.operations[operationRuleIndex]
    if (operationRule !== undefined) {
      return {
        source: 'operation',
        disposition: operationRule.disposition,
        appRule,
        operationRule,
      }
    }
  }
  return { source: 'app', disposition: appRule.disposition, appRule }
}

/**
 * Map a declared {@link PolicyDisposition} to a terminal {@link PolicyDecision},
 * applying `read-only` semantics via the operation's risk class.
 *
 * Under a `read-only` disposition only `read`-risk-class operations are
 * permitted; every other risk class is denied.
 */
function dispositionToDecision(disposition: PolicyDisposition, risk: RiskClass): PolicyDecision {
  switch (disposition) {
    case 'allowed':
      return 'allowed'
    case 'read-only':
      return risk === 'read' ? 'allowed' : 'denied'
    case 'confirm-first':
      return 'confirm-first'
    case 'forbidden':
      return 'denied'
  }
}

/**
 * Evaluate a governance policy against a single capability.
 *
 * This is the canonical "does this policy allow this capability?" decision —
 * the single source of truth consumed by call-time enforcement
 * ({@link ./enforcement.js}), discovery filtering (issue #55), and
 * compile-to-permissions ({@link ./compile.js}).
 *
 * Steps:
 *
 * 1. Parse `permission` into `app:resource:operation`. A malformed string is
 *    denied (fail-closed) with a `'default'`-sourced `forbidden` rule.
 * 2. Resolve the governing {@link MatchedPolicyRule} via
 *    {@link findMatchingPolicyRule}.
 * 3. Map its disposition to a {@link PolicyDecision} (applying `read-only`
 *    semantics with `risk`).
 * 4. Build a human-readable `reason` naming the rule and the exact permission.
 *
 * The function is pure and deterministic: given the same policy, permission, and
 * risk it always returns the same evaluation. It performs no I/O and has no
 * dependency on any server, CLI, or audit backend.
 *
 * @param policy - The validated governance policy to evaluate against.
 * @param permission - The capability in `app:resource:operation` form
 *   (e.g. `'calendar:events:create'`).
 * @param risk - The pre-computed {@link RiskClass} of the operation, required to
 *   apply `read-only` semantics. Use `classifyRiskFromOperation` /
 *   `classifyCommandRisk` from `../capabilities/risk.js` to derive it.
 * @returns The structured {@link PolicyEvaluation}.
 */
export function evaluatePolicy(
  policy: GovernancePolicy,
  permission: string,
  risk: RiskClass
): PolicyEvaluation {
  const segments = parsePermissionSegments(permission)

  if (segments === undefined) {
    const rule: MatchedPolicyRule = { source: 'default', disposition: 'forbidden' }
    return {
      decision: 'denied',
      permission,
      rule,
      reason: `Permission "${permission}" is not a valid app:resource:operation string; denied (fail-closed).`,
    }
  }

  const { app, resource, operation } = segments
  const rule = resolveMatchedRule(policy, app, resource, operation)
  const decision = dispositionToDecision(rule.disposition, risk)
  const reason = buildReason(decision, rule, permission)

  return { decision, permission, rule, reason }
}
