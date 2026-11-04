/**
 * Structured, attributable audit records for capability calls.
 *
 * Issue #7 (and VISION.md §5.4) requires that **every capability call is
 * audit-logged and attributable**: a typed capability call is far easier to log
 * and explain than a stream of clicks. A record captures *what* capability ran,
 * *which app* it targeted, *which API key* authorized it, *when* it happened,
 * and the *decision* that was reached.
 *
 * Records come in three kinds, discriminated by `decision`:
 *
 * - a {@link GovernedAuditRecord} for a call that passed input validation and
 *   reached governance. It carries a redacted *summary* of the call's
 *   arguments, and may carry a reason and an approval correlation id.
 * - an {@link InvalidInputAuditRecord} for a call rejected by input
 *   validation. It carries only the *number* of validation issues: never an
 *   argument value, an argument summary, or an issue message, because input
 *   that failed its contract has not been shown to be what any summary
 *   describes.
 * - a {@link PermissionDeniedAuditRecord} for a call refused because its
 *   caller lacks the operation's permission. It carries only the attribution
 *   and the time: the call's input was never judged, so the record says
 *   nothing about it, and two denied calls that differ only in their input
 *   produce records that differ only in their timestamps.
 *
 * This module is the decision-invariant core: a typed {@link AuditRecord} plus a
 * pure constructor and a deterministic serializer. It deliberately wires NO
 * storage backend — where records are persisted (file, SIEM export, etc.) is an
 * open design decision and lives elsewhere. Because construction is pure and the
 * timestamp is injected (never read from the wall clock here), records are fully
 * deterministic and testable.
 *
 * The record is **domain-agnostic**: it references the enforcement model's
 * `app:resource:operation` capability string and opaque identifiers only — no
 * macOS-specific concepts.
 *
 * @packageDocumentation
 */

/**
 * The outcome reached for a capability call.
 *
 * - `allowed`  — the call was permitted and executed.
 * - `denied`   — the call was blocked by policy (out-of-bounds capability).
 * - `pending`  — the call requires human confirmation (`confirm-first`) and is
 *                withheld awaiting approval. It has neither been approved nor
 *                rejected yet, and it did NOT execute.
 * - `approved` — the call required confirmation and a human approved it.
 * - `rejected` — the call required confirmation and a human declined it.
 * - `cancelled` — the call required confirmation and its caller abandoned it
 *                 before any decision. Nobody approved or rejected it, and it
 *                 did NOT execute.
 * - `invalid-input` — the call's input failed validation against the
 *                 operation's contract, so it never reached governance, no
 *                 human was asked about it, and it did NOT execute.
 * - `permission-denied` — the caller's authority does not hold the
 *                 operation's permission, so its input was never judged, it
 *                 never reached governance, and it did NOT execute.
 *
 * Distinguishing `denied` (policy) from `rejected` (human) keeps the audit
 * trail precise about *why* a call did not run. Likewise, `pending` is kept
 * distinct from `denied`: a confirm-first call is not a policy denial — it is a
 * deferral awaiting approval — so recording it as `denied` would misattribute
 * the reason the call did not proceed. `invalid-input` is distinct from all of
 * them: no policy or human judged the call, because it was malformed. And
 * `permission-denied` is distinct from `denied`: the call was refused by the
 * caller's credential, which governance policy never consulted.
 */
export const AUDIT_DECISIONS = [
  'allowed',
  'denied',
  'pending',
  'approved',
  'rejected',
  'cancelled',
  'invalid-input',
  'permission-denied',
] as const

/**
 * A single audit decision value.
 */
export type AuditDecision = (typeof AUDIT_DECISIONS)[number]

/**
 * A decision reached by governance (policy, or a human through the approval
 * gate) for a call whose input passed validation: every decision except
 * `invalid-input` and `permission-denied`, which are reached before
 * governance. Records of these decisions carry an argument summary.
 */
export type GovernedAuditDecision = Exclude<AuditDecision, 'invalid-input' | 'permission-denied'>

/**
 * The attribution every audit record carries, whatever its kind: what was
 * called, on which app, by which key, and when.
 */
export interface AuditRecordBase {
  /**
   * The capability that was invoked, in the enforcement model's
   * `app:resource:operation` form (e.g. `calendar:events:create`).
   */
  readonly capability: string
  /**
   * The app the capability targeted (the `app` segment, surfaced explicitly so
   * consumers need not re-parse the capability string).
   */
  readonly app: string
  /**
   * Identifier of the API key that authorized the call (e.g.
   * `assistant-calendar-writer`). This is what makes a record *attributable*.
   */
  readonly apiKeyId: string
}

