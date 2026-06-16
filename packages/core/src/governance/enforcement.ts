/**
 * Policy enforcement engine.
 *
 * Compiles a parsed {@link GovernancePolicy} into an enforcement function and
 * checks every capability call against it, mapping the four policy dispositions
 * to concrete call-time outcomes:
 *
 * - `allowed`       → the call proceeds.
 * - `read-only`     → only `read`-risk-class operations are permitted; any
 *                     other risk class is treated as if the rule were `forbidden`.
 * - `confirm-first` → the call is surfaced as {@link EnforcementOutcome}
 *                     `'pending-approval'`; the caller (not this module) owns
 *                     the approval flow (issue #54).
 * - `forbidden`     → the call is denied.
 *
 * **Fail-closed**: if no policy rule covers a capability, the policy's
 * `defaultDisposition` applies. Because `defaultDisposition` defaults to
 * `'forbidden'`, unspecified capabilities are denied unless the policy
 * explicitly opens them.
 *
 * Every decision is written to the injected {@link AuditWriter} so the audit
 * trail is never optional. The writer is a plain interface — callers supply
 * whatever backend they need (file, in-memory, etc.).
 *
 * This module is domain-agnostic: it operates on the `app:resource:operation`
 * permission string and the capability's {@link RiskClass} (already computed by
 * the caller). No macOS-specific assumptions.
 *
 * @packageDocumentation
 */

import type { GovernancePolicy, PolicyDisposition } from './policy.js'
import type { AuditWriter } from './writer.js'
import { createAuditRecord } from './audit.js'
import { findMatchingPolicyRule } from './policy-matcher.js'
import type { RiskClass } from '../capabilities/risk.js'

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * The call-time outcome of enforcing a governance policy against a single
 * capability invocation.
 *
 * - `'allowed'`          — the policy permits the call; it may proceed.
 * - `'denied'`           — the policy blocks the call; it must not proceed.
 * - `'pending-approval'` — the policy requires human confirmation before the
 *                          call runs (disposition `confirm-first`). The
 *                          approval flow itself is issue #54; this module only
 *                          surfaces the signal.
 */
export type EnforcementOutcome = 'allowed' | 'denied' | 'pending-approval'

/**
 * The result of enforcing a governance policy against a single capability call.
 *
 * Every decision carries an `outcome` and, for non-`allowed` outcomes, a
 * human-readable `reason` that names the violated rule and the exact
 * `app:resource:operation` that was denied or gated.
 */
export interface EnforcementDecision {
  /** The outcome of the policy check for this call. */
  readonly outcome: EnforcementOutcome
  /**
   * Human-readable explanation of the outcome.
   *
   * - `'allowed'`: omitted — a permitted call needs no explanation.
   * - `'denied'` or `'pending-approval'`: always present; names the violated
   *   rule and the exact permission so callers can surface it to users or
   *   logs without re-parsing.
   */
  readonly reason?: string
  /**
   * The effective policy disposition that produced this outcome.
   *
   * Included for diagnostics and testing without requiring callers to
   * re-resolve the rule.
   */
  readonly disposition: PolicyDisposition
}

/**
 * Context about the capability invocation that feeds the audit record.
 *
 * The audit record captures *who* called *what* *when* and *why* — the three
 * fields here supply the parts that `enforceCall` cannot determine by itself.
 */
export interface CallAuditContext {
  /**
   * Identifier of the API key that authorized the call, for attribution.
   * Example: `'assistant-calendar-writer'`.
   */
  readonly apiKeyId: string
  /**
   * Pre-redacted, human-readable summary of the call arguments.
   *
   * Callers must sanitise the arguments before passing them here (see
   * `redactArgs` in `../governance/redaction.ts`). This module never sees
   * raw argument values.
   */
  readonly argsSummary: string
  /**
   * When the call occurred. Injected by the caller so audit records are
   * deterministic and testable without relying on `Date.now()`.
   */
  readonly timestamp: Date
}

/**
 * Options for a single {@link enforceCall} invocation.
 */
