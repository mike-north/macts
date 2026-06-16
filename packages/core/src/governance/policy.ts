/**
 * Governance policy *declaration* schema, parser, and types.
 *
 * A governance policy declaration is how a user or a security team declares
 * the boundary an agent must stay inside: which apps and operations are
 * allowed, read-only, forbidden, or require confirmation; which filesystem
 * paths and URLs are in or out of bounds; and which sensitivity tags apply
 * (VISION.md §6, §7.3, §10; issue #7).
 *
 * This module is intentionally limited to the **decision-invariant** half of
 * that story: parsing, validating, and typing the declaration. It deliberately
 * does NOT compile the declaration down to `app:resource:operation` enforcement
 * permissions, wire approval gates, or filter discovery — those depend on an
 * open governance-policy design decision and live elsewhere once that lands.
 *
 * The declaration is **domain-agnostic**: it names apps, operations, paths, and
 * URLs as opaque strings/patterns and carries no macOS-specific assumptions, so
 * the same schema serves any provider (e.g. a future web/Chrome surface).
 *
 * @see The audit half of issue #7 lives in {@link ./audit.js}.
 * @packageDocumentation
 */

import { z } from 'zod'

/**
 * The disposition a policy assigns to an app or operation.
 *
 * Mirrors the four states the issue enumerates:
 *
 * - `allowed`       — the agent may invoke the operation without friction.
 * - `read-only`     — only non-mutating (observational) use is permitted; any
 *                     mutating use is treated as if forbidden.
 * - `confirm-first` — permitted, but a human must approve each invocation
 *                     before it runs (the approval-gate wiring itself is
 *                     decision-dependent and is NOT implemented here).
 * - `forbidden`     — the agent may never invoke the operation.
 *
 * Ordered least-to-most restrictive for stable, deterministic iteration.
 */
export const POLICY_DISPOSITIONS = ['allowed', 'read-only', 'confirm-first', 'forbidden'] as const

/**
 * A single policy disposition value (`allowed` | `read-only` | `confirm-first`
 * | `forbidden`).
 */
export type PolicyDisposition = (typeof POLICY_DISPOSITIONS)[number]

/**
 * Zod schema for {@link PolicyDisposition}.
 */
export const PolicyDispositionSchema = z.enum(POLICY_DISPOSITIONS)

/**
 * Sensitivity tags applied to an app or operation rule.
 *
 * Tags are free-form labels a security team uses to group and reason about
 * capabilities (e.g. `pii`, `financial`, `outbound`, `irreversible`). They are
 * declarative metadata only — how a downstream policy *acts* on a tag is part
 * of the open compilation decision and is not modeled here. Tags are
 * lowercased, non-empty, and use a restricted charset so they are stable
 * identifiers rather than prose.
 */
export const SensitivityTagSchema = z
  .string()
  .min(1, 'sensitivity tag must not be empty')
  .regex(
    /^[a-z][a-z0-9_-]*$/,
    'sensitivity tag must be lowercase alphanumeric (dashes/underscores allowed) and start with a letter'
  )

/**
 * A sensitivity tag — a stable, lowercase label (e.g. `pii`, `outbound`).
 */
export type SensitivityTag = z.infer<typeof SensitivityTagSchema>

/**
 * An operation name within an app rule.
 *
 * This is the *operation* segment of the enforcement model's
 * `app:resource:operation` triple, or the wildcard `*` meaning "every
 * operation". The declaration stays domain-agnostic: it does not require the
 * operation to exist in any particular manifest (that cross-check is part of
 * compilation, which is out of scope here).
 */
export const OperationPatternSchema = z
  .string()
  .min(1, 'operation must not be empty')
  .regex(
    /^(?:\*|[a-z][a-zA-Z0-9_-]*)$/,
    'operation must be "*" or start with a lowercase letter (alphanumerics, dashes, underscores allowed)'
  )

/**
 * An operation pattern: a concrete operation name or the `*` wildcard.
 */
export type OperationPattern = z.infer<typeof OperationPatternSchema>

