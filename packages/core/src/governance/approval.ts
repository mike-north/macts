/**
 * Human-in-the-loop approval **provider interface** — the seam macts owns for
 * seeking a human decision on a held capability call.
 *
 * ## What this module is (and is not)
 *
 * The governance evaluator can reach a `confirm-first` decision: the policy
 * permits a capability *only after a human confirms it* (see
 * {@link ./evaluator.js}). Something must actually ask a human. macts stays
 * deliberately **agnostic about which approval system does the asking** — a
 * terminal prompt, a chat surface, or an end-to-end-encrypted approval
 * primitive returning signed verdicts are all valid. This module defines the
 * interface macts calls; concrete providers implement it and are installed as
 * plugins.
 *
 * It is **not** an authorization decision. An {@link ApprovalOutcome} of
 * `approved` only says "a human said yes to this exact request". The caller
 * still applies every other gate (API-key permissions, governance policy) —
 * approval can only ever *unblock* a call the policy already routed to a human,
 * never widen what the policy allows.
 *
 * ## Scope
 *
 * This seam covers the **direct** SDK / MCP / CLI call path — the calls
 * `requirePolicy` holds one at a time. Composed scripts are approved as a whole
 * by the human's own harness before they run, so they do not funnel through
 * here.
 *
 * ## Terminal states and fail-closed semantics
 *
 * A provider reports one of three {@link ApprovalState}s: `approved`,
 * `rejected`, or `timeout`. {@link seekApproval} normalizes those — plus the
 * failure modes a provider cannot report itself (it hung past the bound, threw,
 * or returned a malformed decision) — into a single {@link ApprovalOutcome}
 * whose `approved` flag is `true` **only** for an explicit `approved` state.
 * Everything else denies:
 *
 * | Provider behavior                       | `state`     | `approved` |
 * | --------------------------------------- | ----------- | ---------- |
 * | resolves `approved`                     | `approved`  | `true`     |
 * | resolves `rejected`                     | `rejected`  | `false`    |
 * | resolves `timeout`                      | `timeout`   | `false`    |
 * | does not respond within `timeoutMs`     | `timeout`   | `false`    |
 * | throws / rejects                        | `rejected`  | `false`    |
 * | returns a malformed decision            | `rejected`  | `false`    |
 *
 * Silence is never consent: an unreachable, broken, or slow provider denies the
 * call. `timeout` is kept as a *distinct* state (rather than collapsed into
 * `rejected`) so operators can tell "a human said no" from "no human answered"
 * while both deny.
 *
 * ## Evidence
 *
 * {@link ApprovalDecision.evidence} is an opaque slot for a provider's own
 * decision artifact (for example a cryptographically signed verdict). This
 * module deliberately does not model what is inside it — providers that produce
 * verifiable artifacts can surface them without the interface growing a
 * provider-specific shape.
 *
 * This module is domain-agnostic: it operates on the `app:resource:operation`
 * permission string, a {@link RiskClass}, and opaque identifiers. No
 * macOS-specific assumptions, no I/O, no wall-clock reads (the request's
 * `requestedAt` is injected by the caller).
 *
 * @packageDocumentation
 */

import type { RiskClass } from '../capabilities/risk.js'
import type { MatchedPolicyRule } from './evaluator.js'
import type { PolicyDisposition } from './policy.js'

// ---------------------------------------------------------------------------
// Terminal states
// ---------------------------------------------------------------------------

/**
 * The terminal states a HITL approval provider may report for one request.
 *
 * - `approved` — a human explicitly approved this exact request.
 * - `rejected` — a human explicitly declined it.
 * - `timeout`  — no human decision arrived in time.
 *
 * `timeout` is treated as a denial by {@link seekApproval} (fail-closed) but is
 * kept distinct so the reason a call did not run is never ambiguous.
 */
export const APPROVAL_STATES = ['approved', 'rejected', 'timeout'] as const

/**
 * A single approval state value. See {@link APPROVAL_STATES}.
 */
export type ApprovalState = (typeof APPROVAL_STATES)[number]

/**
 * Narrow an unknown value to an {@link ApprovalState}.
 *
 * Used at the provider trust boundary: a provider is third-party code, so its
 * returned `state` is validated rather than trusted.
 *
 * @param value - Candidate value.
 * @returns True when `value` is one of {@link APPROVAL_STATES}.
 */
export function isApprovalState(value: unknown): value is ApprovalState {
  return typeof value === 'string' && (APPROVAL_STATES as readonly string[]).includes(value)
}

