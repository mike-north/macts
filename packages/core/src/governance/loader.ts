/**
 * Governance policy loader: reads and validates a policy declaration from disk.
 *
 * The policy declaration is stored as a JSON file at a well-known location —
 * by convention `$MACTS_HOME/policy.json` (where `MACTS_HOME` defaults to
 * `~/.macts`). This module provides a pure file-to-{@link GovernancePolicy}
 * pipeline: read → JSON.parse → {@link parsePolicy}.
 *
 * ## Layering convention
 *
 * This module uses `node:fs/promises` directly and accepts the file **path as
 * an explicit parameter** — it never reads `MACTS_HOME` itself. Callers
 * (CLI, MCP server root, `@macts/api`) are responsible for constructing the
 * conventional default path from `MACTS_HOME` and passing it in. This keeps the
 * module testable with any temp file and prevents hidden environment coupling.
 *
 * ## Errors vs. absence
 *
 * - **File absent** (`ENOENT`): returns `{ found: false }` — absence is
 *   normal; most users don't have a policy file yet.
 * - **File present but unreadable / unparseable / invalid**: returns
 *   `{ found: true, error: ... }` — the file exists but we cannot use it;
 *   the caller should surface the error and fall back to allow-all.
 * - **File present and valid**: returns `{ found: true, policy: ... }`.
 *
 * @packageDocumentation
 */

import { readFile } from 'node:fs/promises'
import { parsePolicy } from './policy.js'
import type { GovernancePolicy, PolicyIssue } from './policy.js'

/**
 * The result of attempting to load a governance policy from disk.
 *
 * A discriminated union that distinguishes "no policy configured" (expected)
 * from "policy file found but invalid" (unexpected, caller should warn) from
 * "policy loaded and valid".
 */
export type LoadPolicyResult =
  | {
      /** No policy file found at the given path (normal — policy is optional). */
      readonly found: false
    }
  | {
      /** Policy file found but could not be loaded or validated. */
      readonly found: true
      /** Human-readable reason the file could not be loaded (I/O or parse error). */
      readonly error: string
      /** Structured validation issues, if the file was readable but invalid. */
      readonly issues?: readonly PolicyIssue[]
    }
  | {
      /** Policy file found and successfully parsed. */
      readonly found: true
      /** The validated, defaults-applied governance policy. */
      readonly policy: GovernancePolicy
    }

/**
 * Load and validate a governance policy from a JSON file at `path`.
 *
 * The caller is responsible for constructing `path` (e.g. from
 * `getMactsHome()`). This function never reads `MACTS_HOME` itself.
 *
 * @param path - Absolute path to the JSON policy file.
 * @returns A {@link LoadPolicyResult} describing the outcome.
 */
export async function loadPolicyFromFile(path: string): Promise<LoadPolicyResult> {
  let raw: string
  try {
    raw = await readFile(path, { encoding: 'utf8' })
  } catch (err) {
    if (isNodeError(err) && err.code === 'ENOENT') {
      return { found: false }
    }
    const message = err instanceof Error ? err.message : String(err)
    return { found: true, error: `Could not read policy file at ${path}: ${message}` }
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw) as unknown
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return { found: true, error: `Policy file at ${path} is not valid JSON: ${message}` }
  }

  const result = parsePolicy(parsed)
  if (!result.success) {
    const summary = result.issues.map((i) => `${i.path}: ${i.message}`).join('; ')
    return {
      found: true,
      error: `Policy file at ${path} is invalid: ${summary}`,
      issues: result.issues,
    }
  }

  return { found: true, policy: result.data }
}

/**
 * Narrowing helper for Node.js `ErrnoException`s.
 *
 * `node:fs` errors carry a `code` property; this guard lets us check for
 * `ENOENT` without depending on Node types at the call site.
 */
function isNodeError(err: unknown): err is { code: string } {
  return typeof err === 'object' && err !== null && 'code' in err
}
