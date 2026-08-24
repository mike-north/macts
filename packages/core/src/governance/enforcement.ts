/**
 * Call-time policy enforcement — the audit-writing wrapper around the evaluator.
 *
 * {@link enforceCall} checks a single capability invocation against the active
 * {@link GovernancePolicy} and writes one audit record per decision. The
 * allow/deny/confirm-first *decision* itself is delegated wholesale to
 * {@link evaluatePolicy} (see {@link ./evaluator.js}) — the single source of
 * truth — so enforcement, discovery filtering (issue #55), and
 * compile-to-permissions ({@link ./compile.js}) can never diverge.
 *
 * The decision-to-outcome mapping is therefore trivial:
 *
 * - evaluator `'allowed'`       → outcome `'allowed'` (the call proceeds).
 * - evaluator `'denied'`        → outcome `'denied'` (the call is blocked).
 * - evaluator `'confirm-first'` → outcome `'pending-approval'` (the caller owns
 *                                 the approval flow; it asks a human through the
 *                                 approval seam in {@link ./approval.js} and
 *                                 records the answer with
 *                                 {@link recordApprovalDecision}).
 *
 * **Fail-closed** behavior (default `forbidden`, malformed-permission denial,
 * `read-only` semantics) all live in the evaluator; enforcement inherits them.
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

import type { GovernancePolicy } from './policy.js'
import type { AuditWriter } from './writer.js'
import type { PolicyEvaluation } from './evaluator.js'
import type { ApprovalOutcome } from './approval.js'
import { createAuditRecord, type AuditDecision } from './audit.js'
import { evaluatePolicy } from './evaluator.js'
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
 *                          call runs (evaluator decision `'confirm-first'`). The
 *                          approval flow itself lives behind the approval seam
 *                          ({@link ./approval.js}); this module only surfaces
 *                          the signal.
 */
export type EnforcementOutcome = 'allowed' | 'denied' | 'pending-approval'

/**
 * The result of enforcing a governance policy against a single capability call.
 *
 * Every decision carries an `outcome`, a `reason` (naming the violated/governing
 * rule and the exact `app:resource:operation`), and the full underlying
 * {@link PolicyEvaluation} for callers that need the matched rule or raw
 * disposition without re-evaluating.
 */
export interface EnforcementDecision {
  /** The outcome of the policy check for this call. */
  readonly outcome: EnforcementOutcome
  /**
   * Human-readable explanation of the outcome, naming the governing rule and the
   * exact permission. Always present (including for `'allowed'`), mirroring the
   * evaluator's `reason`.
   */
  readonly reason: string
  /**
   * The underlying policy evaluation that produced this outcome (decision,
   * matched rule, permission, reason). Surfaced for diagnostics so callers do
   * not have to re-evaluate.
   */
  readonly evaluation: PolicyEvaluation
}

/**
 * Context about the capability invocation that feeds the audit record.
 *
 * Supplies the parts {@link enforceCall} cannot determine itself: who called,
 * a redacted argument summary, and when.
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
   * `redactArgs` in `./redaction.js`). This module never sees raw argument
   * values.
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
  /** The validated governance policy to enforce. */
  readonly policy: GovernancePolicy
  /**
   * The capability being invoked, in `app:resource:operation` form
   * (e.g. `'calendar:events:create'`). This string is the single source of
   * truth for `app`, `resource`, and `operation`.
   */
  readonly permission: string
  /**
   * Pre-computed risk class of the operation, required to enforce `read-only`
   * semantics (only `'read'`-risk-class operations are permitted under a
   * `read-only` rule).
   */
  readonly risk: RiskClass
  /** Audit context for this call (see {@link CallAuditContext}). */
  readonly audit: CallAuditContext
  /**
   * Optional audit writer. When supplied, every enforcement decision is appended
   * to it immediately. When omitted, the decision is returned but not persisted —
   * useful for testing without I/O.
   */
  readonly writer?: AuditWriter | undefined
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Map an evaluator {@link PolicyEvaluation} decision to an
 * {@link EnforcementOutcome}.
 */
function evaluationToOutcome(evaluation: PolicyEvaluation): EnforcementOutcome {
  switch (evaluation.decision) {
    case 'allowed':
      return 'allowed'
    case 'denied':
      return 'denied'
    case 'confirm-first':
      return 'pending-approval'
  }
}

/**
 * Map an {@link EnforcementOutcome} to the {@link AuditDecision} recorded in the
 * audit log.
 *
 * A `'pending-approval'` outcome records as the dedicated {@link AuditDecision}
 * `'pending'` — NOT `'denied'`. A confirm-first call is not a policy denial; it
 * is a deferral awaiting human approval. Recording it as `'denied'` would
 * misattribute the audit trail (a reader could not tell a hard policy block from
 * a withheld confirm-first call). It is likewise not `'approved'`, since no human
 * has approved it yet.
 */
function outcomeToAuditDecision(outcome: EnforcementOutcome): AuditDecision {
  switch (outcome) {
    case 'allowed':
      return 'allowed'
    case 'denied':
      return 'denied'
    case 'pending-approval':
      return 'pending'
  }
}

