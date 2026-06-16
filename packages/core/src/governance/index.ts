/**
 * Governance foundation for macts (issue #7, Trust & Governance).
 *
 * This module provides the **decision-invariant** building blocks for the trust
 * boundary:
 *
 * 1. The governance policy *declaration* — a Zod schema, parser, and types for
 *    declaring apps/operations as allowed / read-only / confirm-first /
 *    forbidden, with path and URL restrictions and sensitivity tags
 *    ({@link ./policy.js}).
 * 2. Structured, attributable *audit records* for capability calls — a typed
 *    record plus a pure constructor and serializer ({@link ./audit.js}).
 *
 * On top of that foundation it adds the **decision** layer:
 *
 * 3. The policy *evaluator* ({@link ./evaluator.js}) — the single source of
 *    truth for "does this policy allow this capability?", returning a structured
 *    allow / deny / confirm-first decision with the matched rule and a reason.
 * 4. *Compile-to-permissions* ({@link ./compile.js}) — projects a policy onto
 *    the concrete `app:resource:operation` permissions it grants, consistent
 *    with the evaluator.
 * 5. Call-time *enforcement* ({@link ./enforcement.js}) — the audit-writing
 *    wrapper that checks each invocation and records every decision.
 *
 * Approval-gate wiring (issue #54) and discovery filtering (issue #55) consume
 * the evaluator rather than re-implementing the decision. The discovery-time
 * governance *filter seam* lives in `../capabilities/governance.js`.
 *
 * @packageDocumentation
 */

// Governance policy declaration: schema, parser, and types.
export {
  POLICY_DISPOSITIONS,
  type PolicyDisposition,
  PolicyDispositionSchema,
  SensitivityTagSchema,
  type SensitivityTag,
  OperationPatternSchema,
  type OperationPattern,
  OperationRuleSchema,
  type OperationRule,
  PatternRestrictionSchema,
  RestrictionsSchema,
  type Restrictions,
  AppPatternSchema,
  type AppPattern,
  AppRuleSchema,
  type AppRule,
  PolicySchema,
  type GovernancePolicy,
  type PolicyIssue,
  type ParsePolicyResult,
  parsePolicy,
} from './policy.js'

// Structured audit records: types, constructor, serializer.
export {
  AUDIT_DECISIONS,
  type AuditDecision,
  type AuditRecordInput,
  type AuditRecord,
  type SerializedAuditRecord,
  createAuditRecord,
  serializeAuditRecord,
} from './audit.js'

// Argument-redaction helper: sanitises raw call args for argsSummary.
export {
  REDACTED_PLACEHOLDER,
  DEFAULT_SENSITIVE_KEYS,
  isSensitiveKey,
  redactArgs,
  type RedactArgsOptions,
} from './redaction.js'

// Durable audit-record writer (JSON-lines / NDJSON).
export { createFileAuditWriter, type AuditWriter } from './writer.js'

// Governance-policy wildcard matching (foundation; no enforcement).
export {
  appPatternMatches,
  operationPatternMatches,
  findMatchingPolicyRule,
  type PolicyRuleMatch,
} from './policy-matcher.js'

// Policy evaluator — the single source of truth for allow/deny/confirm-first.
export {
  type PolicyDecision,
  type PolicyRuleSource,
  type MatchedPolicyRule,
  type PolicyEvaluation,
  evaluatePolicy,
} from './evaluator.js'

// Compile a policy to the concrete permissions it grants.
export {
  type PolicyCandidate,
  compilePolicyToPermissions,
  policyGrantsPermission,
} from './compile.js'

// Call-time policy enforcement (audit-writing wrapper around the evaluator).
export {
  type EnforcementOutcome,
  type EnforcementDecision,
  type CallAuditContext,
  type EnforceCallOptions,
  enforceCall,
} from './enforcement.js'

// Policy loader: reads and validates a policy declaration from a JSON file.
export { loadPolicyFromFile, type LoadPolicyResult } from './loader.js'