/**
 * Per-operation override inside an app rule.
 *
 * Lets a declaration set a disposition (and optional tags / human-readable
 * reason) for a specific operation that differs from the app-level default.
 * Storing this as a structured record — rather than inferring it — keeps the
 * declaration explicit and auditable.
 */
export const OperationRuleSchema = z
  .object({
    /** The operation this rule targets (a concrete name or `*`). */
    operation: OperationPatternSchema,
    /** Disposition to apply to this operation. */
    disposition: PolicyDispositionSchema,
    /** Sensitivity tags attached to this operation. */
    tags: z.array(SensitivityTagSchema).default([]),
    /**
     * Optional human-readable explanation, surfaced when the rule blocks or
     * gates an operation (issue #7: "blocked with a human-readable reason").
     */
    reason: z.string().min(1).optional(),
  })
  .strict()

/**
 * A single operation-level rule within an app rule.
 */
export type OperationRule = z.infer<typeof OperationRuleSchema>

/**
 * A glob/pattern restriction on filesystem paths or URLs.
 *
 * Restrictions are expressed as opaque, non-empty pattern strings; this module
 * validates only that they are well-formed strings, not that a given path
 * matches (matching semantics belong to the enforcement/compilation layer that
 * the design decision governs).
 */
export const PatternRestrictionSchema = z.string().min(1, 'restriction pattern must not be empty')

/**
 * Path and URL restrictions that bound where an app rule may operate.
 *
 * `allow`/`deny` lists are kept separate (rather than a single signed list) so
 * the declaration is explicit about intent and a reviewer can read the boundary
 * directly. Empty lists mean "no restriction of this kind"; the precedence of
 * allow vs. deny when both match is a compilation concern and is not decided
 * here.
 */
export const RestrictionsSchema = z
  .object({
    /** Filesystem path patterns the agent may operate within. */
    pathsAllow: z.array(PatternRestrictionSchema).default([]),
    /** Filesystem path patterns the agent must never touch. */
    pathsDeny: z.array(PatternRestrictionSchema).default([]),
    /** URL patterns the agent may reach. */
    urlsAllow: z.array(PatternRestrictionSchema).default([]),
    /** URL patterns the agent must never reach. */
    urlsDeny: z.array(PatternRestrictionSchema).default([]),
  })
  .strict()

/**
 * Path and URL restriction lists for an app rule.
 */
export type Restrictions = z.infer<typeof RestrictionsSchema>

/**
 * An app-name pattern in a rule.
 *
 * The app segment of `app:resource:operation`, or `*` to mean "every app".
 */
export const AppPatternSchema = z
  .string()
  .min(1, 'app must not be empty')
  .regex(
    /^(?:\*|[a-z][a-z0-9_-]*)$/,
    'app must be "*" or a lowercase identifier (alphanumerics, dashes, underscores allowed)'
  )

/**
 * An app pattern: a concrete app name or the `*` wildcard.
 */
export type AppPattern = z.infer<typeof AppPatternSchema>

/**
 * A governance rule scoped to one app (or all apps via `*`).
 *
 * The `disposition` is the app-level default; `operations` carries
 * finer-grained overrides for specific operations. `restrictions` bounds where
 * the app may act (paths/URLs), and `tags` carries app-wide sensitivity labels.
 */
export const AppRuleSchema = z
  .object({
    /** The app this rule targets (a concrete name or `*`). */
    app: AppPatternSchema,
    /** Default disposition for operations on this app. */
    disposition: PolicyDispositionSchema,
    /** Per-operation overrides; the most specific match wins at compile time. */
    operations: z.array(OperationRuleSchema).default([]),
    /** Path/URL boundaries for this app. */
    restrictions: RestrictionsSchema.default({
      pathsAllow: [],
      pathsDeny: [],
      urlsAllow: [],
      urlsDeny: [],
    }),
    /** App-wide sensitivity tags. */
    tags: z.array(SensitivityTagSchema).default([]),
    /** Optional human-readable explanation for this app rule. */
    reason: z.string().min(1).optional(),
  })
  .strict()

/**
 * A single app-scoped governance rule.
 */
