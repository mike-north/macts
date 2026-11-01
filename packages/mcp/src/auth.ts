/**
 * API key authentication for the macts MCP server.
 *
 * The MCP server itself has no notion of "logged in" — the only credential is
 * a `macts_sk_`-prefixed API key minted and verified by `@macts/runtime`. This
 * module enforces that a valid key is present at startup (stdio transport) and
 * validates bearer tokens on incoming HTTP requests (daemon transport). The
 * daemon's 401 body keeps its own {@link McpAuthErrorCode} vocabulary, which is
 * not the structured `UNAUTHENTICATED` code (with a `details.reason`) that the
 * `@macts/api` HTTP server answers with.
 *
 * @packageDocumentation
 */

import type { IncomingMessage } from 'node:http'
import type { ApiKeyPayload } from '@macts/core'
import { validateApiKey } from '@macts/runtime'

/**
 * Error codes for authentication failures of the MCP daemon's HTTP transport.
 *
 * These are the key validator's own failure codes plus the two header-shape
 * codes. They are deliberately not the structured error codes of
 * `@macts/contracts` and the `{ error: { code, message, details } }` envelope
 * the `@macts/api` server uses; the daemon does not run through the shared
 * runtime, so callers must not expect the structured vocabulary from it.
 *
 * The daemon also enforces no governance of its own. Its tool handlers call
 * each app's generated HTTP client, so a call is governed by whichever macts
 * server the client reaches.
 *
 * TODO(#101): run MCP tool calls through the shared runtime, with an explicit
 * governance option, and adopt the structured error vocabulary.
 */
export type McpAuthErrorCode =
  | 'MISSING_AUTHORIZATION'
  | 'INVALID_AUTH_SCHEME'
  | 'INVALID_FORMAT'
  | 'INVALID_SIGNATURE'
  | 'EXPIRED'
  | 'REVOKED'
  | 'MALFORMED_PAYLOAD'

/**
 * Result of authenticating an HTTP request against a macts API key.
 *
 * A discriminated union on `ok`: `true` carries the validated payload,
 * `false` carries the exact HTTP response (status + JSON body) the caller
 * should send back.
 */
export type AuthResult =
  | { readonly ok: true; readonly payload: ApiKeyPayload }
  | {
      readonly ok: false
      readonly status: 401
      readonly body: {
        readonly error: { readonly code: McpAuthErrorCode; readonly message: string }
      }
    }

/** Remediation text appended to every startup authentication failure. */
const REMEDIATION = [
  'Create an API key with:',
  '  macts api-key create --name <name> --permission <app:resource:operation>',
  'Then set it in the environment as MACTS_API_KEY before starting the MCP server.',
  'To bypass this check (not recommended), pass --disable-api-key-validation.',
].join('\n')

/**
 * Build the error message shown when `MACTS_API_KEY` is not set.
 */
function buildMissingKeyMessage(): string {
  return `MACTS_API_KEY environment variable is not set.\n${REMEDIATION}`
}

/**
 * Build the error message shown when `MACTS_API_KEY` fails validation.
 *
 * @param reason - Human-readable reason for the failure, derived from
 *   {@link import('@macts/core').ApiKeyValidationResult}'s `errorCode`/`error`.
 */
function buildInvalidKeyMessage(reason: string): string {
  return `MACTS_API_KEY is invalid: ${reason}\n${REMEDIATION}`
}

/**
 * Validate the `MACTS_API_KEY` environment variable at MCP server startup.
 *
 * Intended for the stdio transport, where there is no per-request
 * Authorization header — the server process itself must present a valid key
 * once, at boot. Throws with a remediation-bearing message on any failure;
 * callers (e.g. `createMcpServer`) should let the error propagate so it
 * surfaces to the operator starting the process.
 *
 * @throws Error if `MACTS_API_KEY` is unset or fails validation
 */
export async function requireStartupApiKey(): Promise<void> {
  const token = process.env['MACTS_API_KEY']

  if (!token) {
    throw new Error(buildMissingKeyMessage())
  }

  const result = await validateApiKey(token)

  if (!result.valid) {
    throw new Error(buildInvalidKeyMessage(result.error))
  }
}

/**
 * Authenticate an incoming HTTP request against a macts API key.
 *
 * Reads the `Authorization` header, expects `Bearer <macts_sk_...>`, and
 * validates the token via `@macts/runtime`. Operates on a raw `node:http`
 * `IncomingMessage` so it works outside of Hono (e.g. the MCP daemon's own HTTP
 * handling), and answers failures in the {@link McpAuthErrorCode} vocabulary.
 *
 * @param req - The incoming HTTP request to authenticate
 * @returns A discriminated {@link AuthResult}: `ok: true` with the validated
 *   payload, or `ok: false` with the 401 status and JSON body to send back
 */
export async function authenticateHttpRequest(req: IncomingMessage): Promise<AuthResult> {
  const authHeader = req.headers.authorization

  if (!authHeader) {
    return {
      ok: false,
      status: 401,
      body: {
        error: {
          code: 'MISSING_AUTHORIZATION',
          message: 'Authorization header is required',
        },
      },
    }
  }

  const parts = authHeader.split(' ')
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return {
      ok: false,
      status: 401,
      body: {
        error: {
          code: 'INVALID_AUTH_SCHEME',
          message: 'Authorization header must use Bearer scheme',
        },
      },
    }
  }

  const token = parts[1] ?? ''
  const result = await validateApiKey(token)

  if (!result.valid) {
    return {
      ok: false,
      status: 401,
      body: {
        error: {
          code: result.errorCode,
          message: result.error,
        },
      },
    }
  }

  return { ok: true, payload: result.payload }
}
