/**
 * Single source of truth for where the active governance policy lives on disk.
 *
 * Every macts surface that reads the policy — API call-time enforcement, CLI
 * capability discovery, and the MCP discovery tool — must resolve the **same**
 * file, or a user's configured policy would be honoured by one surface and
 * ignored by another (a split-brain). To make that impossible, the relative
 * location is defined exactly once here and consumed everywhere.
 *
 * ## Layering convention
 *
 * This module is deliberately home-directory-agnostic: it defines the path
 * *relative to* the macts home directory and never reads `MACTS_HOME` itself.
 * Callers pass in their resolved home directory (e.g. from `getMactsHome()`),
 * which keeps this module pure and testable while ensuring the relative segment
 * is shared.
 *
 * @packageDocumentation
 */

import { join } from 'node:path'

/**
 * The active governance policy file location, relative to the macts home
 * directory. Governance artifacts are grouped under `governance/`, so the
 * policy lives at `<macts-home>/governance/policy.json`.
 *
 * This is the canonical relative path; resolve it against a home directory with
 * {@link governancePolicyPath}.
 */
export const GOVERNANCE_POLICY_RELATIVE_PATH = 'governance/policy.json'

/**
 * Resolve the absolute path to the active governance policy file under a macts
 * home directory.
 *
 * @param home - The macts home directory (e.g. the result of `getMactsHome()`).
 * @returns The absolute path `<home>/governance/policy.json`.
 */
export function governancePolicyPath(home: string): string {
  return join(home, GOVERNANCE_POLICY_RELATIVE_PATH)
}
