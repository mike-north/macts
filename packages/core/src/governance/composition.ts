/**
 * Layered governance-policy *composition* — combining a machine-wide host
 * policy with an optional, narrower per-API-key policy.
 *
 * A host policy declares the boundary for the machine. A per-key policy lets a
 * narrowly-scoped credential (say, one issued to a single agent) be held to a
 * stricter bar than the host default without editing the host policy file. The
 * one invariant that makes this safe to expose is:
 *
 * > **A key policy may only ever tighten. It can never grant what the host
 * > policy withholds.**
 *
 * Everything in this module exists to make that invariant structural rather
 * than a thing a caller has to remember.
 *
 * ## Why composition happens at the *decision* level, not the disposition level
 *
 * The obvious design is a total order over declared dispositions
 * (`forbidden` > `confirm-first` > `read-only` > `allowed`) and "take the
 * stricter one". That is unsound, because `read-only` and `confirm-first` are
 * genuinely **incomparable**: which is stricter flips with the operation's
 * {@link RiskClass}.
 *
 * | host | key | read-class operation | mutating operation |
 * | --- | --- | --- | --- |
 * | `read-only` | `confirm-first` | host allows outright, key holds → *key* is stricter | host denies, key would hold (and could then be approved) → *host* is stricter |
 *
 * Choosing `confirm-first` as globally stricter therefore turns a host
 * `read-only` **denial** of a mutating call into an approvable hold — the key
 * would have widened the host policy, which is precisely what the invariant
 * forbids. Choosing `read-only` as globally stricter breaks the other column: a
 * key that asked to be consulted gets silently allowed.
 *
 * So each layer is evaluated **independently** against the same permission and
 * risk class, and the two resulting {@link PolicyDecision}s are combined. At the
 * decision level the lattice is a true total order with no risk-class
 * dependence:
 *
 * ```text
 * denied  >  confirm-first  >  allowed
 * ```
 *
 * - `denied` is absolute: a deny at either layer denies, and — critically — a
 *   host deny is never escalated into an approval request. Nobody is asked to
 *   approve something the host policy already refused.
 * - `confirm-first` beats `allowed`: if either layer wants a human in the loop,
 *   the call is held rather than silently allowed.
 * - `allowed` requires both layers to allow.
 *
 * The `read-only` × `confirm-first` case then resolves correctly on its own
 * terms: held for reads, denied for mutations.
 *
 * The declarative disposition ordering is still useful for policy authoring and
 * inspection tooling ("is this rule stricter than that one?"), so it ships here
 * as {@link compareDispositionStrictness} — documented as an ordering over
 * *declarations*, explicitly not the composition rule.
 *
 * ## Restrictions
 *
 * Path/URL restrictions compose as **union of denies, intersection of allows**
 * (see {@link composeRestrictions}).
 *
 * ## Attribution
 *
 * Every composed evaluation reports which {@link PolicyLayer} produced the
 * effective decision, so a `confirm-first` hold can be routed to the right
 * approver (a host-layer hold and a key-layer hold may belong to different
 * humans).
 *
 * @packageDocumentation
 */

import type { GovernancePolicy, PolicyDisposition, Restrictions } from './policy.js'
import type { PolicyDecision, PolicyEvaluation } from './evaluator.js'
import { evaluatePolicy } from './evaluator.js'
import type { RiskClass } from '../capabilities/risk.js'

// ---------------------------------------------------------------------------
// Layers
// ---------------------------------------------------------------------------

/**
 * Which policy layer a decision came from.
 *
 * - `'host'` — the machine-wide governance policy.
 * - `'key'`  — the narrower policy attached to the authenticated API key.
 */
export const POLICY_LAYERS = ['host', 'key'] as const

/**
 * A single policy layer. See {@link POLICY_LAYERS}.
 */
export type PolicyLayer = (typeof POLICY_LAYERS)[number]

// ---------------------------------------------------------------------------
// Strictness orderings
// ---------------------------------------------------------------------------

/**
 * The terminal {@link PolicyDecision}s ordered **loosest to strictest**.
 *
 * This is the operative tightening lattice: `allowed` < `confirm-first` <
 * `denied`. Unlike an ordering over declared dispositions it is a true total
 * order — it is evaluated *after* the operation's risk class has been applied,
 * so there is no case where the relative strictness of two entries depends on
 * the call being composed.
 */
export const POLICY_DECISIONS_BY_STRICTNESS = ['allowed', 'confirm-first', 'denied'] as const

