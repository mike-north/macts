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
  type GovernancePolicy,
  type PolicyDisposition,
  type ParsePolicyResult,
  type PolicyIssue,
  type AuditDecision,
  type AuditRecord,
  type AuditRecordInput,
  type SerializedAuditRecord,
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
expectAssignable<AuditDecision>('approved')
expectAssignable<AuditDecision>('rejected')
expectNotAssignable<AuditDecision>('pending')

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
  decision: 'pending',
  timestamp: new Date('2026-06-14T10:42:12.000Z'),
})