/**
 * The inputs needed to construct a {@link GovernedAuditRecord}.
 *
 * The timestamp is supplied by the caller (injected, never read from
 * `Date.now()` inside this module) so records are deterministic and testable.
 */
export interface GovernedAuditRecordInput extends AuditRecordBase {
  /**
   * A redacted, human-readable summary of the call arguments — NOT the raw
   * arguments, which may contain sensitive data. Example: "Calendar: Work;
   * Summary: Team Meeting; Attendees: 3".
   */
  readonly argsSummary: string
  /** The governance decision reached for this call. */
  readonly decision: GovernedAuditDecision
  /**
   * When the call occurred. Injected by the caller so records are
   * deterministic; never read from the wall clock inside this module.
   */
  readonly timestamp: Date
  /**
   * Optional human-readable reason, surfaced for `denied` / `rejected`
   * decisions (issue #7: "blocked with a human-readable reason").
   */
  readonly reason?: string
  /**
   * Optional correlation id tying the records of one held call together.
   *
   * A `confirm-first` call produces two records — `pending` when it is withheld,
   * then `approved`/`rejected` when a human resolves it. Both carry the same
   * `approvalId`, so overlapping calls with identical capability, requester, and
   * argument summary can still be paired (and their wait time computed).
   * Absent on records for calls that never raised an approval request.
   */
  readonly approvalId?: string
  /** Only an `invalid-input` record counts validation issues. */
  readonly issueCount?: never
}

/**
 * The inputs needed to construct an {@link InvalidInputAuditRecord}: the
 * attribution, the time, and how many validation issues the input had.
 *
 * It has no field for argument values, an argument summary, issue messages, a
 * reason, or an approval correlation id, and declares each of those as
 * `never` so that no value can be supplied for them.
 */
export interface InvalidInputAuditRecordInput extends AuditRecordBase {
  /** Marks the record as a call rejected by input validation. */
  readonly decision: 'invalid-input'
  /**
   * When the call occurred. Injected by the caller so records are
   * deterministic; never read from the wall clock inside this module.
   */
  readonly timestamp: Date
  /**
   * How many validation issues the input had: a non-negative integer. The
   * issues themselves are never recorded, because their messages and paths
   * can repeat what the caller sent.
   */
  readonly issueCount: number
  /** Input that failed validation is never summarized. */
  readonly argsSummary?: never
  /** The issue messages are not recorded, so there is no reason to give. */
  readonly reason?: never
  /** Invalid input never raises an approval request. */
  readonly approvalId?: never
}

/**
 * The inputs needed to construct a {@link PermissionDeniedAuditRecord}: the
 * attribution and the time, and nothing else.
 *
 * It declares every other record field as `never`, so that no argument
 * summary, reason, approval correlation id, or issue count can be supplied.
 */
export interface PermissionDeniedAuditRecordInput extends AuditRecordBase {
  /** Marks the record as a call refused by the permission check. */
  readonly decision: 'permission-denied'
  /**
   * When the call occurred. Injected by the caller so records are
   * deterministic; never read from the wall clock inside this module.
   */
  readonly timestamp: Date
  /** The input of a denied call is never judged, so it is never summarized. */
  readonly argsSummary?: never
  /** The record's decision is its whole account of why the call did not run. */
  readonly reason?: never
  /** A denied call never raises an approval request. */
  readonly approvalId?: never
  /** The input of a denied call is never validated, so it has no issues to count. */
  readonly issueCount?: never
}

/**
 * The inputs needed to construct an {@link AuditRecord}, discriminated by
 * `decision`.
 */
export type AuditRecordInput =
  | GovernedAuditRecordInput
  | InvalidInputAuditRecordInput
  | PermissionDeniedAuditRecordInput

/**
 * A structured, attributable record of a call that reached governance.
 *
 * Every field is a string except `timestamp`, which is a `Date`. To serialize a
 * record losslessly to JSON, convert it with {@link serializeAuditRecord}, which
 * renders the `timestamp` as an ISO-8601 string. All fields are `readonly`, so
 * the record reference is shallowly immutable; note the `timestamp` `Date` is
 * itself mutable (the constructor stores a defensive copy — see
 * {@link createAuditRecord}).
 */
export interface GovernedAuditRecord extends AuditRecordBase {
  /** Redacted, human-readable summary of the call arguments. */
  readonly argsSummary: string
  /** Governance decision reached for the call. */
  readonly decision: GovernedAuditDecision
  /** When the call occurred. */
  readonly timestamp: Date
  /** Optional human-readable reason for the decision. */
  readonly reason?: string
  /**
   * Optional correlation id tying the `pending` record of a held call to the
   * `approved`/`rejected` record that resolved it.
   */
  readonly approvalId?: string
  /** Only an `invalid-input` record counts validation issues. */
  readonly issueCount?: never
}

