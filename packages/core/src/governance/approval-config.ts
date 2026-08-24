/**
 * Registration declaration for the HITL approval provider.
 *
 * ## Why registration is explicit
 *
 * Approval providers are installed the same way every other macts plugin is —
 * as packages under `<macts-home>/plugins` — but they are **not** discovered by
 * scanning that directory. CLI and MCP plugins are additive: an extra one adds
 * commands or tools. The approval provider is the opposite kind of thing: it is
 * the single authority that decides whether a held call runs. Auto-activating
 * whatever happens to be installed would mean a transitive package install
 * could silently become the approver.
 *
 * So the operator names exactly one provider package in a declaration file, and
 * that package is resolved from the shared plugins directory. Same install
 * mechanism, same resolution root, explicit opt-in.
 *
 * ## Where the declaration lives
 *
 * ```text
 * <macts-home>/governance/approval.json
 * ```
 *
 * alongside the active policy (`<macts-home>/governance/policy.json`). It is a
 * separate file from the policy on purpose: the policy declares *what needs a
 * human*, the registration declares *which human channel to ask*. An operator
 * swapping approval channels should not have to touch the security policy.
 *
 * **No file, no provider.** An absent declaration means no approval channel is
 * configured, and `confirm-first` calls keep their existing held-pending
 * behavior rather than being auto-approved.
 *
 * ## Layering convention
 *
 * Like {@link ./policy-path.js}, {@link resolveApprovalConfigPath} takes `home`
 * as an explicit parameter and never reads `MACTS_HOME` itself — each surface
 * passes in its own `getMactsHome()` result.
 *
 * @packageDocumentation
 */

import { join } from 'node:path'
import { z } from 'zod'
import { DEFAULT_APPROVAL_TIMEOUT_MS } from './approval.js'

/**
 * Upper bound on a configured approval timeout: one hour.
 *
 * A held call occupies an in-flight request, so an unbounded timeout would let
 * a forgotten prompt pin server resources indefinitely. An operator who needs
 * longer than this wants asynchronous approval, not a longer synchronous wait.
 */
export const MAX_APPROVAL_TIMEOUT_MS = 3_600_000

/**
 * Schema for the approval-provider registration declaration.
 */
export const ApprovalConfigSchema = z
  .object({
    /**
     * Declaration format version. Fixed at `'1'`; bumped if the shape changes
     * incompatibly so older parsers reject newer files loudly.
     */
    version: z.literal('1').default('1'),
    /**
     * Package name of the approval provider to load, resolved from the shared
     * plugins directory (e.g. `'@example/macts-approval'`).
     */
    provider: z.string().trim().min(1, 'provider package name must not be empty'),
    /**
     * Bound, in milliseconds, within which a human decision must arrive. Past
     * it the held call is denied (fail-closed).
     */
    timeoutMs: z
      .number()
      .int()
      .positive()
      .max(MAX_APPROVAL_TIMEOUT_MS)
      .default(DEFAULT_APPROVAL_TIMEOUT_MS),
    /**
     * Opaque provider-specific settings, passed through to the provider's
     * factory untouched. macts does not interpret these — an account id, a
     * relay URL, and a device name are all the provider's business.
     */
    options: z.record(z.string(), z.unknown()).default({}),
  })
  .strict()

/**
 * A fully-parsed, validated approval-provider registration.
 *
 * All defaultable fields are present after parsing, so consumers never have to
 * special-case "absent vs. default".
 */
export type ApprovalConfig = z.infer<typeof ApprovalConfigSchema>

/**
 * A single structured validation issue from {@link parseApprovalConfig}.
 *
 * Mirrors the policy parser's issue shape: `path` is the dotted location of the
 * offending field, `message` is the human-readable reason.
 */
export interface ApprovalConfigIssue {
  /** Location of the problem within the input (e.g. `timeoutMs`). */
  readonly path: string
  /** Human-readable description of what is wrong. */
  readonly message: string
}

/**
 * The result of {@link parseApprovalConfig}: a discriminated union of
 * success/failure. Returning a result (rather than throwing) makes this safe to
 * call directly at a trust boundary.
 */
export type ParseApprovalConfigResult =
  | { readonly success: true; readonly data: ApprovalConfig }
  | { readonly success: false; readonly issues: readonly ApprovalConfigIssue[] }

/**
 * Convert a Zod issue path into a stable dotted string.
 */
function formatIssuePath(path: readonly PropertyKey[]): string {
  return path
    .map((segment) => (typeof segment === 'symbol' ? segment.toString() : String(segment)))
    .join('.')
}

/**
 * Parse and validate an untrusted value as an approval-provider registration.
 *
 * @param input - Untrusted candidate declaration (e.g. parsed JSON).
 * @returns A success result with the parsed declaration, or a failure result
 *   with structured issues.
 */
export function parseApprovalConfig(input: unknown): ParseApprovalConfigResult {
  const result = ApprovalConfigSchema.safeParse(input)
  if (result.success) {
    return { success: true, data: result.data }
  }
  const issues: ApprovalConfigIssue[] = result.error.issues.map((issue) => ({
    path: formatIssuePath(issue.path),
    message: issue.message,
  }))
  return { success: false, issues }
}

/**
 * Resolve the canonical absolute path to the approval-provider registration
 * file (`<home>/governance/approval.json`).
 *
 * Every surface MUST call this rather than building the path inline, so a
 * declaration written by one surface is read by all of them.
 *
 * @param home - The macts home directory as an **absolute** path, obtained from
 *   the caller's own `getMactsHome()` helper.
 * @returns Absolute path to the approval registration JSON file.
 *
 * @example
 * ```typescript
 * import { resolveApprovalConfigPath } from '@macts/core';
 * import { getMactsHome } from './paths.js';
 *
 * const configPath = resolveApprovalConfigPath(getMactsHome());
 * // → "/Users/alice/.macts/governance/approval.json"
 * ```
 */
export function resolveApprovalConfigPath(home: string): string {
  return join(home, 'governance', 'approval.json')
}
