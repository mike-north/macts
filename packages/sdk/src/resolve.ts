/**
 * Connection options for the remote client, resolved from the environment.
 *
 * Scripts, CLI commands, and MCP tools share one lookup order, so a script can
 * call `createClient(app, resolveClientOptions())` and connect to the same
 * service with the same key as every other macts surface:
 *
 * **Token** (`MACTS_API_KEY` environment variable):
 *   Read from `process.env['MACTS_API_KEY']`. The caller (agent harness, shell,
 *   or test) sets this variable; macts itself never injects it automatically.
 *   If unset, `resolveApiKey()` throws with an actionable message.
 *
 * **Service URL** (`MACTS_API_URL` environment variable):
 *   Read from `process.env['MACTS_API_URL']`. Falls back to the well-known
 *   local-daemon address `http://localhost:8372` when unset. An empty or
 *   whitespace-only value is treated as unset (same principle as `getMactsHome`
 *   in `@macts/runtime`).
 *
 * @packageDocumentation
 */

import type { RemoteClientOptions } from './remote.js'

/** Default base URL for the macts API server. */
export const DEFAULT_BASE_URL = 'http://localhost:8372'

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
 * Resolve the remote client's token and service URL from the environment.
 *
 * Convenience wrapper over {@link resolveApiKey} and {@link resolveBaseUrl}.
 *
 * @throws {Error} When `MACTS_API_KEY` is not set or is whitespace-only.
 * @returns Options ready to pass to `createClient`.
 */
export function resolveClientOptions(): RemoteClientOptions {
  return {
    token: resolveApiKey(),
    url: resolveBaseUrl(),
  }
}
