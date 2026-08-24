/**
 * Type-level tests for the governance foundation public types.
 *
 * These complement the runtime tests in `*.test.ts`, verifying that the
 * discriminated `ParsePolicyResult` narrows correctly, that the disposition /
 * decision unions are closed, and that the audit constructor/serializer carry
 * the intended signatures.
 *
 * NOTE: This file follows the repo convention (see `permissions/index.test-d.ts`)
 * of using only assertions that are themselves valid TypeScript — `expectType`,
 * `expectAssignable`, `expectNotAssignable` — because `src/**` is also compiled
 * by `tsc --noEmit`. Invalid-usage cases are expressed with `expectNotAssignable`
 * rather than `expectError` so they do not surface as real compiler errors.
 */

import { expectType, expectAssignable, expectNotAssignable } from 'tsd'
import {
  parsePolicy,
  createAuditRecord,
  serializeAuditRecord,
  redactArgs,
  isSensitiveKey,
  createFileAuditWriter,
  appPatternMatches,
  operationPatternMatches,
  findMatchingPolicyRule,
  evaluatePolicy,
  evaluateLayeredPolicy,
  composePolicyEvaluations,
  composeRestrictions,
  composedRestrictionsPermit,
  comparePolicyDecisionStrictness,
  strictestPolicyDecision,
  compareDispositionStrictness,
  enforceCall,
  compilePolicyToPermissions,
  policyGrantsPermission,
  REDACTED_PLACEHOLDER,
  DEFAULT_SENSITIVE_KEYS,
  type GovernancePolicy,
  type PolicyDisposition,
  type ParsePolicyResult,
  type PolicyIssue,
  type AuditDecision,
  type AuditRecord,
  type AuditRecordInput,
  type SerializedAuditRecord,
  type RedactArgsOptions,
  type AuditWriter,
  type PolicyRuleMatch,
  type PolicyDecision,
  type PolicyRuleSource,
  type PolicyEvaluation,
  type MatchedPolicyRule,
  type EnforcementOutcome,
  type EnforcementDecision,
  type PolicyLayer,
  type LayeredPolicyEvaluation,
  type ComposedRestrictions,
  type PolicyCandidate,
} from './index.js'

// =============================================================================
// PolicyDisposition — closed union
// =============================================================================

expectAssignable<PolicyDisposition>('allowed')
expectAssignable<PolicyDisposition>('read-only')
expectAssignable<PolicyDisposition>('confirm-first')
expectAssignable<PolicyDisposition>('forbidden')
expectNotAssignable<PolicyDisposition>('maybe')
expectNotAssignable<PolicyDisposition>('')

// =============================================================================
// ParsePolicyResult — discriminated union narrowing
// =============================================================================

const result: ParsePolicyResult = parsePolicy({})
expectType<ParsePolicyResult>(result)

if (result.success) {
  // success branch exposes `data: GovernancePolicy`.
  expectType<GovernancePolicy>(result.data)
} else {
  // failure branch exposes `issues: readonly PolicyIssue[]`.
  expectType<readonly PolicyIssue[]>(result.issues)
}

// PolicyIssue shape
declare const issue: PolicyIssue
expectType<string>(issue.path)
expectType<string>(issue.message)

// The `success` discriminant is a boolean literal union.
declare const r: ParsePolicyResult
expectType<boolean>(r.success)

// =============================================================================
// AuditDecision — closed union
// =============================================================================

expectAssignable<AuditDecision>('allowed')
expectAssignable<AuditDecision>('denied')
expectAssignable<AuditDecision>('pending')
expectAssignable<AuditDecision>('approved')
expectAssignable<AuditDecision>('rejected')
expectNotAssignable<AuditDecision>('maybe')

// =============================================================================
// createAuditRecord / serializeAuditRecord — signatures
// =============================================================================

const validInput: AuditRecordInput = {
  capability: 'calendar:events:create',
  app: 'calendar',
  argsSummary: 'Summary: x',
  apiKeyId: 'key-1',
  decision: 'allowed',
  timestamp: new Date('2026-06-14T10:42:12.000Z'),
}

