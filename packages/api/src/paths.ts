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
 * 1. The `MACTS_HOME` environment variable, when set to a non-empty,
 *    non-whitespace value (custom installations).
 * 2. `~/.macts`, where the home directory comes from {@link homedir}.
 *
 * An empty or whitespace-only `MACTS_HOME` is treated as **unset** and the
 * default `~/.macts` is used instead. This prevents a set-but-empty variable
 * from producing a cwd-relative path for the signing secret and key database.
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
  // `?.trim()` turns an empty or whitespace-only string into `undefined`/`""`.
  // `||` falls back on any falsy value (empty string included), which is the
  // correct semantic here. `??` would not work: it only catches null/undefined,
  // so `MACTS_HOME=""` would pass through as an empty string and make all
  // derived paths cwd-relative — reintroducing the exact security defect this
  // module was written to prevent.
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
  return process.env['MACTS_HOME']?.trim() || join(homedir(), '.macts')
}
