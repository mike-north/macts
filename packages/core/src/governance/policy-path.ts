/**
 * Canonical active-policy path resolution for macts.
 *
 * ## Why this module exists
 *
 * The active governance policy file is read from two places at runtime:
 *
 * - **Enforcement** (`@macts/api`): checked at every capability call to decide
 *   allow / deny / confirm-first.
 * - **Discovery** (`@macts/cli`, `@macts/mcp`): checked when listing available
 *   capabilities so that denied capabilities are hidden from agents.
 *
 * Before this module existed each caller hard-coded its own path. The API used
 * `<home>/governance/policy.json`; the CLI used `<home>/policy.json`. A policy
 * placed in one location had no effect on the other, silently undermining
 * governance (issue #79).
 *
 * ## Canonical path
 *
 * The active-policy file lives at:
 *
 * ```
 * <macts-home>/governance/policy.json
 * ```
 *
 * where `<macts-home>` is `$MACTS_HOME` (if set and non-empty) or `~/.macts`.
 *
 * ## Layering convention
 *
 * This module is intentionally **home-agnostic**: it takes `home` as an explicit
 * parameter and never reads `MACTS_HOME` itself. Each surface (`@macts/api`,
 * `@macts/cli`, `@macts/mcp`) keeps its own `getMactsHome()` helper and passes
 * the result in. This keeps the module testable in isolation and prevents hidden
 * environment coupling.
 *
 * @packageDocumentation
 */

import { join } from 'node:path'

/**
 * Resolve the canonical absolute path to the active governance policy file.
 *
 * The file lives at `<home>/governance/policy.json`. Both the enforcement layer
 * (`@macts/api`) and the discovery layer (`@macts/cli`, `@macts/mcp`) MUST call
 * this function — never build the path inline — so that both always read the
 * same file.
 *
 * @param home - The macts home directory as an **absolute** path. Callers
 *   obtain this from their own `getMactsHome()` helper (which uses
 *   `os.homedir()` so it is always absolute). Passing a relative path will
 *   produce a relative result.
 * @returns Absolute path to the active governance policy JSON file (when
 *   `home` is absolute, which it always is when obtained via `getMactsHome()`).
 *
 * @example
 * ```typescript
 * import { resolveActivePolicyPath } from '@macts/core';
 * import { getMactsHome } from './paths.js';
 *
 * const policyPath = resolveActivePolicyPath(getMactsHome());
 * // → "/Users/alice/.macts/governance/policy.json"
 * ```
 */
export function resolveActivePolicyPath(home: string): string {
  return join(home, 'governance', 'policy.json')
}