/**
 * Strictness rank of each {@link PolicyDecision}; higher is stricter.
 */
const DECISION_RANK: Readonly<Record<PolicyDecision, number>> = {
  allowed: 0,
  'confirm-first': 1,
  denied: 2,
}

/**
 * Compare two {@link PolicyDecision}s by strictness.
 *
 * @param a - Left decision.
 * @param b - Right decision.
 * @returns A negative number when `a` is looser than `b`, zero when they are
 *   equally strict, and a positive number when `a` is stricter.
 */
export function comparePolicyDecisionStrictness(a: PolicyDecision, b: PolicyDecision): number {
  return DECISION_RANK[a] - DECISION_RANK[b]
}

/**
 * The stricter of two {@link PolicyDecision}s (`denied` > `confirm-first` >
 * `allowed`).
 *
 * Ties return `a`, which callers rely on to attribute an unchanged decision to
 * the host layer.
 *
 * @param a - Left decision.
 * @param b - Right decision.
 * @returns Whichever decision is stricter; `a` when they are equally strict.
 */
export function strictestPolicyDecision(a: PolicyDecision, b: PolicyDecision): PolicyDecision {
  return comparePolicyDecisionStrictness(b, a) > 0 ? b : a
}

/**
 * Declared {@link PolicyDisposition}s ordered **loosest to strictest**, as a
 * declarative convenience for policy authoring and inspection tooling.
 *
 * **This is not the composition rule.** Composing two layers by this ordering
 * is unsound, because `read-only` and `confirm-first` swap places depending on
 * the operation's risk class — see the module documentation. Composition goes
 * through {@link composePolicyEvaluations}, which combines terminal decisions.
 * Use this ordering only where the question really is "which of these two
 * *declarations* is the more restrictive statement of intent?".
 */
export const POLICY_DISPOSITIONS_BY_STRICTNESS = [
  'allowed',
  'read-only',
  'confirm-first',
  'forbidden',
] as const

/**
 * Strictness rank of each declared {@link PolicyDisposition}; higher is stricter.
 */
const DISPOSITION_RANK: Readonly<Record<PolicyDisposition, number>> = {
  allowed: 0,
  'read-only': 1,
  'confirm-first': 2,
  forbidden: 3,
}

/**
 * Compare two declared {@link PolicyDisposition}s by the declarative ordering in
 * {@link POLICY_DISPOSITIONS_BY_STRICTNESS}.
 *
 * See that constant for why this must not be used to compose layers.
 *
 * @param a - Left disposition.
 * @param b - Right disposition.
 * @returns A negative number when `a` is looser than `b`, zero when equal, and a
 *   positive number when `a` is stricter.
 */
export function compareDispositionStrictness(a: PolicyDisposition, b: PolicyDisposition): number {
  return DISPOSITION_RANK[a] - DISPOSITION_RANK[b]
}

// ---------------------------------------------------------------------------
// Restriction composition
// ---------------------------------------------------------------------------

/**
 * Path and URL restrictions after composing two layers.
 *
 * Deny lists compose as a plain **union**: a pattern denied by either layer is
 * denied outright.
 *
 * Allow lists cannot be flattened the same way. An allow list is a conjunctive
 * constraint ("only these"), and two allow lists over *opaque patterns* cannot
 * be intersected into a single list without either widening (host `/Users/me/**`
 * ∩ key `/Users/me/projects/**` has no common literal, and an empty allow list
 * means "unconstrained" — the widest possible answer) or inventing pattern
 * algebra this layer has no business owning. So each constraining layer
 * contributes its own **group**, and a candidate must satisfy *every* group.
 * That is the intersection, expressed exactly.
 *
 * A layer that declares no allow patterns contributes no group (it constrains
 * nothing); an empty `groups` array therefore means "unconstrained", matching
 * the single-layer semantics of {@link Restrictions}.
 */
export interface ComposedRestrictions {
  /** Union of both layers' `pathsDeny`, de-duplicated, declaration order preserved. */
  readonly pathsDeny: readonly string[]
  /**
   * One group per layer that constrained paths. A candidate is permitted only if
   * it matches at least one pattern in **every** group.
   */
  readonly pathsAllowGroups: readonly (readonly string[])[]
  /** Union of both layers' `urlsDeny`, de-duplicated, declaration order preserved. */
  readonly urlsDeny: readonly string[]
  /**
   * One group per layer that constrained URLs. A candidate is permitted only if
   * it matches at least one pattern in **every** group.
   */
  readonly urlsAllowGroups: readonly (readonly string[])[]
}