/**
 * A structured, attributable record of a call rejected by input validation.
 *
 * It says who called what and when, and how many validation issues the input
 * had, and nothing about the input itself. The constructor and the serializer
 * refuse a record of this kind that carries an argument summary, a reason, or
 * an approval correlation id.
 */
export interface InvalidInputAuditRecord extends AuditRecordBase {
  /** Marks the record as a call rejected by input validation. */
  readonly decision: 'invalid-input'
  /** When the call occurred. */
  readonly timestamp: Date
  /** How many validation issues the input had. */
  readonly issueCount: number
  /** Input that failed validation is never summarized. */
  readonly argsSummary?: never
  /** The issue messages are not recorded, so there is no reason to give. */
  readonly reason?: never
  /** Invalid input never raises an approval request. */
  readonly approvalId?: never
}

/**
 * A structured, attributable record of a call refused because its caller
 * lacks the operation's permission.
 *
 * It says who called what and when, and nothing else: the call's input was
 * never judged, so the record is the same whatever the input was. The
 * constructor and the serializer refuse a record of this kind that carries an
 * argument summary, a reason, an approval correlation id, or an issue count.
 */
export interface PermissionDeniedAuditRecord extends AuditRecordBase {
  /** Marks the record as a call refused by the permission check. */
  readonly decision: 'permission-denied'
  /** When the call occurred. */
  readonly timestamp: Date
  /** The input of a denied call is never judged, so it is never summarized. */
  readonly argsSummary?: never
  /** The record's decision is its whole account of why the call did not run. */
  readonly reason?: never
  /** A denied call never raises an approval request. */
  readonly approvalId?: never
  /** The input of a denied call is never validated, so it has no issues to count. */
  readonly issueCount?: never
}

/**
 * A structured, attributable record of a single capability call, discriminated
 * by `decision`. Only a {@link GovernedAuditRecord} carries an argument
 * summary: narrow on `decision` (a `switch` over every {@link AuditDecision},
 * or a check against both `invalid-input` and `permission-denied`) to read it.
 */
export type AuditRecord =
  | GovernedAuditRecord
  | InvalidInputAuditRecord
  | PermissionDeniedAuditRecord

/**
 * The JSON-serializable form of a {@link GovernedAuditRecord}.
 *
 * Identical to {@link GovernedAuditRecord} except `timestamp` is an ISO-8601
 * string so the record round-trips through JSON without losing precision or
 * type. The `reason` and `approvalId` fields are omitted entirely when absent
 * (rather than serialized as `null`/`undefined`) to keep records compact and
 * stable.
 */
export interface SerializedGovernedAuditRecord extends AuditRecordBase {
  /** Redacted, human-readable summary of the call arguments. */
  readonly argsSummary: string
  /** Governance decision reached for the call. */
  readonly decision: GovernedAuditDecision
  /** When the call occurred, as an ISO-8601 timestamp. */
  readonly timestamp: string
  /** Optional human-readable reason for the decision (omitted when absent). */
  readonly reason?: string
  /**
   * Optional correlation id for the held call this record belongs to (omitted
   * when absent).
   */
  readonly approvalId?: string
  /** Only an `invalid-input` record counts validation issues. */
  readonly issueCount?: never
}

/**
 * The JSON-serializable form of an {@link InvalidInputAuditRecord}: its
 * attribution, the time as an ISO-8601 string, and the issue count.
 */
export interface SerializedInvalidInputAuditRecord extends AuditRecordBase {
  /** Marks the record as a call rejected by input validation. */
  readonly decision: 'invalid-input'
  /** When the call occurred, as an ISO-8601 timestamp. */
  readonly timestamp: string
  /** How many validation issues the input had. */
  readonly issueCount: number
  /** Input that failed validation is never summarized. */
  readonly argsSummary?: never
  /** The issue messages are not recorded, so there is no reason to give. */
  readonly reason?: never
  /** Invalid input never raises an approval request. */
  readonly approvalId?: never
}

/**
 * The JSON-serializable form of a {@link PermissionDeniedAuditRecord}: its
 * attribution and the time as an ISO-8601 string.
 */
