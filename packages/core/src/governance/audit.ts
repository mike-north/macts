/**
 * Structured, attributable audit records for capability calls.
 *
 * Issue #7 (and VISION.md §5.4) requires that **every capability call is
 * audit-logged and attributable**: a typed capability call is far easier to log
 * and explain than a stream of clicks. A record captures *what* capability ran,
 * a *summary* of its arguments, *which app* it targeted, *which API key*
 * authorized it, *when* it happened, and the governance *decision* that was
 * reached.
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
 * The outcome a governance evaluation reached for a capability call.
 *
 * - `allowed`  — the call was permitted and executed.
 * - `denied`   — the call was blocked by policy (out-of-bounds capability).
 * - `pending`  — the call requires human confirmation (`confirm-first`) and is
 *                withheld awaiting approval. It has neither been approved nor
 *                rejected yet, and it did NOT execute.
 * - `approved` — the call required confirmation and a human approved it.
 * - `rejected` — the call required confirmation and a human declined it.
 *
 * Distinguishing `denied` (policy) from `rejected` (human) keeps the audit
 * trail precise about *why* a call did not run. Likewise, `pending` is kept
 * distinct from `denied`: a confirm-first call is not a policy denial — it is a
 * deferral awaiting approval — so recording it as `denied` would misattribute
 * the reason the call did not proceed.
 */
export const AUDIT_DECISIONS = ['allowed', 'denied', 'pending', 'approved', 'rejected'] as const

/**
 * A single audit decision value.
 */
export type AuditDecision = (typeof AUDIT_DECISIONS)[number]

/**
 * The inputs needed to construct an {@link AuditRecord}.
 *
 * The timestamp is supplied by the caller (injected, never read from
 * `Date.now()` inside this module) so records are deterministic and testable.
 */
export interface AuditRecordInput {
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
   * A redacted, human-readable summary of the call arguments — NOT the raw
   * arguments, which may contain sensitive data. Example: "Calendar: Work;
   * Summary: Team Meeting; Attendees: 3".
   */
  readonly argsSummary: string
  /**
   * Identifier of the API key that authorized the call (e.g.
   * `assistant-calendar-writer`). This is what makes a record *attributable*.
   */
  readonly apiKeyId: string
  /** The governance decision reached for this call. */
  readonly decision: AuditDecision
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
}

/**
 * A structured, attributable record of a single capability call.
 *
 * Every field is a string except `timestamp`, which is a `Date`. To serialize a
 * record losslessly to JSON, convert it with {@link serializeAuditRecord}, which
 * renders the `timestamp` as an ISO-8601 string. All fields are `readonly`, so
 * the record reference is shallowly immutable; note the `timestamp` `Date` is
 * itself mutable (the constructor stores a defensive copy — see
 * {@link createAuditRecord}).
 */
export interface AuditRecord {
  /** Capability invoked, in `app:resource:operation` form. */
  readonly capability: string
  /** App the capability targeted. */
  readonly app: string
  /** Redacted, human-readable summary of the call arguments. */
  readonly argsSummary: string
  /** Identifier of the authorizing API key (attribution). */
  readonly apiKeyId: string
  /** Governance decision reached for the call. */
  readonly decision: AuditDecision
  /** When the call occurred. */
  readonly timestamp: Date
  /** Optional human-readable reason for the decision. */
  readonly reason?: string
}

/**
 * The JSON-serializable form of an {@link AuditRecord}.
 *
 * Identical to {@link AuditRecord} except `timestamp` is an ISO-8601 string so
 * the record round-trips through JSON without losing precision or type. The
 * `reason` field is omitted entirely when absent (rather than serialized as
 * `null`/`undefined`) to keep records compact and stable.
 */
export interface SerializedAuditRecord {
  /** Capability invoked, in `app:resource:operation` form. */
  readonly capability: string
  /** App the capability targeted. */
  readonly app: string
  /** Redacted, human-readable summary of the call arguments. */
  readonly argsSummary: string
  /** Identifier of the authorizing API key (attribution). */
  readonly apiKeyId: string
  /** Governance decision reached for the call. */
  readonly decision: AuditDecision
  /** When the call occurred, as an ISO-8601 timestamp. */
  readonly timestamp: string
  /** Optional human-readable reason for the decision (omitted when absent). */
  readonly reason?: string
}

/**
 * Construct an immutable {@link AuditRecord} from its inputs.
 *
 * Pure and deterministic: given the same input (including the injected
 * `timestamp`) it always produces the same record. The input `timestamp` is
 * defensively copied so the returned record cannot be mutated by later changes
 * to the caller's `Date` instance. The optional `reason` is included only when
 * provided, matching `exactOptionalPropertyTypes` semantics.
 *
 * @param input - The capability-call details, including an injected timestamp.
 * @returns A new immutable audit record.
 */
export function createAuditRecord(input: AuditRecordInput): AuditRecord {
  const base = {
    capability: input.capability,
    app: input.app,
    argsSummary: input.argsSummary,
    apiKeyId: input.apiKeyId,
    decision: input.decision,
    // Defensive copy so the record is not aliased to the caller's mutable Date.
    timestamp: new Date(input.timestamp.getTime()),
  }
  return input.reason === undefined ? base : { ...base, reason: input.reason }
}

/**
 * Serialize an {@link AuditRecord} to its JSON-safe {@link SerializedAuditRecord}
 * form.
 *
 * Deterministic: the `timestamp` becomes a stable ISO-8601 string and `reason`
 * is included only when present. No storage is performed — the caller decides
 * where the serialized record goes.
 *
 * @param record - The audit record to serialize.
 * @returns The JSON-serializable representation.
 */
export function serializeAuditRecord(record: AuditRecord): SerializedAuditRecord {
  const base = {
    capability: record.capability,
    app: record.app,
    argsSummary: record.argsSummary,
    apiKeyId: record.apiKeyId,
    decision: record.decision,
    timestamp: record.timestamp.toISOString(),
  }
  return record.reason === undefined ? base : { ...base, reason: record.reason }
}