export interface EnforceCallOptions {
  /**
   * The validated governance policy to enforce.
   */
  readonly policy: GovernancePolicy
  /**
   * The capability being invoked, in `app:resource:operation` form
   * (e.g. `'calendar:events:create'`). This string is the single source of
   * truth: `app`, `resource`, and `operation` are parsed from it so the
   * caller does not have to supply them separately.
   */
  readonly permission: string
  /**
   * Pre-computed risk class of the operation.
   *
   * Required to enforce `read-only` semantics: only `'read'`-risk-class
   * operations are permitted under a `read-only` rule. All other risk classes
   * are treated as if the rule were `'forbidden'`.
   */
  readonly risk: RiskClass
  /**
   * Audit context for this call (see {@link CallAuditContext}).
   */
  readonly audit: CallAuditContext
  /**
   * Optional audit writer. When supplied, every enforcement decision is
   * appended to it immediately. When omitted, decisions are returned but not
   * persisted — useful for testing without I/O.
   */
  readonly writer?: AuditWriter | undefined
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Parse an `app:resource:operation` permission string into its three segments.
 * Returns `undefined` if the string does not have exactly three non-empty
 * colon-separated parts so the enforcement logic can fail cleanly.
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
 * Resolve the effective {@link PolicyDisposition} for a concrete capability
 * call from a validated policy.
 *
 * Uses {@link findMatchingPolicyRule} to locate the first matching rule:
 * - If a per-operation override exists (`operationRuleIndex >= 0`), its
 *   `disposition` wins.
 * - Otherwise the matched app rule's top-level `disposition` applies.
 * - If no rule matches at all, `policy.defaultDisposition` is returned
 *   (which defaults to `'forbidden'` — fail-closed).
 *
 * @param policy - The validated governance policy.
 * @param app - The concrete app name from the capability.
 * @param resource - The concrete resource name (passed for forward compatibility).
 * @param operation - The concrete operation name.
 * @returns The effective disposition that governs this call.
 */
export function resolveDisposition(
  policy: GovernancePolicy,
  app: string,
  resource: string,
  operation: string
): PolicyDisposition {
  const match = findMatchingPolicyRule(policy, app, resource, operation)
  if (match === undefined) {
    return policy.defaultDisposition
  }
  const { appRule, operationRuleIndex } = match
  if (operationRuleIndex >= 0) {
    const opRule = appRule.operations[operationRuleIndex]
    if (opRule !== undefined) {
      return opRule.disposition
    }
  }
  return appRule.disposition
}

/**
 * Map a {@link PolicyDisposition} to an {@link EnforcementOutcome}, applying
 * `read-only` semantics.
 *
 * Under a `read-only` disposition only `'read'`-risk-class operations are
 * permitted; any other risk class is denied (treated as `'forbidden'`). The
 * caller must supply the operation's pre-computed {@link RiskClass}.
 *
 * @param disposition - The effective policy disposition.
 * @param risk - The capability's risk class.
 * @returns The enforcement outcome.
 */
function dispositionToOutcome(disposition: PolicyDisposition, risk: RiskClass): EnforcementOutcome {
  switch (disposition) {
    case 'allowed':
      return 'allowed'
    case 'read-only':
      return risk === 'read' ? 'allowed' : 'denied'
    case 'confirm-first':
      return 'pending-approval'
    case 'forbidden':
      return 'denied'
  }
}

/**
 * Build a human-readable denial or gate reason that names the violated rule
 * and the exact permission. The reason is included in the {@link EnforcementDecision}
 * and the audit record so callers never have to re-derive it.
 *
 * @param outcome - The outcome (determines phrasing).
 * @param disposition - The effective disposition.
 * @param permission - The exact `app:resource:operation` string.
 * @returns A human-readable reason string, or `undefined` when the outcome is `'allowed'`.
 */
function buildReason(
  outcome: EnforcementOutcome,
  disposition: PolicyDisposition,
  permission: string
): string | undefined {
  switch (outcome) {
    case 'allowed':
      return undefined
    case 'denied': {
      if (disposition === 'read-only') {
        return (
          `Permission "${permission}" denied: policy rule "read-only" does not permit ` +
          `non-read operations on this resource. Only read-class operations are allowed.`
        )
      }
      return `Permission "${permission}" denied: policy rule "${disposition}" blocks this call.`
    }
    case 'pending-approval':
      return (
        `Permission "${permission}" requires human approval: policy rule "confirm-first" ` +
        `gates this operation pending confirmation.`
      )
  }
}

// ---------------------------------------------------------------------------
// Main enforcement entry point
// ---------------------------------------------------------------------------

/**
 * Enforce the active governance policy against a single capability call.
 *
 * This is the primary entry point for call-time enforcement. It:
 *
 * 1. Parses `options.permission` into `app:resource:operation` segments.
 * 2. Resolves the effective {@link PolicyDisposition} via {@link resolveDisposition}.
 * 3. Maps the disposition to an {@link EnforcementOutcome} (applying
 *    `read-only` semantics using `options.risk`).
 * 4. Builds a human-readable `reason` string for non-`allowed` outcomes.
 * 5. Writes an audit record to `options.writer` (if supplied).
 *
 * A malformed `permission` string (not `app:resource:operation`) is treated as
 * `'denied'` — it is safer to block an unrecognised capability than to let it
 * through.
 *
 * **Note on `confirm-first`**: this module surfaces a `'pending-approval'`
 * outcome; it does not implement the approval flow. Callers must gate the
 * actual invocation on human approval. The approval flow and its wiring are
 * issue #54.
 *
 * @param options - Enforcement options (policy, permission, risk, audit context,
 *   optional writer).
 * @returns A promise resolving to the {@link EnforcementDecision} for this call.
 */
export async function enforceCall(options: EnforceCallOptions): Promise<EnforcementDecision> {
  const { policy, permission, risk, audit, writer } = options

  const segments = parsePermissionSegments(permission)

  let outcome: EnforcementOutcome
  let disposition: PolicyDisposition
  let reason: string | undefined

  if (segments === undefined) {
    // Malformed permission string — fail-closed.
    outcome = 'denied'
    disposition = 'forbidden'
    reason = `Permission "${permission}" is not a valid app:resource:operation string; call denied.`
  } else {
    const { app, resource, operation } = segments
    disposition = resolveDisposition(policy, app, resource, operation)
    outcome = dispositionToOutcome(disposition, risk)
    reason = buildReason(outcome, disposition, permission)
  }

  // Write the audit record unconditionally (whether allowed or denied).
  if (writer !== undefined) {
    const auditDecision =
      outcome === 'allowed' ? 'allowed' : outcome === 'denied' ? 'denied' : 'approved'
    const record = createAuditRecord({
      capability: permission,
      app: segments?.app ?? permission,
      argsSummary: audit.argsSummary,
      apiKeyId: audit.apiKeyId,
      decision: auditDecision,
      timestamp: audit.timestamp,
      ...(reason !== undefined ? { reason } : {}),
    })
    await writer.append(record)
  }

  const decision: EnforcementDecision = {
    outcome,
    disposition,
    ...(reason !== undefined ? { reason } : {}),
  }

  return decision
}
