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
 * It deliberately does NOT implement policy compilation (declaration →
 * `app:resource:operation` permissions), approval-gate wiring, discovery
 * filtering, or any storage backend — those depend on an open governance-policy
 * design decision and land separately. The discovery-time governance *filter
 * seam* already lives in `../capabilities/governance.js`.
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