export type AppRule = z.infer<typeof AppRuleSchema>

/**
 * The top-level governance policy declaration.
 *
 * A declaration is a list of app rules plus a global `defaultDisposition` that
 * applies to any app/operation no rule covers. Making the default explicit (and
 * defaulting it to the most restrictive `forbidden`) keeps the boundary
 * fail-closed: an operation no rule mentions is denied rather than silently
 * permitted.
 */
export const PolicySchema = z
  .object({
    /**
     * Declaration format version. Fixed at `'1'` for now; bumped if the shape
     * changes incompatibly so older parsers can reject newer files loudly.
     */
    version: z.literal('1').default('1'),
    /**
     * Disposition applied to any app/operation not matched by a rule. Defaults
     * to `forbidden` so the boundary is fail-closed.
     */
    defaultDisposition: PolicyDispositionSchema.default('forbidden'),
    /** The app-scoped governance rules, in declaration order. */
    apps: z.array(AppRuleSchema).default([]),
    /** Global sensitivity tags applied to the whole declaration. */
    tags: z.array(SensitivityTagSchema).default([]),
  })
  .strict()

/**
 * A fully-parsed, validated governance policy declaration.
 *
 * All defaultable fields are present after parsing (defaults applied), so
 * consumers never have to special-case "absent vs. default".
 */
export type GovernancePolicy = z.infer<typeof PolicySchema>

/**
 * A single structured validation issue from {@link parsePolicy}.
 *
 * `path` is the dotted/indexed location of the offending field (e.g.
 * `apps.0.disposition`); `message` is the human-readable reason. This is a
 * stable, serializable shape so callers (CLI, API) can surface errors without
 * depending on Zod's internal error object.
 */
export interface PolicyIssue {
  /** Location of the problem within the input (e.g. `apps.0.operations.1.operation`). */
  readonly path: string
  /** Human-readable description of what is wrong. */
  readonly message: string
}

/**
 * The result of {@link parsePolicy}: a discriminated union of success/failure.
 *
 * Success carries the parsed, defaults-applied {@link GovernancePolicy}; failure
 * carries the structured {@link PolicyIssue} list. Returning a result (rather
 * than throwing) makes this safe to call directly at a trust boundary.
 */
export type ParsePolicyResult =
  | { readonly success: true; readonly data: GovernancePolicy }
  | { readonly success: false; readonly issues: readonly PolicyIssue[] }

/**
 * Convert a Zod issue path (an array of string/number/symbol segments) into a
 * stable dotted string. Symbol segments — which cannot appear for this schema
 * but are part of Zod's path type — are rendered via `String()` so the function
 * is total.
 */
function formatIssuePath(path: readonly PropertyKey[]): string {
  return path
    .map((segment) => (typeof segment === 'symbol' ? segment.toString() : String(segment)))
    .join('.')
}

/**
 * Parse and validate an untrusted value as a governance policy declaration at
 * a trust boundary.
 *
 * Uses Zod's `.safeParse()` so malformed input never throws; instead it returns
 * a structured {@link ParsePolicyResult}. On success the returned
 * {@link GovernancePolicy} has all defaults applied (e.g. `defaultDisposition`
 * becomes `forbidden` when omitted). On failure, every validation problem is
 * reported as a {@link PolicyIssue} with a dotted `path` and a human-readable
 * `message`.
 *
 * This function does NOT compile the declaration to enforcement permissions,
 * resolve rule precedence, or validate that referenced apps/operations exist —
 * those are governed by the open #7 design decision and live elsewhere.
 *
 * @param input - Untrusted candidate declaration (e.g. parsed JSON/YAML).
 * @returns A success result with the parsed declaration, or a failure result
 *   with structured issues.
 */
export function parsePolicy(input: unknown): ParsePolicyResult {
  const result = PolicySchema.safeParse(input)
  if (result.success) {
    return { success: true, data: result.data }
  }
  const issues: PolicyIssue[] = result.error.issues.map((issue) => ({
    path: formatIssuePath(issue.path),
    message: issue.message,
  }))
  return { success: false, issues }
}
