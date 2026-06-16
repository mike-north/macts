/**
 * Filesystem path resolution for macts configuration and data.
 *
 * Mirrors the resolution strategy used by the CLI and MCP plugin loaders
 * (`@macts/cli` and `@macts/mcp` `plugin/paths.ts`) so that every macts
 * surface agrees on where configuration, plugins, signing secrets, and the
 * API-key database live. Keeping these in sync prevents silent "split-brain"
 * state where, for example, plugins resolve under `MACTS_HOME` but secrets do
 * not.
 *
 * @packageDocumentation
 */

import { homedir } from 'node:os'
import { join } from 'node:path'

/**
 * Get the base directory for macts configuration and data.
 *
 * Resolution order:
 * 1. The `MACTS_HOME` environment variable, when set (custom installations).
 * 2. `~/.macts`, where the home directory comes from {@link homedir}.
 *
 * `os.homedir()` is used deliberately instead of `process.env['HOME']`: it is
 * platform-correct and never returns an empty string or the literal `~` when
 * `HOME` is unset (e.g. cron, containers, CI, some service managers). Using
 * `process.env['HOME'] ?? '~'` would yield a *cwd-relative* `./~/.macts`,
 * writing the signing secret and key database wherever the process happens to
 * run — a security risk for secret material.
 *
 * @returns Absolute path to the macts home directory
 *
 * @defaultValue `~/.macts`
 */
export function getMactsHome(): string {
  return process.env['MACTS_HOME'] ?? join(homedir(), '.macts')
}
