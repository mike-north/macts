/**
 * Integration tests for the key-store credential verifier.
 *
 * Runs against a real key store in a temporary `MACTS_HOME`: keys are minted
 * with `createApiKey`, revoked with `revokeKey`, and verified through the
 * unchanged `validateApiKey`. Expected reasons come from the phases/13 D5
 * pipeline table: `missing`, `malformed` (`INVALID_FORMAT`,
 * `MALFORMED_PAYLOAD`), `invalid` (`INVALID_SIGNATURE`, and `UNKNOWN_KEY` for a
 * correctly signed key with no stored record), `expired`, `revoked`.
 *
 * @see https://www.rfc-editor.org/rfc/rfc7519#section-4.1.4 (JWT `exp`, seconds since the epoch)
 */

import { existsSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { afterAll, describe, expect, it, vi } from 'vitest'
import * as jose from 'jose'
import { AuthenticationError, type AuthenticationFailureReason } from '@macts/contracts'
import { createApiKey } from '../keys/generator.js'
import { closeKeyStore, deleteKeyMetadata, getSigningSecret, revokeKey } from '../keys/storage.js'
import { validateApiKey } from '../keys/validator.js'
import { assertValidationFailure } from '../keys/validation-test-helpers.js'
import { createBearerCredential } from './credential.js'
import { createKeyStoreVerifier } from './verifier.js'

// The key store resolves MACTS_HOME when its module loads, so the temporary
// home must be in place before any import runs.
const { mactsHome } = await vi.hoisted(async () => {
  const fs = await import('node:fs')
  const os = await import('node:os')
  const path = await import('node:path')
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'macts-verifier-'))
  process.env['MACTS_HOME'] = home
  delete process.env['MACTS_API_KEY_SECRET']
  return { mactsHome: home }
})

afterAll(() => {
  closeKeyStore()
  rmSync(mactsHome, { recursive: true, force: true })
})

/** A fixed, far-future expiry: 2099-01-01T00:00:00.000Z. */
const FAR_FUTURE = new Date('2099-01-01T00:00:00.000Z')

/** Sign a JWT with arbitrary claims and present it as a macts key. */
async function signToken(claims: jose.JWTPayload, secret: string): Promise<string> {
  const jwt = await new jose.SignJWT(claims)
    .setProtectedHeader({ alg: 'HS256' })
    .sign(new TextEncoder().encode(secret))
  return `macts_sk_${jwt}`
}

/** Verify `token` and return the thrown AuthenticationError. */
async function expectAuthenticationFailure(
  token: string,
  reason: AuthenticationFailureReason
): Promise<AuthenticationError> {
  const verifier = createKeyStoreVerifier()
  const error: unknown = await verifier.verify(createBearerCredential(token)).then(
    () => undefined,
    (thrown: unknown) => thrown
  )
  expect(error).toBeInstanceOf(AuthenticationError)
  if (!(error instanceof AuthenticationError)) throw new Error('unreachable')
  expect(error.details).toEqual({ reason })
  // No failure ever echoes the presented token.
  if (token.length > 0) {
    expect(error.message).not.toContain(token)
    expect(JSON.stringify(error)).not.toContain(token)
    expect(JSON.stringify(error.details)).not.toContain(token)
  }
  return error
}

describe('createKeyStoreVerifier', () => {
  it('derives authority from a valid key: subject, display name, permissions, expiry', async () => {
    const created = await createApiKey({
      name: 'Calendar reader',
      permissions: ['calendar:events:list'],
      expires: FAR_FUTURE,
    })

    const authority = await createKeyStoreVerifier().verify(createBearerCredential(created.token))

    expect(authority).toEqual({
      subject: created.keyId, // D5: subject is the payload `sub`, the key id
      displayName: 'Calendar reader', // D5: displayName from the payload `name`
      permissions: ['calendar:events:list'],
      expiresAt: FAR_FUTURE, // exp (seconds) → Date
    })
    // The key landed in the temporary home, not the real one.
    expect(existsSync(join(mactsHome, 'api-keys.db'))).toBe(true)
  })

  it('omits expiresAt for a key that never expires, and keeps the token out of authority', async () => {
    const created = await createApiKey({ name: 'Forever', permissions: ['notes:notes:list'] })

    const authority = await createKeyStoreVerifier().verify(createBearerCredential(created.token))

    expect(authority).toEqual({
      subject: created.keyId,
      displayName: 'Forever',
      permissions: ['notes:notes:list'],
    })
    expect(JSON.stringify(authority)).not.toContain(created.token)
  })

  it('reports an empty secret as missing', async () => {
    await expectAuthenticationFailure('', 'missing')
  })

  it('reports a token without the macts prefix (INVALID_FORMAT) as malformed', async () => {
    await expectAuthenticationFailure('sk_live_definitely-not-a-macts-key', 'malformed')
  })

  it('reports a correctly signed token with a malformed payload (MALFORMED_PAYLOAD) as malformed', async () => {
    const secret = await getSigningSecret()
    const token = await signToken({ iss: 'macts', sub: 'key_bad', iat: 1_700_000_000 }, secret)
    // Sanity: this is the validator's MALFORMED_PAYLOAD path, not some other failure.
    const validation = await validateApiKey(token)
    assertValidationFailure(validation)
    expect(validation.errorCode).toBe('MALFORMED_PAYLOAD')

    await expectAuthenticationFailure(token, 'malformed')
  })

  it('reports a token signed with another secret (INVALID_SIGNATURE) as invalid', async () => {
    const token = await signToken(
      { iss: 'macts', sub: 'key_forged', iat: 1_700_000_000, permissions: ['*:*:*'] },
      'not-the-signing-secret'
    )
    await expectAuthenticationFailure(token, 'invalid')
  })

  it('reports an expired token as expired', async () => {
    const secret = await getSigningSecret()
    // Expired 2001-09-09T01:46:40Z.
    const token = await signToken(
      {
        iss: 'macts',
        sub: 'key_old',
        iat: 999_000_000,
        exp: 1_000_000_000,
        permissions: ['calendar:events:list'],
      },
      secret
    )
    await expectAuthenticationFailure(token, 'expired')
  })

  it('reports a revoked key as revoked', async () => {
    const created = await createApiKey({ name: 'Revoked', permissions: ['calendar:events:list'] })
    expect(revokeKey(created.keyId)).toBe(true)

    await expectAuthenticationFailure(created.token, 'revoked')
  })

  it('reports a deleted key (UNKNOWN_KEY) as invalid', async () => {
    const created = await createApiKey({ name: 'Deleted', permissions: ['calendar:events:list'] })
    expect(deleteKeyMetadata(created.keyId)).toBe(true)

    await expectAuthenticationFailure(created.token, 'invalid')
  })
})
