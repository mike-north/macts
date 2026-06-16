/**
 * Active governance policy loading for the API server.
 *
 * The call-time enforcement layer (issue #53) checks every capability call
 * against an *active* `GovernancePolicy`. This module resolves where that
 * policy lives on disk and loads it, with a clearly-documented fail-open default
 * so existing behavior is preserved when no policy is configured.
 *
 * ## Where the active policy lives
 *
 * The policy file is resolved under the shared macts home directory (see
 * `getMactsHome` in `../../paths.js`), at `governance/policy.json`, via the
 * single shared {@link governancePolicyPath} definition in `@macts/core`. That
 * one definition is also used by CLI/MCP discovery, so every macts surface reads
 * the exact same file — they can never drift. The path can be overridden
 * explicitly (tests, custom installs).
 *
 * ## No-policy default (fail-open at this layer)
 *
 * When no policy file exists, {@link loadActivePolicy} returns
 * {@link ALLOW_ALL_POLICY} — a policy whose `defaultDisposition` is `'allowed'`
 * and whose `apps` list is empty. Because nothing is forbidden, enforcement
 * permits every call, exactly preserving pre-governance behavior. This is the
 * deliberate default: governance is an **additional** layer that does nothing
 * until an operator opts in by writing a policy file. The fail-*closed* default
 * (`forbidden`) is a property of an authored policy, not of "no policy at all".
 *
 * A malformed policy file is a configuration error and is surfaced to the
 * caller — it is NOT silently downgraded to allow-all, because doing so would
 * turn a typo in a security policy into a silent security hole.
 *
 * @packageDocumentation
 */

import { readFile } from 'node:fs/promises'
import type { GovernancePolicy } from '@macts/core'
import { parsePolicy, governancePolicyPath } from '@macts/core'
import { getMactsHome } from '../../paths.js'

/**
 * The allow-all policy used when no policy file is configured.
 *
 * `defaultDisposition: 'allowed'` + an empty `apps` list means every capability
 * is permitted, preserving pre-governance behavior. Frozen so it cannot be
 * mutated by a consumer.
 */
export const ALLOW_ALL_POLICY: GovernancePolicy = Object.freeze({
  version: '1',
  defaultDisposition: 'allowed',
  apps: [],
  tags: [],
})

/**
 * Resolve the absolute path to the active governance policy file.
 *
 * Defaults to `<macts-home>/governance/policy.json`, resolved via the shared
 * {@link governancePolicyPath} definition in `@macts/core` so API enforcement
 * and CLI/MCP discovery can never read different files.
 *
 * @returns Absolute path to the policy JSON file.
 */
export function getActivePolicyPath(): string {
  return governancePolicyPath(getMactsHome())
}

/**
 * Error thrown when a configured policy file exists but cannot be parsed as a
 * valid governance policy. Surfaced rather than swallowed so a malformed
 * security policy is never silently treated as allow-all.
 */
export class ActivePolicyError extends Error {
  constructor(
    /** The path the policy was read from. */
    public readonly path: string,
    message: string
  ) {
    super(`Invalid governance policy at "${path}": ${message}`)
    this.name = 'ActivePolicyError'
  }
}

/**
 * Options for {@link loadActivePolicy}.
 */
export interface LoadActivePolicyOptions {
  /**
   * Override the policy file path (tests / custom installs). Defaults to
   * {@link getActivePolicyPath}.
   */
  readonly path?: string
}

/**
 * Load the active governance policy from disk.
 *
 * - If the policy file does not exist, returns {@link ALLOW_ALL_POLICY} (fail
 *   open — preserve existing behavior; governance is opt-in).
 * - If the file exists and parses, returns the parsed `GovernancePolicy`
 *   (with all defaults applied, including the fail-*closed* `defaultDisposition`
 *   the author chose).
 * - If the file exists but is not valid JSON or fails policy validation, throws
 *   {@link ActivePolicyError} — a malformed security policy is a hard error.
 *
 * @param options - Optional path override.
 * @returns The active policy.
 * @throws {@link ActivePolicyError} when the file exists but is malformed.
 */
export async function loadActivePolicy(
  options: LoadActivePolicyOptions = {}
): Promise<GovernancePolicy> {
  const path = options.path ?? getActivePolicyPath()

  let raw: string
  try {
    raw = await readFile(path, 'utf8')
  } catch (error) {
    // ENOENT → no policy configured → fail open (allow-all). Re-throw anything
    // else (permission denied, etc.) so genuine I/O faults aren't masked.
    if (isNodeNotFoundError(error)) {
      return ALLOW_ALL_POLICY
    }
    throw error
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new ActivePolicyError(path, `not valid JSON: ${message}`)
  }

  const result = parsePolicy(parsed)
  if (!result.success) {
    const summary = result.issues.map((i) => `${i.path}: ${i.message}`).join('; ')
    throw new ActivePolicyError(path, summary)
  }
  return result.data
}

/**
 * Narrow an unknown thrown value to a Node `ENOENT` (file-not-found) error.
 */
function isNodeNotFoundError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code === 'ENOENT'
  )
}