const record = createAuditRecord(validInput)
expectType<AuditRecord>(record)
expectType<SerializedAuditRecord>(serializeAuditRecord(record))

// timestamp is a Date on the record, an ISO string when serialized.
expectType<Date>(record.timestamp)
expectType<string>(serializeAuditRecord(record).timestamp)

// reason is an optional string — `null` is not assignable to it.
expectNotAssignable<AuditRecord['reason']>(null)

// A record input missing the required `capability` is not assignable.
expectNotAssignable<AuditRecordInput>({
  app: 'calendar',
  argsSummary: 'Summary: x',
  apiKeyId: 'key-1',
  decision: 'allowed',
  timestamp: new Date('2026-06-14T10:42:12.000Z'),
})

// A record input with an unknown decision is not assignable.
expectNotAssignable<AuditRecordInput>({
  capability: 'calendar:events:create',
  app: 'calendar',
  argsSummary: 'Summary: x',
  apiKeyId: 'key-1',
  decision: 'maybe',
  timestamp: new Date('2026-06-14T10:42:12.000Z'),
})

// =============================================================================
// redactArgs — signature
// =============================================================================

// redactArgs returns a string.
expectType<string>(redactArgs({ key: 'value' }))
expectType<string>(redactArgs({}, { extraSensitiveKeys: ['mykey'] }))

// isSensitiveKey returns a boolean.
expectType<boolean>(isSensitiveKey('password'))
expectType<boolean>(isSensitiveKey('token', ['pincode']))

// REDACTED_PLACEHOLDER is a string constant (a string literal type, so it is
// assignable to `string` rather than invariantly equal to it).
expectAssignable<string>(REDACTED_PLACEHOLDER)

// DEFAULT_SENSITIVE_KEYS is a readonly string array.
expectAssignable<readonly string[]>(DEFAULT_SENSITIVE_KEYS)

// RedactArgsOptions has extraSensitiveKeys as optional readonly string[].
declare const opts: RedactArgsOptions
expectAssignable<readonly string[] | undefined>(opts.extraSensitiveKeys)

// =============================================================================
// AuditWriter — signature
// =============================================================================

// createFileAuditWriter returns an AuditWriter.
declare const writer: AuditWriter
// append(record) returns Promise<void>
declare const sampleRecord: AuditRecord
expectType<Promise<void>>(writer.append(sampleRecord))

const fileWriter = createFileAuditWriter('/tmp/audit.jsonl')
expectAssignable<AuditWriter>(fileWriter)

// =============================================================================
// Policy matcher — signatures
// =============================================================================

// appPatternMatches and operationPatternMatches return boolean.
expectType<boolean>(appPatternMatches('*', 'calendar'))
expectType<boolean>(operationPatternMatches('create', 'create'))

// findMatchingPolicyRule returns PolicyRuleMatch | undefined.
declare const policy: GovernancePolicy
expectAssignable<PolicyRuleMatch | undefined>(
  findMatchingPolicyRule(policy, 'calendar', 'events', 'create')
)

// PolicyRuleMatch shape.
declare const matchResult: PolicyRuleMatch
expectType<number>(matchResult.operationRuleIndex)

// =============================================================================
// PolicyDecision / PolicyRuleSource — closed unions
// =============================================================================

expectAssignable<PolicyDecision>('allowed')
expectAssignable<PolicyDecision>('denied')
expectAssignable<PolicyDecision>('confirm-first')
expectNotAssignable<PolicyDecision>('pending-approval')
expectNotAssignable<PolicyDecision>('')

expectAssignable<PolicyRuleSource>('operation')
expectAssignable<PolicyRuleSource>('app')
expectAssignable<PolicyRuleSource>('default')
expectNotAssignable<PolicyRuleSource>('wildcard')

// =============================================================================
// evaluatePolicy — signature & PolicyEvaluation shape
// =============================================================================

declare const evaluated: PolicyEvaluation
expectType<PolicyEvaluation>(evaluatePolicy(policy, 'calendar:events:create', 'write'))
expectType<PolicyDecision>(evaluated.decision)
expectType<string>(evaluated.permission)
expectType<string>(evaluated.reason)
expectType<MatchedPolicyRule>(evaluated.rule)
expectType<PolicyRuleSource>(evaluated.rule.source)
expectType<PolicyDisposition>(evaluated.rule.disposition)