/**
 * Union two pattern lists, preserving first-seen order and dropping duplicates.
 */
function unionPatterns(a: readonly string[], b: readonly string[]): readonly string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const pattern of [...a, ...b]) {
    if (seen.has(pattern)) continue
    seen.add(pattern)
    out.push(pattern)
  }
  return out
}

/**
 * Collect the non-empty allow lists of both layers as conjunctive groups.
 */
function allowGroups(
  host: readonly string[] | undefined,
  key: readonly string[] | undefined
): readonly (readonly string[])[] {
  const groups: (readonly string[])[] = []
  if (host !== undefined && host.length > 0) groups.push([...host])
  if (key !== undefined && key.length > 0) groups.push([...key])
  return groups
}

/**
 * Compose the path/URL restrictions of a host layer and a key layer as
 * **union of denies, intersection of allows**.
 *
 * Either side may be `undefined` (no matched app rule, or no key policy at all),
 * in which case only the other side constrains — so composing a single layer is
 * exactly that layer's own restrictions.
 *
 * @param host - Restrictions from the host layer's matched app rule, if any.
 * @param key - Restrictions from the key layer's matched app rule, if any.
 * @returns The composed restrictions.
 */
export function composeRestrictions(
  host: Restrictions | undefined,
  key: Restrictions | undefined
): ComposedRestrictions {
  return {
    pathsDeny: unionPatterns(host?.pathsDeny ?? [], key?.pathsDeny ?? []),
    pathsAllowGroups: allowGroups(host?.pathsAllow, key?.pathsAllow),
    urlsDeny: unionPatterns(host?.urlsDeny ?? [], key?.urlsDeny ?? []),
    urlsAllowGroups: allowGroups(host?.urlsAllow, key?.urlsAllow),
  }
}

/**
 * Decides whether a single pattern matches a candidate path/URL.
 *
 * Injected rather than implemented here: pattern-matching semantics belong to
 * the enforcement layer that owns them, and this module's job is composition,
 * not glob evaluation.
 */
export type RestrictionPatternMatcher = (pattern: string, candidate: string) => boolean

/**
 * Which restriction dimension a check applies to.
 */
export type RestrictionKind = 'path' | 'url'

/**
 * Test a candidate path or URL against {@link ComposedRestrictions}.
 *
 * The rule is fail-closed in the direction that matters:
 *
 * 1. If the candidate matches **any** deny pattern (from either layer), it is
 *    rejected — union of denies.
 * 2. Otherwise it must match at least one pattern in **every** allow group —
 *    intersection of allows. With no groups it is unconstrained.
 *
 * @param composed - Composed restrictions from {@link composeRestrictions}.
 * @param kind - Whether `candidate` is a filesystem path or a URL.
 * @param candidate - The concrete path/URL being checked.
 * @param matches - Pattern-matching predicate supplied by the caller.
 * @returns `true` when the composed restrictions permit `candidate`.
 */
export function composedRestrictionsPermit(
  composed: ComposedRestrictions,
  kind: RestrictionKind,
  candidate: string,
  matches: RestrictionPatternMatcher
): boolean {
  const deny = kind === 'path' ? composed.pathsDeny : composed.urlsDeny
  const groups = kind === 'path' ? composed.pathsAllowGroups : composed.urlsAllowGroups

  if (deny.some((pattern) => matches(pattern, candidate))) {
    return false
  }
  return groups.every((group) => group.some((pattern) => matches(pattern, candidate)))
}

// ---------------------------------------------------------------------------
// Layered evaluation
// ---------------------------------------------------------------------------

/**
 * The result of evaluating a capability against a host policy and an optional
 * per-key policy.
 *
 * Extends {@link PolicyEvaluation}, so its `decision`, `permission`, `rule`, and
 * `reason` are the **effective** (composed) values and it can be handed to any
 * consumer that expects a plain evaluation. The extra fields carry the
 * provenance a plain evaluation cannot express.
 */
export interface LayeredPolicyEvaluation extends PolicyEvaluation {
  /**
   * Which layer produced the effective decision.
   *
   * Ties are attributed to `'host'`: if the key policy reached the same decision
   * the host policy already reached, the key policy did not change the outcome.
   * This is what a `confirm-first` hold routes on — a key-layer hold is a
   * question about *that* credential and may belong to a different approver.
   */
  readonly layer: PolicyLayer
  /** The host layer's independent evaluation. Always present. */
  readonly host: PolicyEvaluation
  /** The key layer's independent evaluation, or `undefined` when the key has no policy. */
  readonly key?: PolicyEvaluation | undefined
  /** Path/URL restrictions of both layers' matched app rules, composed. */
  readonly restrictions: ComposedRestrictions
}