/**
 * Which policy layer held the call and is asking for approval.
 *
 * - `host` — the machine-wide governance policy held the call.
 * - `key`  — a narrower per-API-key policy held it.
 *
 * **Reserved:** macts composes only a host-layer policy today, so every request
 * carries `'host'`. The value exists now so that providers declaring
 * {@link ApprovalProviderCapabilities.supportsDistinctRouting} have a stable
 * field to route on once a per-key layer exists, without a breaking change to
 * the request shape.
 */
export const APPROVAL_LAYERS = ['host', 'key'] as const

/**
 * A single approval-layer value. See {@link APPROVAL_LAYERS}.
 */
export type ApprovalLayer = (typeof APPROVAL_LAYERS)[number]

// ---------------------------------------------------------------------------
// Request
// ---------------------------------------------------------------------------

/**
 * Who is asking — the API key that authorized the held call.
 *
 * This is what makes an approval prompt attributable: a human is answering "may
 * *this* agent do *this*", not just "may this happen".
 */
export interface ApprovalRequesterIdentity {
  /** The API key's subject id (`ApiKeyPayload.sub`), stable across renames. */
  readonly apiKeyId: string
  /**
   * The API key's human-readable name (`ApiKeyPayload.name`), when the key
   * carries one. Display-only — never use it for identity comparisons.
   */
  readonly apiKeyName?: string | undefined
}

/**
 * Everything a provider needs to render a decision-grade approval prompt.
 *
 * Deliberately carries a **redacted** argument summary and never raw arguments:
 * the prompt has to be safe to display on a phone, in a chat client, or in a
 * third-party service.
 */
export interface ApprovalRequest {
  /**
   * Stable identifier for this approval request, unique per held call and
   * constant for its lifetime. Providers use it to correlate, de-duplicate
   * across devices, and retract a prompt that is no longer needed.
   */
  readonly id: string
  /** The `app:resource:operation` capability awaiting approval. */
  readonly permission: string
  /** Risk class of the operation, from the capability risk classifier. */
  readonly risk: RiskClass
  /** The API key that authorized the held call. */
  readonly identity: ApprovalRequesterIdentity
  /**
   * Redacted, human-readable summary of the call arguments. Already sanitised
   * by the caller — providers must never receive raw argument values.
   */
  readonly argsSummary: string
  /** The policy rule (and its provenance) that held this call. */
  readonly rule: MatchedPolicyRule
  /**
   * Human-readable explanation naming the governing rule and the exact
   * permission, as produced by the policy evaluator.
   */
  readonly reason: string
  /**
   * The bound, in milliseconds, within which a decision must arrive. Past this
   * the request is a `timeout` and the call is denied.
   */
  readonly timeoutMs: number
  /**
   * When the call was held. Injected by the caller (never read from the wall
   * clock here) so requests are deterministic and testable.
   */
  readonly requestedAt: Date
  /**
   * Which policy layer held the call. Always `'host'` today — see
   * {@link APPROVAL_LAYERS}.
   */
  readonly layer: ApprovalLayer
}

// ---------------------------------------------------------------------------
// Decision
// ---------------------------------------------------------------------------

/**
 * A standing-rule edit a provider suggests alongside its decision — for example
 * "stop asking me about `calendar:events:list`".
 *
 * **Reserved shape; not implemented.** macts does not act on suggestions today.
 * When it does, a suggestion will only ever be *offered* to the operator through
 * the normal policy-editing path — never auto-applied, because a provider that
 * could silently widen a policy would defeat the point of holding the call.
 * Providers must not emit one unless they declare
 * {@link ApprovalProviderCapabilities.supportsPolicySuggestions}.
 */
export interface ApprovalPolicySuggestion {
  /** The `app:resource:operation` (or wildcard pattern) the suggestion covers. */
  readonly permission: string
  /** The disposition the provider suggests for it. */
  readonly disposition: PolicyDisposition
  /** Optional human-readable justification to show the operator. */
  readonly rationale?: string | undefined
}

/**
 * What a provider returns for one {@link ApprovalRequest}.
 */
