/**
 * Credential verification: turning a presented credential into authority.
 *
 * Verification is the first step of every invocation and the only place a
 * credential becomes an `Authority`. A {@link CredentialVerifier} either
 * returns the caller's authority or throws `AuthenticationError` with a reason
 * from the canonical vocabulary. The default verifier composes the API-key
 * validator and the on-disk key store unchanged; other verifiers exist so the
 * pipeline can be exercised and composed without a key store.
 *
 * @packageDocumentation
 */

import type { ApiKeyPayload, ApiKeyValidationErrorCode } from '@macts/core'
import {
  AuthenticationError,
  type AuthenticationFailureReason,
  type Authority,
  type Credential,
} from '@macts/contracts'
import { validateApiKey } from '../keys/validator.js'

/**
 * Establishes who a caller is from the credential it presented.
 *
 * @remarks
 * `verify` resolves to the caller's `Authority`, or rejects with
 * `AuthenticationError`. Neither the authority nor the error ever contains the
 * secret.
 */
export interface CredentialVerifier {
  /** Verify `credential` and derive the caller's authority. */
  verify(credential: Credential): Promise<Authority>
}

/**
 * The caller-facing explanation for each authentication failure.
 *
 * @remarks
 * Fixed text, so a message can never echo the presented token or a validator's
 * internal error detail.
 */
const AUTHENTICATION_MESSAGES: Readonly<Record<AuthenticationFailureReason, string>> = {
  missing: 'No credential was presented.',
  malformed: 'The credential is not a well-formed macts API key.',
  invalid: 'The credential could not be verified.',
  expired: 'The credential has expired.',
  revoked: 'The credential has been revoked.',
}

/** How each API-key validation failure maps onto the canonical reasons. */
const REASON_BY_VALIDATION_CODE: Readonly<
  Record<ApiKeyValidationErrorCode, AuthenticationFailureReason>
> = {
  INVALID_FORMAT: 'malformed',
  MALFORMED_PAYLOAD: 'malformed',
  INVALID_SIGNATURE: 'invalid',
  EXPIRED: 'expired',
  REVOKED: 'revoked',
}

/** Build the canonical error for an authentication failure. */
function authenticationFailure(reason: AuthenticationFailureReason): AuthenticationError {
  return new AuthenticationError(AUTHENTICATION_MESSAGES[reason], { reason })
}

/**
 * Derive an `Authority` from a verified API-key payload.
 *
 * @remarks
 * Copies only the fields authority is defined by. The payload itself is not
 * retained, so nothing the token carried beyond identity and permissions
 * reaches later pipeline steps.
 */
function authorityFromPayload(payload: ApiKeyPayload): Authority {
  return {
    subject: payload.sub,
    ...(payload.name === undefined ? {} : { displayName: payload.name }),
    permissions: [...payload.permissions],
    ...(payload.exp === undefined ? {} : { expiresAt: new Date(payload.exp * 1000) }),
  }
}

/**
 * The default verifier: macts API keys checked against the local key store.
 *
 * @remarks
 * Delegates to `validateApiKey` for format, signature, expiry, and revocation,
 * and maps its result onto the canonical failure reasons. An empty secret is
 * reported as `missing` without consulting the store.
 *
 * @returns A verifier backed by the signing secret and key database under
 *   `MACTS_HOME`.
 */
export function createKeyStoreVerifier(): CredentialVerifier {
  return {
    async verify(credential: Credential): Promise<Authority> {
      const token = credential.reveal()
      if (token.length === 0) {
        throw authenticationFailure('missing')
      }
      const result = await validateApiKey(token)
      if (!result.valid) {
        throw authenticationFailure(REASON_BY_VALIDATION_CODE[result.errorCode])
      }
      return authorityFromPayload(result.payload)
    },
  }
}
