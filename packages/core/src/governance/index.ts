/**
 * Governance foundation for macts (issue #7, Trust & Governance / AgentRC).
 *
 * This module provides the **decision-invariant** building blocks for the trust
 * boundary:
 *
 * 1. The `.agentrc` / org-policy *declaration* — a Zod schema, parser, and
 *    types for declaring apps/operations as allowed / read-only / confirm-first
 *    / forbidden, with path and URL restrictions and sensitivity tags
 *    ({@link ./agentrc.js}).
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

// `.agentrc` / org-policy declaration: schema, parser, and types.
export {
  AGENT_RC_DISPOSITIONS,
  type AgentRcDisposition,
  AgentRcDispositionSchema,
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
  AgentRcSchema,
  type AgentRc,
  type AgentRcIssue,
  type ParseAgentRcResult,
  parseAgentRc,
} from './agentrc.js'

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