export interface SerializedPermissionDeniedAuditRecord extends AuditRecordBase {
  /** Marks the record as a call refused by the permission check. */
  readonly decision: 'permission-denied'
  /** When the call occurred, as an ISO-8601 timestamp. */
  readonly timestamp: string
  /** The input of a denied call is never judged, so it is never summarized. */
  readonly argsSummary?: never
  /** The record's decision is its whole account of why the call did not run. */
  readonly reason?: never
  /** A denied call never raises an approval request. */
  readonly approvalId?: never
  /** The input of a denied call is never validated, so it has no issues to count. */
  readonly issueCount?: never
}

/**
 * The JSON-serializable form of an {@link AuditRecord}, discriminated by
 * `decision` as the record is.
 */
export type SerializedAuditRecord =
  | SerializedGovernedAuditRecord
  | SerializedInvalidInputAuditRecord
  | SerializedPermissionDeniedAuditRecord

/** The fields an `invalid-input` record never carries. */
const FIELDS_ABSENT_FROM_INVALID_INPUT = ['argsSummary', 'reason', 'approvalId'] as const

/** The fields a `permission-denied` record never carries. */
const FIELDS_ABSENT_FROM_PERMISSION_DENIED = [
  'argsSummary',
  'reason',
  'approvalId',
  'issueCount',
] as const

/**
 * Refuse an `invalid-input` record (or record input) that carries a field its
 * kind never has, or an issue count that is not a non-negative integer.
 *
 * The types already rule both out; this holds the line for values that
 * reached here outside the type system (plain JavaScript, or a cast), so an
 * argument summary can never be written into a record of this kind.
 *
 * @throws `TypeError` naming the offending field.
 */
function assertInvalidInputShape(value: object, issueCount: number): void {
  for (const field of FIELDS_ABSENT_FROM_INVALID_INPUT) {
    if (Object.hasOwn(value, field)) {
      throw new TypeError(`An invalid-input audit record never carries "${field}".`)
    }
  }
  if (!Number.isSafeInteger(issueCount) || issueCount < 0) {
    throw new TypeError(
      'An invalid-input audit record needs its issue count as a non-negative integer.'
    )
  }
}

/**
 * Refuse a `permission-denied` record (or record input) that carries any field
 * beyond its attribution and time.
 *
 * As for `invalid-input`, the types already rule this out; this holds the line
 * for values that reached here outside the type system, so nothing about a
 * denied call's input can be written into its record.
 *
 * @throws `TypeError` naming the offending field.
 */
function assertPermissionDeniedShape(value: object): void {
  for (const field of FIELDS_ABSENT_FROM_PERMISSION_DENIED) {
    if (Object.hasOwn(value, field)) {
      throw new TypeError(`A permission-denied audit record never carries "${field}".`)
    }
  }
}

/**
 * Construct an immutable {@link AuditRecord} from its inputs.
 *
 * Pure and deterministic: given the same input (including the injected
 * `timestamp`) it always produces the same record. The input `timestamp` is
 * defensively copied so the returned record cannot be mutated by later changes
 * to the caller's `Date` instance. The optional `reason` and `approvalId` of a
 * governed record are included only when provided, matching
 * `exactOptionalPropertyTypes` semantics. Only the fields of the record's kind
 * are copied.
 *
 * @param input - The capability-call details, including an injected timestamp.
 * @returns A new immutable audit record of the same kind as `input`.
 * @throws `TypeError` for an `invalid-input` input that carries an argument
 *   summary, a reason, or an approval id, or whose issue count is not a
 *   non-negative integer; or for a `permission-denied` input that carries
 *   any of those fields.
 */
export function createAuditRecord(input: GovernedAuditRecordInput): GovernedAuditRecord
/**
 * Construct an immutable {@link InvalidInputAuditRecord}: the attribution, a
 * defensive copy of the timestamp, and the issue count, and nothing else.
 *
 * @param input - The rejected call's attribution, timestamp, and issue count.
 * @returns A new immutable `invalid-input` record.
 * @throws `TypeError` when `input` carries an argument summary, a reason, or an
 *   approval id, or its issue count is not a non-negative integer.
 */
export function createAuditRecord(input: InvalidInputAuditRecordInput): InvalidInputAuditRecord
/**
 * Construct an immutable {@link PermissionDeniedAuditRecord}: the attribution
 * and a defensive copy of the timestamp, and nothing else.
 *
 * @param input - The denied call's attribution and timestamp.
 * @returns A new immutable `permission-denied` record.
 * @throws `TypeError` when `input` carries an argument summary, a reason, an
 *   approval id, or an issue count.
 */
export function createAuditRecord(
  input: PermissionDeniedAuditRecordInput
): PermissionDeniedAuditRecord
/**
 * Construct an immutable {@link AuditRecord} of whichever kind `input` is.
 *
 * @param input - The capability-call details, including an injected timestamp.
 * @returns A new immutable audit record of the same kind as `input`.
 * @throws `TypeError` as the `invalid-input` and `permission-denied`
 *   signatures describe.
 */
