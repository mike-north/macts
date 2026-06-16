/**
 * API key and base-URL resolution for macts scripting.
 *
 * Resolution strategy follows the same conventions used by the CLI SDK helpers
 * (`@macts/<app>/cli`) so that scripts, CLI commands, and MCP tools all share
 * one canonical lookup order:
 *
 * **API key** (`MACTS_API_KEY` environment variable):
 *   Read from `process.env['MACTS_API_KEY']`. The caller (agent harness, shell,
 *   or test) sets this variable; macts itself never injects it automatically.
 *   If unset, `resolveApiKey()` throws with an actionable message.
 *
 * **Base URL** (`MACTS_API_URL` environment variable):
 *   Read from `process.env['MACTS_API_URL']`. Falls back to the well-known
 *   local-daemon address `http://localhost:8372` when unset. An empty or
 *   whitespace-only value is treated as unset (same principle as `getMactsHome`
 *   in `@macts/api/paths`).
 *
 * @packageDocumentation
 */

/** Default base URL for the macts API server. */
export const DEFAULT_BASE_URL = 'http://localhost:8372'

/**
 * Resolved connection parameters for the macts API server.
 */
export interface MactsConnectionOptions {
  /** Validated API key token (`macts_sk_...`). */
  readonly apiKey: string
  /** Base URL of the macts API server. */
  readonly baseUrl: string
}

/**
 * Resolve the macts API key from the environment.
 *
 * Resolution order:
 * 1. `MACTS_API_KEY` environment variable (non-empty, non-whitespace).
 *
 * @throws {Error} When `MACTS_API_KEY` is not set or is whitespace-only.
 * @returns The API key string.
 */
export function resolveApiKey(): string {
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
  const key = process.env['MACTS_API_KEY']?.trim() || undefined
  if (!key) {
    throw new Error(
      'MACTS_API_KEY environment variable is required.\n' +
        'Create an API key with: macts api-key create --name "<name>" --permission "*:*:*"\n' +
        'Then set it: export MACTS_API_KEY=<token>'
    )
  }
  return key
}

/**
 * Resolve the macts API base URL from the environment.
 *
 * Resolution order:
 * 1. `MACTS_API_URL` environment variable (non-empty, non-whitespace).
 * 2. Default: `http://localhost:8372`.
 *
 * @returns The base URL string (no trailing slash).
 */
export function resolveBaseUrl(): string {
  // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
  const url = process.env['MACTS_API_URL']?.trim() || DEFAULT_BASE_URL
  return url.replace(/\/+$/, '')
}

/**
 * Resolve both the API key and base URL from the environment.
 *
 * Convenience wrapper over {@link resolveApiKey} + {@link resolveBaseUrl}.
 *
 * @throws {Error} When `MACTS_API_KEY` is not set or is whitespace-only.
 * @returns Resolved connection options ready to pass to any `@macts/<app>` client.
 */
export function resolveConnectionOptions(): MactsConnectionOptions {
  return {
    apiKey: resolveApiKey(),
    baseUrl: resolveBaseUrl(),
  }
}
