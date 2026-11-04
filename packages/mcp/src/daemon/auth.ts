/**
 * Transport-level authentication for the MCP daemon's HTTP routes.
 *
 * Every daemon route other than `GET /health` requires a `Bearer` API key
 * before any MCP session is created or reached. This is transport protection,
 * not authorization: it keeps unauthenticated clients from opening sessions,
 * and it hands the request's bearer to the MCP SDK as `AuthInfo`, which the SDK
 * attaches to every message the request carries. Each tool call is then
 * verified again, with permissions, validation, and governance, by the runtime
 * (phases/13 A1, D5). Nothing here grants anything.
 *
 * A refusal is answered with the same structured envelope the HTTP API uses
 * for an unauthenticated call (phases/13 D6):
 * `{ "error": { "code": "UNAUTHENTICATED", "message", "details": { "reason" } } }`.
 *
 * @packageDocumentation
 */

import type { IncomingMessage } from 'node:http'
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js'
import {
  AuthenticationError,
  InternalError,
  toWireErrorEnvelope,
  type WireErrorEnvelope,
} from '@macts/contracts'
import { createBearerCredential, type CredentialVerifier, type RuntimeLogger } from '@macts/runtime'
import { errorLogFields, logSafely } from '../adapter/results.js'

/** `Bearer <token>`, with the scheme matched case-insensitively (RFC 7235). */
const BEARER_AUTHORIZATION = /^Bearer +(\S+) *$/i

/** The outcome of authenticating one daemon request. */
export type DaemonAuthentication =
  | {
      /** The bearer verified. */
      readonly ok: true
      /**
       * The request's bearer, for the MCP SDK to attach to each message the
       * request carries. `clientId` is the verified subject and `scopes` the
       * key's permissions, for information only: the runtime verifies the
       * token again on every tool call.
       */
      readonly authInfo: AuthInfo
    }
  | {
      /** The request is refused before any MCP handling. */
      readonly ok: false
      /** 401 for an unusable credential; 500 when verification itself failed. */
      readonly status: 401 | 500
      /** The structured error envelope to answer with. */
      readonly body: WireErrorEnvelope
    }

/**
 * The bearer token a request presents, or the empty string when it presents
 * none.
 *
 * @remarks
 * Anything but a well-formed `Bearer` header presents no bearer credential,
 * which verification reports as a missing credential, exactly as the HTTP API
 * does.
 */
export function bearerTokenOf(req: IncomingMessage): string {
  const header = req.headers.authorization
  return (header === undefined ? undefined : BEARER_AUTHORIZATION.exec(header))?.[1] ?? ''
}

/**
 * Authenticate one daemon request by its `Authorization: Bearer` header.
 *
 * @param req - The incoming request.
 * @param verifier - Verifies the bearer; the same verification the runtime
 *   performs on each call.
 * @param logger - Where a failure of the verifier itself is logged.
 * @returns The request's `AuthInfo` when the bearer verified; otherwise the
 *   status and structured envelope to answer with. Never rejects, and no
 *   envelope ever contains the token or a verifier's internal error text.
 */
export async function authenticateDaemonRequest(
  req: IncomingMessage,
  verifier: CredentialVerifier,
  logger: RuntimeLogger
): Promise<DaemonAuthentication> {
  const token = bearerTokenOf(req)
  try {
    const authority = await verifier.verify(createBearerCredential(token))
    return {
      ok: true,
      authInfo: {
        token,
        clientId: authority.subject,
        scopes: [...authority.permissions],
        ...(authority.expiresAt === undefined
          ? {}
          : { expiresAt: Math.floor(authority.expiresAt.getTime() / 1000) }),
      },
    }
  } catch (error) {
    if (error instanceof AuthenticationError) {
      return { ok: false, status: 401, body: toWireErrorEnvelope(error) }
    }
    // Verification could not be completed, which is not the caller's fault:
    // fail closed, and keep the original for the operator only.
    logSafely(() => {
      logger.error(
        { err: errorLogFields(error) },
        'Daemon request authentication failed unexpectedly'
      )
    })
    return {
      ok: false,
      status: 500,
      body: toWireErrorEnvelope(new InternalError('Internal server error', {})),
    }
  }
}
