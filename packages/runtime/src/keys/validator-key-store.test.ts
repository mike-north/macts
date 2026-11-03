/**
 * Integration tests for API-key validation against a real key store.
 *
 * The unit tests in `validator.test.ts` mock the store; these run the
 * validator over a real SQLite key store in a temporary `MACTS_HOME`, so they
 * cover what a mock cannot: that a key is only valid while its stored record
 * exists, and that changing or removing a record through this process's store
 * is seen by the very next validation, despite the per-process status cache.
 *
 * Expected codes follow the documented validation contract: a correctly signed
 * key with no stored record fails with `UNKNOWN_KEY`, a revoked one with
 * `REVOKED`.
 *
 * @see https://www.rfc-editor.org/rfc/rfc7519#section-4.1.2 (JWT `sub`, the key id looked up in the store)
 */

import { rmSync } from 'node:fs'
import { afterAll, describe, expect, it, vi } from 'vitest'
import * as jose from 'jose'
import type { ApiKeyMetadata, ApiKeyPayload } from '@macts/core'
import { createApiKey } from './generator.js'
import {
  addKeyMetadata,
  closeKeyStore,
  deleteKeyMetadata,
  generateKeyId,
  getSigningSecret,
  revokeKey,
  updateKeyMetadata,
} from './storage.js'
import { validateApiKey } from './validator.js'
import { assertValidationFailure, assertValidationSuccess } from './validation-test-helpers.js'

// The key store resolves MACTS_HOME when its module loads, so the temporary
// home must be in place before any import runs.
const { mactsHome } = await vi.hoisted(async () => {
  const fs = await import('node:fs')
  const os = await import('node:os')
  const path = await import('node:path')
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'macts-validator-store-'))
  process.env['MACTS_HOME'] = home
  delete process.env['MACTS_API_KEY_SECRET']
  return { mactsHome: home }
})

afterAll(() => {
  closeKeyStore()
  rmSync(mactsHome, { recursive: true, force: true })
})

/** A fixed issue time: 2026-01-15T10:00:00.000Z, in seconds since the epoch. */
const ISSUED_AT = Date.UTC(2026, 0, 15, 10) / 1000

/**
 * A token signed with this host's signing secret, with a valid payload for
 * `keyId`, that is never written to the key store.
 */
async function signUnstoredToken(keyId: string): Promise<string> {
  const payload: ApiKeyPayload = {
    iss: 'macts',
    sub: keyId,
    iat: ISSUED_AT,
    permissions: ['calendar:events:list'],
  }
  const secret = new TextEncoder().encode(await getSigningSecret())
  const jwt = await new jose.SignJWT(payload as unknown as jose.JWTPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .sign(secret)
  return `macts_sk_${jwt}`
}

/** Metadata for a stored, unrevoked key with id `keyId`. */
function storedMetadata(keyId: string): ApiKeyMetadata {
  return {
    id: keyId,
    name: 'Stored later',
    permissions: ['calendar:events:list'],
    originalPermissions: ['calendar:events:list'],
    createdAt: new Date(ISSUED_AT * 1000),
    expiresAt: undefined,
    revoked: false,
    keyPrefix: 'abcdefgh',
  }
}

/** Mint a stored key and confirm it validates, which also caches its status. */
async function createValidatedKey(name: string): Promise<{ token: string; keyId: string }> {
  const { token, keyId } = await createApiKey({ name, permissions: ['calendar:events:list'] })
  assertValidationSuccess(await validateApiKey(token))
  return { token, keyId }
}

/** Validate `token` and assert it is refused with `code`. */
async function expectRefused(token: string, code: 'UNKNOWN_KEY' | 'REVOKED'): Promise<void> {
  const result = await validateApiKey(token)
  assertValidationFailure(result)
  expect(result.errorCode).toBe(code)
}

describe('validateApiKey against the key store: keys without a stored record', () => {
  it('refuses a deleted key', async () => {
    const { token, keyId } = await createApiKey({
      name: 'Deleted',
      permissions: ['calendar:events:list'],
    })
    expect(deleteKeyMetadata(keyId)).toBe(true)

    await expectRefused(token, 'UNKNOWN_KEY')
  })

  it('refuses a correctly signed key that was never stored', async () => {
    const token = await signUnstoredToken(generateKeyId())

    await expectRefused(token, 'UNKNOWN_KEY')
  })

  it('accepts a key once its record is stored, so a missing record is never cached', async () => {
    const keyId = generateKeyId()
    const token = await signUnstoredToken(keyId)
    await expectRefused(token, 'UNKNOWN_KEY')

    addKeyMetadata(storedMetadata(keyId))

    assertValidationSuccess(await validateApiKey(token))
  })

  it('gives a missing record the same message detail as a revoked one: no key id, no token', async () => {
    const keyId = generateKeyId()
    const token = await signUnstoredToken(keyId)

    const result = await validateApiKey(token)

    assertValidationFailure(result)
    expect(result.error).not.toContain(keyId)
    expect(result.error).not.toContain(token)
  })
})

describe('validateApiKey against the key store: changes in this process are seen on the next call', () => {
  it('refuses a key on the very next call after it is revoked', async () => {
    const { token, keyId } = await createValidatedKey('Revoked after use')

    expect(revokeKey(keyId)).toBe(true)

    await expectRefused(token, 'REVOKED')
  })

  it('refuses a key on the very next call after it is deleted', async () => {
    const { token, keyId } = await createValidatedKey('Deleted after use')

    expect(deleteKeyMetadata(keyId)).toBe(true)

    await expectRefused(token, 'UNKNOWN_KEY')
  })

  it('keeps accepting a renamed key, with the grant its token carries', async () => {
    const { token, keyId } = await createValidatedKey('Renamed after use')

    expect(updateKeyMetadata(keyId, { name: 'Renamed' })?.name).toBe('Renamed')

    const result = await validateApiKey(token)
    assertValidationSuccess(result)
    expect(result.payload.permissions).toEqual(['calendar:events:list'])
  })
})