export interface ApprovalDecision {
  /** The terminal state the provider reached. */
  readonly state: ApprovalState
  /**
   * Optional human-readable explanation (e.g. why a human declined). Surfaced
   * in the audit trail and to the calling client.
   */
  readonly reason?: string | undefined
  /**
   * Opaque provider artifact backing the decision — for example a signed
   * verdict. macts stores and forwards it without interpreting it; the SPI does
   * not model what is inside.
   */
  readonly evidence?: unknown
  /**
   * Optional suggested standing-rule edit. Ignored unless the provider declares
   * {@link ApprovalProviderCapabilities.supportsPolicySuggestions}, and never
   * auto-applied. See {@link ApprovalPolicySuggestion}.
   */
  readonly policySuggestion?: ApprovalPolicySuggestion | undefined
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

/**
 * Optional features a provider declares support for.
 *
 * Both flags are required (no defaults) so a provider author has to make a
 * deliberate statement about each capability rather than inheriting one.
 */
export interface ApprovalProviderCapabilities {
  /**
   * The provider may return an {@link ApprovalPolicySuggestion} alongside its
   * decision. Reserved: macts does not act on suggestions yet.
   */
  readonly supportsPolicySuggestions: boolean
  /**
   * The provider can route host-layer and key-layer holds to different
   * accounts/approvers (see {@link ApprovalRequest.layer}). Reserved: macts
   * sends only host-layer requests today.
   */
  readonly supportsDistinctRouting: boolean
}

/**
 * Context handed to a provider for a single request.
 */
export interface ApprovalRequestContext {
  /**
   * Aborted when the bound in {@link ApprovalRequest.timeoutMs} elapses.
   * Providers should use it to cancel network waits and retract any prompt they
   * raised — macts has already stopped waiting and denied the call by then.
   */
  readonly signal: AbortSignal
}

/**
 * The interface a HITL approval provider implements.
 *
 * Implementations are third-party code and are treated as untrusted: a
 * malformed decision, a thrown error, or a hang all deny the call (see
 * {@link seekApproval}).
 */
export interface ApprovalProvider {
  /**
   * Stable provider name for logs, audit reasons, and diagnostics
   * (e.g. the plugin package name).
   */
  readonly name: string
  /** Optional features this provider supports. */
  readonly capabilities: ApprovalProviderCapabilities
  /**
   * Ask a human to decide on one held call.
   *
   * Implementations should resolve as soon as a human decides, and should
   * honour `context.signal` rather than resolving after it aborts.
   *
   * @param request - The held call, with a redacted argument summary.
   * @param context - Per-request context (abort signal).
   * @returns The human's decision.
   */
  requestApproval(
    request: ApprovalRequest,
    context: ApprovalRequestContext
  ): Promise<ApprovalDecision>
}

// ---------------------------------------------------------------------------
// Gate
// ---------------------------------------------------------------------------

/**
 * Default bound for a human decision: two minutes.
 *
 * Long enough for a human to notice a prompt and answer, short enough that a
 * held HTTP request does not sit open indefinitely.
 */
export const DEFAULT_APPROVAL_TIMEOUT_MS = 120_000

/**
 * The normalized result of asking a provider for a decision.
 *
 * `approved` is the only field callers should gate on; `state` explains *why*
 * for logs, audit reasons, and clients.
 */
export interface ApprovalOutcome {
  /**
   * True **only** when a human explicitly approved. False for every rejection,
   * timeout, provider error, and malformed response.
   */
  readonly approved: boolean
  /** The terminal state reached. See {@link APPROVAL_STATES}. */
  readonly state: ApprovalState
  /** Human-readable explanation, always present, naming the permission. */
  readonly reason: string
  /** Opaque provider artifact, when the provider supplied one. */
  readonly evidence?: unknown
  /**
   * Suggested standing-rule edit, present only when the provider declares
   * {@link ApprovalProviderCapabilities.supportsPolicySuggestions} and returned
   * one. Never auto-applied.
   */
  readonly policySuggestion?: ApprovalPolicySuggestion | undefined
  /**
   * Set when the provider itself misbehaved (threw, or returned a malformed
   * decision) rather than reporting a state. The call is denied either way;
   * this distinguishes "a human declined" from "the approval channel is
   * broken" for operators.
   */
  readonly providerFailure?: string | undefined
}

/**
 * Options for {@link seekApproval}.
 */
export interface SeekApprovalOptions {
  /** The provider to ask. */
  readonly provider: ApprovalProvider
  /** The held call, including its `timeoutMs` bound. */
  readonly request: ApprovalRequest
}

/**
 * Ask a provider for a human decision, bounded by the request's `timeoutMs`,
 * and normalize the answer fail-closed.
 *
 * This is the only function callers should use to invoke a provider: it owns
 * the timeout bound, the abort signal, and every failure mode, so no call site
 * can accidentally treat a hang or a crash as approval. See the table in the
 * module documentation for the full mapping.
 *
 * @param options - Provider and request.
 * @returns The normalized {@link ApprovalOutcome}. Never rejects.
 */
export async function seekApproval(options: SeekApprovalOptions): Promise<ApprovalOutcome> {
  const { provider, request } = options

  // A non-positive or non-finite bound leaves no time for a human to answer.
  // Fail closed immediately rather than asking a provider we will not wait for.
  if (!Number.isFinite(request.timeoutMs) || request.timeoutMs <= 0) {
    return {
      approved: false,
      state: 'timeout',
      reason: `Approval for "${request.permission}" was not sought: the approval timeout (${String(
        request.timeoutMs
      )}ms) leaves no time for a human decision. Treated as rejected (fail-closed).`,
    }
  }

  const controller = new AbortController()
  let timer: ReturnType<typeof setTimeout> | undefined

  try {
    const timedOut = new Promise<ProviderResult>((resolve) => {
      timer = setTimeout(() => {
        // Tell the provider to stop and retract its prompt: we are no longer
        // waiting, and the call is already denied.
        controller.abort()
        resolve({ kind: 'timeout' })
      }, request.timeoutMs)
    })

    const result = await Promise.race([
      invokeProvider(provider, request, controller.signal),
      timedOut,
    ])

    return normalizeProviderResult(provider, request, result)
  } finally {
    if (timer !== undefined) {
      clearTimeout(timer)
    }
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * The raw shapes a provider invocation can produce, before normalization.
 */
type ProviderResult =
  | { readonly kind: 'decision'; readonly decision: ApprovalDecision }
  | { readonly kind: 'error'; readonly message: string }
  | { readonly kind: 'timeout' }

/**
 * Invoke a provider without letting it throw.
 *
 * A provider is third-party code: it may throw synchronously (returning no
 * promise at all), reject, or resolve with something that is not a decision.
 * All three are captured here so {@link seekApproval}'s race never rejects.
 */
async function invokeProvider(
  provider: ApprovalProvider,
  request: ApprovalRequest,
  signal: AbortSignal
): Promise<ProviderResult> {
  try {
    const decision = await provider.requestApproval(request, { signal })
    if (!isApprovalDecision(decision)) {
      return {
        kind: 'error',
        message: 'returned a malformed decision (missing or unrecognized "state")',
      }
    }
    return { kind: 'decision', decision }
  } catch (error) {
    return { kind: 'error', message: error instanceof Error ? error.message : String(error) }
  }
}

/**
 * Validate a provider's returned value at the trust boundary.
 *
 * Only `state` is required and it must be a known {@link ApprovalState}; an
 * unrecognized state (e.g. a future `'escalated'`) is malformed for this version
 * of the interface and therefore denies, rather than being silently ignored.
 */
function isApprovalDecision(value: unknown): value is ApprovalDecision {
  if (typeof value !== 'object' || value === null) {
    return false
  }
  return isApprovalState((value as { state?: unknown }).state)
}

/**
 * Map a raw {@link ProviderResult} to the fail-closed {@link ApprovalOutcome}.
 */
function normalizeProviderResult(
  provider: ApprovalProvider,
  request: ApprovalRequest,
  result: ProviderResult
): ApprovalOutcome {
  if (result.kind === 'timeout') {
    return {
      approved: false,
      state: 'timeout',
      reason: `No approval decision for "${request.permission}" from provider "${provider.name}" within ${String(request.timeoutMs)}ms. Treated as rejected (fail-closed).`,
    }
  }

  if (result.kind === 'error') {
    return {
      approved: false,
      state: 'rejected',
      reason: `Approval provider "${provider.name}" failed for "${request.permission}": ${result.message}. Treated as rejected (fail-closed).`,
      providerFailure: result.message,
    }
  }

  const { decision } = result
  const base = {
    approved: decision.state === 'approved',
    state: decision.state,
    reason: decision.reason ?? defaultDecisionReason(provider, request, decision.state),
  }

  // A suggestion from a provider that did not declare support is dropped, not
  // forwarded: capability flags are the contract, and honouring an undeclared
  // extra would let a provider grow surface macts never agreed to consume.
  const suggestion = provider.capabilities.supportsPolicySuggestions
    ? decision.policySuggestion
    : undefined

  return {
    ...base,
    ...(decision.evidence === undefined ? {} : { evidence: decision.evidence }),
    ...(suggestion === undefined ? {} : { policySuggestion: suggestion }),
  }
}

/**
 * Human-readable fallback when a provider returns a state without a reason.
 */
function defaultDecisionReason(
  provider: ApprovalProvider,
  request: ApprovalRequest,
  state: ApprovalState
): string {
  switch (state) {
    case 'approved':
      return `Approved by a human via provider "${provider.name}" for "${request.permission}".`
    case 'rejected':
      return `Declined by a human via provider "${provider.name}" for "${request.permission}".`
    case 'timeout':
      return `Provider "${provider.name}" reported no human decision for "${request.permission}" within ${String(request.timeoutMs)}ms. Treated as rejected (fail-closed).`
  }
}
