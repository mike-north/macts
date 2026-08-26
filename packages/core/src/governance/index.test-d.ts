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
  seekApproval,
  createStaticApprovalProvider,
  parseApprovalConfig,
  resolveApprovalConfigPath,
  recordApprovalDecision,
  type ApprovalState,
  type ApprovalDeniedState,
  type ApprovalFailure,
  type ApprovalLayer,
  type ApprovalRequest,
  type ApprovalRequesterIdentity,
  type ApprovalDecision,
  type ApprovalPolicySuggestion,
  type ApprovalProvider,
  type ApprovalProviderCapabilities,
  type ApprovalOutcome,
  type ApprovalApprovedOutcome,
  type ApprovalDeniedOutcome,
  type ApprovalConfig,
  type ParseApprovalConfigResult,
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

// =============================================================================
// Approval SPI — closed state unions
// =============================================================================

expectAssignable<ApprovalState>('approved')
expectAssignable<ApprovalState>('rejected')
expectAssignable<ApprovalState>('timeout')
// The union is closed: a provider cannot introduce its own terminal state.
expectNotAssignable<ApprovalState>('escalated')
expectNotAssignable<ApprovalState>('pending')

// A denial can never be an approval.
expectAssignable<ApprovalDeniedState>('rejected')
expectAssignable<ApprovalDeniedState>('timeout')
expectNotAssignable<ApprovalDeniedState>('approved')

expectAssignable<ApprovalFailure>('provider-error')
expectAssignable<ApprovalFailure>('malformed-response')
expectNotAssignable<ApprovalFailure>('rejected')

// The routing layer is reserved but closed.
expectAssignable<ApprovalLayer>('host')
expectAssignable<ApprovalLayer>('key')
expectNotAssignable<ApprovalLayer>('org')

// =============================================================================
// ApprovalRequest — required fields
// =============================================================================

const approvalRequest: ApprovalRequest = {
  id: 'req-1',
  permission: 'calendar:events:create',
  risk: 'write',
  identity: { apiKeyId: 'key-1' },
  argsSummary: 'summary: Standup',
  rule: { source: 'app', disposition: 'confirm-first' },
  reason: 'requires confirmation',
  timeoutMs: 1_000,
  requestedAt: new Date('2026-06-14T10:42:12.000Z'),
  layer: 'host',
}

expectType<string>(approvalRequest.id)
expectType<MatchedPolicyRule>(approvalRequest.rule)
expectType<Date>(approvalRequest.requestedAt)
// The risk class is the shared classifier's union, not a free-form string.
expectNotAssignable<ApprovalRequest['risk']>('not-a-risk')

// A request missing any required field is not assignable.
expectNotAssignable<ApprovalRequest>({
  id: 'req-1',
  permission: 'calendar:events:create',
  risk: 'write',
  identity: { apiKeyId: 'key-1' },
  argsSummary: 's',
  rule: { source: 'app', disposition: 'confirm-first' },
  reason: 'r',
  timeoutMs: 1_000,
  requestedAt: new Date('2026-06-14T10:42:12.000Z'),
})

// The identity's key id is required; the display name is not.
expectAssignable<ApprovalRequesterIdentity>({ apiKeyId: 'key-1' })
expectNotAssignable<ApprovalRequesterIdentity>({ apiKeyName: 'assistant' })

// =============================================================================
// ApprovalDecision / ApprovalPolicySuggestion — shapes
// =============================================================================

expectAssignable<ApprovalDecision>({ state: 'approved' })
expectAssignable<ApprovalDecision>({ state: 'rejected', reason: 'no' })
expectAssignable<ApprovalDecision>({ state: 'approved', evidence: { signature: 'blob' } })
// A reason is prose, not structured data.
expectNotAssignable<ApprovalDecision>({ state: 'approved', reason: { text: 'ok' } })
expectNotAssignable<ApprovalDecision>({ state: 'escalated' })
expectNotAssignable<ApprovalDecision>({})

expectAssignable<ApprovalPolicySuggestion>({ permission: 'a:b:c', disposition: 'allowed' })
// The suggested disposition is a policy disposition, not an approval state.
expectNotAssignable<ApprovalPolicySuggestion>({ permission: 'a:b:c', disposition: 'approved' })