/**
 * Compose two already-computed layer evaluations into one effective evaluation.
 *
 * Exposed separately from {@link evaluateLayeredPolicy} so a caller that already
 * holds per-layer evaluations (or that evaluates layers from different sources)
 * can reuse the exact composition semantics rather than re-deriving them.
 *
 * @param host - The host layer's evaluation.
 * @param key - The key layer's evaluation, or `undefined` when the key carries
 *   no policy.
 * @returns The composed {@link LayeredPolicyEvaluation}.
 */
export function composePolicyEvaluations(
  host: PolicyEvaluation,
  key: PolicyEvaluation | undefined
): LayeredPolicyEvaluation {
  const restrictions = composeRestrictions(
    host.rule.appRule?.restrictions,
    key?.rule.appRule?.restrictions
  )

  if (key === undefined) {
    // No key policy: the host evaluation *is* the effective evaluation, verbatim
    // (same decision, same rule, same reason string), so behavior is unchanged
    // for every credential that has no policy of its own.
    return { ...host, layer: 'host', host, restrictions }
  }

  const decision = strictestPolicyDecision(host.decision, key.decision)
  // Ties fall to the host: the key policy only "wins" when it actually tightened.
  const layer: PolicyLayer = decision === host.decision ? 'host' : 'key'
  const winner = layer === 'host' ? host : key

  return {
    decision,
    permission: host.permission,
    rule: winner.rule,
    reason: composeReason(host, key, layer, decision),
    layer,
    host,
    key,
    restrictions,
  }
}

/**
 * Build the human-readable reason for a composed decision.
 *
 * Names the layer that governed, both layers' decisions, and carries the winning
 * layer's own reason (which already names the matched rule and the exact
 * permission). A key-layer grant that lost to the host layer is called out
 * explicitly — that case is the "a key can never widen the host policy"
 * invariant doing its job, and an operator reading an audit trail should see it.
 */
function composeReason(
  host: PolicyEvaluation,
  key: PolicyEvaluation,
  layer: PolicyLayer,
  decision: PolicyDecision
): string {
  const winner = layer === 'host' ? host : key
  const label = layer === 'host' ? 'host policy' : 'per-key policy'
  const base =
    `Effective decision "${decision}" for "${host.permission}" comes from the ${label} ` +
    `(host: "${host.decision}", key: "${key.decision}"). ${winner.reason}`

  if (layer === 'host' && comparePolicyDecisionStrictness(key.decision, host.decision) < 0) {
    return `${base} The per-key policy is looser here and cannot widen the host policy.`
  }
  return base
}

/**
 * Options for {@link evaluateLayeredPolicy}.
 */
export interface EvaluateLayeredPolicyOptions {
  /** The machine-wide host policy. Always applies. */
  readonly hostPolicy: GovernancePolicy
  /**
   * The authenticated API key's own policy, when it has one. Omitted or
   * `undefined` means the host policy alone governs — identical to the behavior
   * before per-key policies existed.
   */
  readonly keyPolicy?: GovernancePolicy | undefined
  /** The capability in `app:resource:operation` form. */
  readonly permission: string
  /** Pre-computed risk class of the operation (drives `read-only` semantics). */
  readonly risk: RiskClass
}

/**
 * Evaluate a capability against a host policy and an optional per-key policy,
 * returning the effective (stricter) decision and its provenance.
 *
 * Each layer is evaluated independently by {@link evaluatePolicy} — the single
 * source of truth for a *single* policy's decision — and the two decisions are
 * combined by {@link composePolicyEvaluations}. This module never re-implements
 * matching or disposition semantics.
 *
 * With no key policy the result is the host evaluation verbatim, plus
 * `layer: 'host'`.
 *
 * @param options - Host policy, optional key policy, permission, and risk class.
 * @returns The composed {@link LayeredPolicyEvaluation}.
 */
export function evaluateLayeredPolicy(
  options: EvaluateLayeredPolicyOptions
): LayeredPolicyEvaluation {
  const { hostPolicy, keyPolicy, permission, risk } = options

  const host = evaluatePolicy(hostPolicy, permission, risk)
  const key = keyPolicy === undefined ? undefined : evaluatePolicy(keyPolicy, permission, risk)

  return composePolicyEvaluations(host, key)
}