// risk must be a RiskClass — an arbitrary string is not assignable.
expectNotAssignable<Parameters<typeof evaluatePolicy>[2]>('not-a-risk')

// =============================================================================
// enforceCall — outcome union & async signature
// =============================================================================

expectAssignable<EnforcementOutcome>('allowed')
expectAssignable<EnforcementOutcome>('denied')
expectAssignable<EnforcementOutcome>('pending-approval')
expectNotAssignable<EnforcementOutcome>('confirm-first')

expectType<Promise<EnforcementDecision>>(
  enforceCall({
    policy,
    permission: 'calendar:events:create',
    risk: 'write',
    audit: {
      apiKeyId: 'k',
      argsSummary: 's',
      timestamp: new Date('2026-06-14T10:42:12.000Z'),
    },
  })
)

declare const enforcement: EnforcementDecision
expectType<EnforcementOutcome>(enforcement.outcome)
expectType<string>(enforcement.reason)
// The enforcement decision carries the layered evaluation, which is itself a
// PolicyEvaluation — so existing consumers keep working and gain layer provenance.
expectType<LayeredPolicyEvaluation>(enforcement.evaluation)
expectAssignable<PolicyEvaluation>(enforcement.evaluation)

// =============================================================================
// Layered composition — host policy x per-key policy
// =============================================================================

expectAssignable<PolicyLayer>('host')
expectAssignable<PolicyLayer>('key')
expectNotAssignable<PolicyLayer>('device')

declare const layered: LayeredPolicyEvaluation
expectType<PolicyLayer>(layered.layer)
expectType<PolicyEvaluation>(layered.host)
expectType<PolicyEvaluation | undefined>(layered.key)
expectType<ComposedRestrictions>(layered.restrictions)
// A layered evaluation is usable anywhere a plain evaluation is expected.
expectAssignable<PolicyEvaluation>(layered)

expectType<LayeredPolicyEvaluation>(
  evaluateLayeredPolicy({
    hostPolicy: policy,
    keyPolicy: policy,
    permission: 'calendar:events:create',
    risk: 'write',
  })
)
// The key policy is optional: host-only evaluation is a valid call.
expectType<LayeredPolicyEvaluation>(
  evaluateLayeredPolicy({ hostPolicy: policy, permission: 'calendar:events:create', risk: 'write' })
)
expectType<LayeredPolicyEvaluation>(composePolicyEvaluations(evaluated, undefined))

expectType<number>(comparePolicyDecisionStrictness('allowed', 'denied'))
expectType<PolicyDecision>(strictestPolicyDecision('allowed', 'denied'))
expectType<number>(compareDispositionStrictness('allowed', 'forbidden'))
// The decision comparator takes decisions, not declared dispositions.
expectNotAssignable<Parameters<typeof comparePolicyDecisionStrictness>[0]>('read-only')

declare const composedRestrictions: ComposedRestrictions
expectType<readonly string[]>(composedRestrictions.pathsDeny)
expectType<readonly (readonly string[])[]>(composedRestrictions.pathsAllowGroups)
expectType<ComposedRestrictions>(composeRestrictions(undefined, undefined))
expectType<boolean>(
  composedRestrictionsPermit(composedRestrictions, 'path', '/tmp/x', (pattern, candidate) =>
    candidate.startsWith(pattern)
  )
)
expectNotAssignable<Parameters<typeof composedRestrictionsPermit>[1]>('domain')

// =============================================================================
// compilePolicyToPermissions / policyGrantsPermission — signatures
// =============================================================================

const candidate: PolicyCandidate = { permission: 'calendar:events:list', risk: 'read' }
expectType<string[]>(compilePolicyToPermissions(policy, [candidate]))
expectType<boolean>(policyGrantsPermission(policy, candidate))

// PolicyCandidate requires a RiskClass — an arbitrary string risk is not assignable.
expectNotAssignable<PolicyCandidate>({ permission: 'a:b:c', risk: 'not-a-risk' })