// =============================================================================
// ApprovalProvider — required members and capability flags
// =============================================================================

const provider: ApprovalProvider = {
  name: 'test',
  capabilities: { supportsPolicySuggestions: false, supportsDistinctRouting: false },
  requestApproval: () => Promise.resolve({ state: 'approved' }),
}
expectType<Promise<ApprovalDecision>>(
  provider.requestApproval(approvalRequest, { signal: new AbortController().signal })
)

// Both capability flags must be stated — a provider cannot inherit a default.
expectNotAssignable<ApprovalProviderCapabilities>({ supportsPolicySuggestions: true })
expectNotAssignable<ApprovalProviderCapabilities>({})
// A provider missing `requestApproval` is not a provider.
expectNotAssignable<ApprovalProvider>({
  name: 'test',
  capabilities: { supportsPolicySuggestions: false, supportsDistinctRouting: false },
})

// =============================================================================
// ApprovalOutcome — discriminated union
// =============================================================================

expectAssignable<ApprovalOutcome>({
  approved: true,
  state: 'approved',
  reason: 'r',
  auditReason: 'r',
})
expectAssignable<ApprovalOutcome>({
  approved: false,
  state: 'timeout',
  reason: 'r',
  auditReason: 'r',
})

// The invariant is encoded, not just documented: contradictory outcomes do not
// type-check, so a consumer-supplied value cannot be persisted as approved
// while carrying a denial.
expectNotAssignable<ApprovalOutcome>({
  approved: true,
  state: 'rejected',
  reason: 'r',
  auditReason: 'r',
})
expectNotAssignable<ApprovalOutcome>({
  approved: false,
  state: 'approved',
  reason: 'r',
  auditReason: 'r',
})
// An approval has no failure category.
expectNotAssignable<ApprovalApprovedOutcome>({
  approved: true,
  state: 'approved',
  reason: 'r',
  auditReason: 'r',
  failure: 'provider-error',
})
// Both explanations are mandatory: dropping the operator-only one would send
// the client-safe text to the audit trail.
expectNotAssignable<ApprovalOutcome>({ approved: true, state: 'approved', reason: 'r' })
expectAssignable<ApprovalDeniedOutcome>({
  approved: false,
  state: 'rejected',
  reason: 'r',
  auditReason: 'r',
  failure: 'provider-error',
})

// =============================================================================
// seekApproval / recordApprovalDecision — async signatures
// =============================================================================

expectType<Promise<ApprovalOutcome>>(seekApproval({ provider, request: approvalRequest }))

expectType<Promise<AuditDecision>>(
  recordApprovalDecision({
    permission: 'calendar:events:create',
    outcome: { approved: true, state: 'approved', reason: 'r', auditReason: 'r' },
    audit: {
      apiKeyId: 'k',
      argsSummary: 's',
      timestamp: new Date('2026-06-14T10:42:12.000Z'),
    },
    writer,
  })
)

// The writer is required: there is no "decide but do not record" mode.
expectNotAssignable<Parameters<typeof recordApprovalDecision>[0]>({
  permission: 'calendar:events:create',
  outcome: { approved: true, state: 'approved', reason: 'r', auditReason: 'r' },
  audit: {
    apiKeyId: 'k',
    argsSummary: 's',
    timestamp: new Date('2026-06-14T10:42:12.000Z'),
  },
})

expectType<ApprovalProvider>(createStaticApprovalProvider({ state: 'rejected' }))
// The reference provider still has to name a real terminal state.
expectNotAssignable<Parameters<typeof createStaticApprovalProvider>[0]>({ state: 'escalated' })

// =============================================================================
// Approval registration — discriminated parse result
// =============================================================================

const approvalConfigResult = parseApprovalConfig({ provider: '@example/macts-approval' })
expectType<ParseApprovalConfigResult>(approvalConfigResult)
if (approvalConfigResult.success) {
  expectType<ApprovalConfig>(approvalConfigResult.data)
  expectType<string>(approvalConfigResult.data.provider)
  expectType<number>(approvalConfigResult.data.timeoutMs)
} else {
  expectType<readonly { readonly path: string; readonly message: string }[]>(
    approvalConfigResult.issues
  )
}

expectType<string>(resolveApprovalConfigPath('/Users/alice/.macts'))