export function createAuditRecord(input: AuditRecordInput): AuditRecord
export function createAuditRecord(input: AuditRecordInput): AuditRecord {
  // Defensive copy so the record is not aliased to the caller's mutable Date.
  const timestamp = new Date(input.timestamp.getTime())
  if (input.decision === 'invalid-input') {
    assertInvalidInputShape(input, input.issueCount)
    return {
      capability: input.capability,
      app: input.app,
      apiKeyId: input.apiKeyId,
      decision: input.decision,
      timestamp,
      issueCount: input.issueCount,
    }
  }
  if (input.decision === 'permission-denied') {
    assertPermissionDeniedShape(input)
    return {
      capability: input.capability,
      app: input.app,
      apiKeyId: input.apiKeyId,
      decision: input.decision,
      timestamp,
    }
  }
  return {
    capability: input.capability,
    app: input.app,
    argsSummary: input.argsSummary,
    apiKeyId: input.apiKeyId,
    decision: input.decision,
    timestamp,
    ...(input.reason === undefined ? {} : { reason: input.reason }),
    ...(input.approvalId === undefined ? {} : { approvalId: input.approvalId }),
  }
}

/**
 * Serialize an {@link AuditRecord} to its JSON-safe {@link SerializedAuditRecord}
 * form.
 *
 * Deterministic: the `timestamp` becomes a stable ISO-8601 string, and only
 * the fields of the record's kind are written, with `reason` and `approvalId`
 * included only when present. No storage is performed — the caller decides
 * where the serialized record goes.
 *
 * @param record - The audit record to serialize.
 * @returns The JSON-serializable representation, of the same kind.
 * @throws `TypeError` for an `invalid-input` record that carries an argument
 *   summary, a reason, or an approval id, or whose issue count is not a
 *   non-negative integer; or for a `permission-denied` record that carries
 *   any of those fields.
 */
export function serializeAuditRecord(record: GovernedAuditRecord): SerializedGovernedAuditRecord
/**
 * Serialize an {@link InvalidInputAuditRecord}: its attribution, the timestamp
 * as an ISO-8601 string, and the issue count, and nothing else.
 *
 * @param record - The `invalid-input` record to serialize.
 * @returns The JSON-serializable representation.
 * @throws `TypeError` when `record` carries an argument summary, a reason, or
 *   an approval id, or its issue count is not a non-negative integer.
 */
export function serializeAuditRecord(
  record: InvalidInputAuditRecord
): SerializedInvalidInputAuditRecord
/**
 * Serialize a {@link PermissionDeniedAuditRecord}: its attribution and the
 * timestamp as an ISO-8601 string, and nothing else.
 *
 * @param record - The `permission-denied` record to serialize.
 * @returns The JSON-serializable representation.
 * @throws `TypeError` when `record` carries an argument summary, a reason, an
 *   approval id, or an issue count.
 */
export function serializeAuditRecord(
  record: PermissionDeniedAuditRecord
): SerializedPermissionDeniedAuditRecord
/**
 * Serialize an {@link AuditRecord} of any kind.
 *
 * @param record - The audit record to serialize.
 * @returns The JSON-serializable representation, of the same kind.
 * @throws `TypeError` as the `invalid-input` and `permission-denied`
 *   signatures describe.
 */
export function serializeAuditRecord(record: AuditRecord): SerializedAuditRecord
export function serializeAuditRecord(record: AuditRecord): SerializedAuditRecord {
  if (record.decision === 'invalid-input') {
    assertInvalidInputShape(record, record.issueCount)
    return {
      capability: record.capability,
      app: record.app,
      apiKeyId: record.apiKeyId,
      decision: record.decision,
      timestamp: record.timestamp.toISOString(),
      issueCount: record.issueCount,
    }
  }
  if (record.decision === 'permission-denied') {
    assertPermissionDeniedShape(record)
    return {
      capability: record.capability,
      app: record.app,
      apiKeyId: record.apiKeyId,
      decision: record.decision,
      timestamp: record.timestamp.toISOString(),
    }
  }
  return {
    capability: record.capability,
    app: record.app,
    argsSummary: record.argsSummary,
    apiKeyId: record.apiKeyId,
    decision: record.decision,
    timestamp: record.timestamp.toISOString(),
    ...(record.reason === undefined ? {} : { reason: record.reason }),
    ...(record.approvalId === undefined ? {} : { approvalId: record.approvalId }),
  }
}
