/**
 * Active-policy loader for the `macts capabilities` commands.
 *
 * Loads the governance policy from `$MACTS_HOME/governance/policy.json` (when
 * the file exists) and constructs a {@link GovernanceFilter} from it. When no
 * policy file is present the no-op {@link ALLOW_ALL_GOVERNANCE} pass-through is
 * returned so discovery behaviour is unchanged for users who have not
 * configured a policy.
 *
 * ## Canonical path
 *
 * The active-policy path is resolved by {@link resolveActivePolicyPath} from
 * `@macts/core`. The enforcement layer (`@macts/api`) uses the same resolver,
 * so both always read the same file (issue #79).
 *
 * ## Errors
 *
 * If the policy file exists but is malformed or invalid, the error is written
 * to `stderr` and the function returns `ALLOW_ALL_GOVERNANCE` (degrading
 * gracefully rather than blocking all discovery). The caller owns the
 * `stderr` stream and must pass it in.
 *
 * @packageDocumentation
 */

import {
  ALLOW_ALL_GOVERNANCE,
  loadPolicyFromFile,
  createPolicyGovernanceFilter,
  resolveActivePolicyPath,
  type GovernanceFilter,
} from '@macts/core'
import { getMactsHome } from '../../plugin/paths.js'

/**
 * The canonical location of the active governance policy file.
 *
 * Delegates to {@link resolveActivePolicyPath} (from `@macts/core`) so that
 * discovery always reads the same file as enforcement (issue #79).
 *
 * Resolves to `$MACTS_HOME/governance/policy.json`, honouring the `MACTS_HOME`
 * environment variable (falls back to `~/.macts`).
 */
export function getPolicyFilePath(): string {
  return resolveActivePolicyPath(getMactsHome())
}

/**
 * Load the active governance filter for capability discovery.
 *
 * Tries to load `$MACTS_HOME/governance/policy.json`. Returns:
 * - A policy-backed {@link GovernanceFilter} when the file exists and is valid.
 * - {@link ALLOW_ALL_GOVERNANCE} when no file is found (policy is optional).
 * - {@link ALLOW_ALL_GOVERNANCE} when the file is found but invalid, after
 *   writing a warning to `stderr`.
 *
 * @param stderr - Stream to write warnings to (typically `process.stderr` or
 *   a Clipanion command's `context.stderr`).
 * @returns The active governance filter.
 */
export async function loadActiveGovernanceFilter(
  stderr: NodeJS.WritableStream
): Promise<GovernanceFilter> {
  const policyPath = getPolicyFilePath()
  const result = await loadPolicyFromFile(policyPath)

  if (!result.found) {
    // No policy configured — discovery is unrestricted.
    return ALLOW_ALL_GOVERNANCE
  }

  if ('error' in result) {
    // Policy file found but invalid — warn and degrade gracefully.
    stderr.write(`[governance] Warning: ${result.error}\n`)
    stderr.write(`[governance] Continuing with allow-all filter.\n`)
    return ALLOW_ALL_GOVERNANCE
  }

  return createPolicyGovernanceFilter(result.policy)
}