/**
 * Derive the non-empty `app` segment for an audit record from a permission
 * string.
 *
 * The `app` is the first `:`-delimited segment of `app:resource:operation`. For
 * malformed permissions the segment may be empty (e.g. `':a:b'` or `''`); an
 * empty `app` would make the audit record ambiguous, so we fall back to the full
 * permission string when it is non-empty, and to a clearly-marked
 * `'<unknown>'` sentinel when even that is empty. This keeps the audit `app`
 * field always meaningful and never silently blank.
 */
function deriveAuditApp(permission: string): string {
  const first = permission.split(':')[0]
  if (first !== undefined && first.length > 0) {
    return first
  }
  // First segment empty (e.g. ':a:b' or ''). Prefer the full permission if it
  // carries any signal; otherwise mark the app explicitly unknown.
  return permission.length > 0 ? permission : '<unknown>'
}

// ---------------------------------------------------------------------------
// Main enforcement entry point
// ---------------------------------------------------------------------------

/**
 * Enforce the active governance policy against a single capability call.
 *
 * This is the primary entry point for call-time enforcement. It:
 *
 * 1. Evaluates the policy via {@link evaluatePolicy} (the single source of
 *    truth — all decision semantics, including fail-closed defaults, malformed
 *    permission denial, and `read-only` handling, live there).
 * 2. Maps the evaluation decision to an {@link EnforcementOutcome}.
 * 3. Writes an audit record to `options.writer` (when supplied), unconditionally,
 *    for allow, deny, and pending-approval alike.
 *
 * **Note on `confirm-first`**: this function surfaces a `'pending-approval'`
 * outcome; it does not ask anyone. Callers must gate the actual invocation on a
 * human decision obtained through the approval seam (`seekApproval`), then
 * record the answer with {@link recordApprovalDecision}.
 *
 * @param options - Enforcement options (policy, permission, risk, audit context,
 *   optional writer).
 * @returns A promise resolving to the {@link EnforcementDecision} for this call.
 */
export async function enforceCall(options: EnforceCallOptions): Promise<EnforcementDecision> {
  const { policy, permission, risk, audit, writer } = options

  const evaluation = evaluatePolicy(policy, permission, risk)
  const outcome = evaluationToOutcome(evaluation)

  // Write the audit record unconditionally (whether allowed, denied, or pending).
  if (writer !== undefined) {
    const app = deriveAuditApp(permission)
    const record = createAuditRecord({
      capability: permission,
      app,
      argsSummary: audit.argsSummary,
      apiKeyId: audit.apiKeyId,
      decision: outcomeToAuditDecision(outcome),
      timestamp: audit.timestamp,
      reason: evaluation.reason,
    })
    await writer.append(record)
  }

  return { outcome, reason: evaluation.reason, evaluation }
}

// ---------------------------------------------------------------------------
// Approval outcome auditing
// ---------------------------------------------------------------------------

/**
 * Options for {@link recordApprovalDecision}.
 */
export interface RecordApprovalDecisionOptions {
  /**
   * The capability the human decided on, in `app:resource:operation` form. Must
   * be the same permission that was held as `'pending'`, so the two records
   * pair up in the trail.
   */
  readonly permission: string
  /** The normalized outcome returned by the approval gate. */
  readonly outcome: ApprovalOutcome
  /** Audit context for this call (see {@link CallAuditContext}). */
  readonly audit: CallAuditContext
  /**
   * Optional audit writer. When omitted the mapped decision is still returned
   * but nothing is persisted.
   */
  readonly writer?: AuditWriter | undefined
}

/**
 * Record the human decision that resolved a previously-held `confirm-first`
 * call.
 *
 * A held call produces **two** audit records, not one: {@link enforceCall}
 * writes `'pending'` when the call is withheld, and this writes `'approved'` or
 * `'rejected'` when a human (or the fail-closed gate) resolves it. Keeping both
 * preserves the sequence — a reader can see how long a call waited and how it
 * ended, which a single collapsed record would lose.
 *
 * The mapping is deliberately binary: anything other than an explicit approval
 * — an explicit rejection, a timeout, a provider failure — records as
 * `'rejected'`, because the call did not run and a human did not permit it. The
 * finer distinction (a human declined vs. nobody answered) is preserved in the
 * record's human-readable `reason`, which carries the gate's explanation.
 *
 * @param options - Permission, approval outcome, audit context, optional writer.
 * @returns The {@link AuditDecision} that was recorded.
 */
export async function recordApprovalDecision(
  options: RecordApprovalDecisionOptions
): Promise<AuditDecision> {
  const { permission, outcome, audit, writer } = options
  const decision: AuditDecision = outcome.approved ? 'approved' : 'rejected'

  if (writer !== undefined) {
    const record = createAuditRecord({
      capability: permission,
      app: deriveAuditApp(permission),
      argsSummary: audit.argsSummary,
      apiKeyId: audit.apiKeyId,
      decision,
      timestamp: audit.timestamp,
      reason: outcome.reason,
    })
    await writer.append(record)
  }

  return decision
}
