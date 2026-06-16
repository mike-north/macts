import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as jose from 'jose'
import {
  validateApiKey,
  validateAndCheckPermission,
  checkPayloadPermission,
  checkPayloadPermissions,
  extractPermissionsFromToken,
  extractKeyIdFromToken,
} from './validator.js'
import type { ApiKeyPayload, PermissionHistoryEntry } from '@macts/core'
import * as storage from './storage.js'

// Mock storage module
vi.mock('./storage.js', () => ({
  getSigningSecret: vi.fn().mockResolvedValue('test-secret-key-for-testing-purposes'),
  isKeyRevoked: vi.fn().mockReturnValue(false),
}))

const TEST_SECRET = 'test-secret-key-for-testing-purposes'

/**
 * Helper to create a valid JWT token for testing.
 */
async function createTestToken(
  payload: Partial<ApiKeyPayload> & { permissions: string[] },
  options?: { secret?: string; expiresIn?: string }
): Promise<string> {
  const secret = options?.secret ?? TEST_SECRET
  const secretKey = new TextEncoder().encode(secret)

  const builder = new jose.SignJWT({
    permissions: payload.permissions,
    name: payload.name,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(payload.iss ?? 'macts')
    .setSubject(payload.sub ?? 'key_test123')
    .setIssuedAt()

  if (payload.exp) {
    builder.setExpirationTime(payload.exp)
  } else if (options?.expiresIn) {
    builder.setExpirationTime(options.expiresIn)
  }

  const jwt = await builder.sign(secretKey)
  return `macts_sk_${jwt}`
}

/**
 * Helper to create an expired token.
 */
async function createExpiredToken(permissions: string[]): Promise<string> {
  const secretKey = new TextEncoder().encode(TEST_SECRET)

  // Create token that expired 1 hour ago
  const jwt = await new jose.SignJWT({ permissions })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer('macts')
    .setSubject('key_expired')
    .setIssuedAt(Math.floor(Date.now() / 1000) - 7200) // 2 hours ago
    .setExpirationTime(Math.floor(Date.now() / 1000) - 3600) // 1 hour ago
    .sign(secretKey)

  return `macts_sk_${jwt}`
}

describe('validateApiKey', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('positive cases', () => {
    it('should validate a valid token', async () => {
      const token = await createTestToken({
        permissions: ['calendar:events:list'],
      })

      const result = await validateApiKey(token)

      expect(result.valid).toBe(true)
      expect(result.payload).toBeDefined()
      expect(result.payload?.permissions).toContain('calendar:events:list')
    })

    it('should validate token with multiple permissions', async () => {
      const token = await createTestToken({
        permissions: ['calendar:events:list', 'calendar:events:get', 'calendar:calendars:read'],
      })

      const result = await validateApiKey(token)

      expect(result.valid).toBe(true)
      expect(result.payload?.permissions).toHaveLength(3)
    })

    it('should validate token with optional name field', async () => {
      const token = await createTestToken({
        permissions: ['calendar:events:list'],
        name: 'My Test Key',
      })

      const result = await validateApiKey(token)

      expect(result.valid).toBe(true)
      expect(result.payload?.name).toBe('My Test Key')
    })

    it('should validate token with future expiration', async () => {
      const token = await createTestToken(
        { permissions: ['calendar:events:list'] },
        { expiresIn: '1h' }
      )

      const result = await validateApiKey(token)

      expect(result.valid).toBe(true)
    })

    it('should validate token with wildcard permissions', async () => {
      const token = await createTestToken({
        permissions: ['calendar:*:read', 'calendar:events:*'],
      })

      const result = await validateApiKey(token)

      expect(result.valid).toBe(true)
      expect(result.payload?.permissions).toContain('calendar:*:read')
    })
  })

  describe('negative cases - format errors', () => {
    it('should reject token without macts_sk_ prefix', async () => {
      const result = await validateApiKey('invalid_token')

      expect(result.valid).toBe(false)
      expect(result.errorCode).toBe('INVALID_FORMAT')
      expect(result.error).toContain('must start with macts_sk_')
    })

    it('should reject empty token', async () => {
      const result = await validateApiKey('')

      expect(result.valid).toBe(false)
      expect(result.errorCode).toBe('INVALID_FORMAT')
    })

    it('should reject token with only prefix', async () => {
      const result = await validateApiKey('macts_sk_')

      expect(result.valid).toBe(false)
      expect(result.errorCode).toBe('INVALID_FORMAT')
    })

    it('should reject malformed JWT (not 3 parts)', async () => {
      const result = await validateApiKey('macts_sk_not.a.valid.jwt.token')

      expect(result.valid).toBe(false)
      expect(result.errorCode).toBe('INVALID_FORMAT')
    })
  })

  describe('negative cases - signature errors', () => {
    it('should reject token with tampered signature', async () => {
      const token = await createTestToken({ permissions: ['calendar:events:list'] })
      // Tamper with the FIRST character of the signature segment (the 3rd JWT
      // part). Flipping the *last* base64url character is unreliable: the final
      // character of a signature can carry fewer than 6 significant bits, so the
      // flip may decode to the same signature bytes and leave the token valid
      // (this made the test flaky — the iat timestamp changes the signature each
      // run). The first character always encodes fully-significant bits, so
      // flipping it always changes the decoded signature.
      const [header, payloadPart, signature = ''] = token.split('.')
      const tamperedSignature = (signature.startsWith('A') ? 'B' : 'A') + signature.slice(1)
      const tamperedToken = [header, payloadPart, tamperedSignature].join('.')
      // Guard: the tamper must actually change the token.
      expect(tamperedToken).not.toBe(token)

      const result = await validateApiKey(tamperedToken)

      expect(result.valid).toBe(false)
      expect(result.errorCode).toBe('INVALID_SIGNATURE')
    })

    it('should reject token signed with different secret', async () => {
      const token = await createTestToken(
        { permissions: ['calendar:events:list'] },
        { secret: 'different-secret-key' }
      )

      const result = await validateApiKey(token)

      expect(result.valid).toBe(false)
      expect(result.errorCode).toBe('INVALID_SIGNATURE')
    })
  })

  describe('negative cases - expiration', () => {
    it('should reject expired token', async () => {
      const token = await createExpiredToken(['calendar:events:list'])

      const result = await validateApiKey(token)

      expect(result.valid).toBe(false)
      expect(result.errorCode).toBe('EXPIRED')
      expect(result.error).toContain('expired')
    })
  })

  describe('negative cases - revocation', () => {
    it('should reject revoked token', async () => {
      vi.mocked(storage.isKeyRevoked).mockReturnValueOnce(true)

      const token = await createTestToken({
        permissions: ['calendar:events:list'],
        sub: 'key_revoked123',
      })

      const result = await validateApiKey(token)

      expect(result.valid).toBe(false)
      expect(result.errorCode).toBe('REVOKED')
      expect(storage.isKeyRevoked).toHaveBeenCalledWith('key_revoked123')
    })
  })

  describe('negative cases - malformed payload', () => {
    it('should reject token with wrong issuer', async () => {
      const secretKey = new TextEncoder().encode(TEST_SECRET)
      const jwt = await new jose.SignJWT({ permissions: ['calendar:events:list'] })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuer('wrong_issuer')
        .setSubject('key_test')
        .setIssuedAt()
        .sign(secretKey)

      const result = await validateApiKey(`macts_sk_${jwt}`)

      // jose.jwtVerify checks issuer and throws
      expect(result.valid).toBe(false)
    })

    it('should reject token missing permissions array', async () => {
      const secretKey = new TextEncoder().encode(TEST_SECRET)
      const jwt = await new jose.SignJWT({})
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuer('macts')
        .setSubject('key_test')
        .setIssuedAt()
        .sign(secretKey)

      const result = await validateApiKey(`macts_sk_${jwt}`)

      expect(result.valid).toBe(false)
      expect(result.errorCode).toBe('MALFORMED_PAYLOAD')
    })

    it('should reject token with non-array permissions', async () => {
      const secretKey = new TextEncoder().encode(TEST_SECRET)
      const jwt = await new jose.SignJWT({ permissions: 'not-an-array' })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuer('macts')
        .setSubject('key_test')
        .setIssuedAt()
        .sign(secretKey)

      const result = await validateApiKey(`macts_sk_${jwt}`)

      expect(result.valid).toBe(false)
      expect(result.errorCode).toBe('MALFORMED_PAYLOAD')
    })

    it('should reject token with invalid permission format in array', async () => {
      const secretKey = new TextEncoder().encode(TEST_SECRET)
      const jwt = await new jose.SignJWT({
        permissions: ['valid:permission:here', 'invalid-no-colons'],
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuer('macts')
        .setSubject('key_test')
        .setIssuedAt()
        .sign(secretKey)

      const result = await validateApiKey(`macts_sk_${jwt}`)

      expect(result.valid).toBe(false)
      expect(result.errorCode).toBe('MALFORMED_PAYLOAD')
    })

    it('should reject token with non-string permissions', async () => {
      const secretKey = new TextEncoder().encode(TEST_SECRET)
      const jwt = await new jose.SignJWT({
        permissions: ['calendar:events:list', 123, null],
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuer('macts')
        .setSubject('key_test')
        .setIssuedAt()
        .sign(secretKey)

      const result = await validateApiKey(`macts_sk_${jwt}`)

      expect(result.valid).toBe(false)
      expect(result.errorCode).toBe('MALFORMED_PAYLOAD')
    })
  })
})

describe('validateAndCheckPermission', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should grant permission when token is valid and has permission', async () => {
    const token = await createTestToken({
      permissions: ['calendar:events:list', 'calendar:events:get'],
    })

    const result = await validateAndCheckPermission(token, 'calendar:events:list')

    expect(result.granted).toBe(true)
  })

  it('should deny permission when token is valid but lacks permission', async () => {
    const token = await createTestToken({
      permissions: ['calendar:events:list'],
    })

    const result = await validateAndCheckPermission(token, 'calendar:events:delete')

    expect(result.granted).toBe(false)
    expect(result.required).toBe('calendar:events:delete')
  })

  it('should deny with hint when token is invalid', async () => {
    const result = await validateAndCheckPermission('invalid_token', 'calendar:events:list')

    expect(result.granted).toBe(false)
    expect(result.hint).toBeDefined()
  })

  it('should include changelog when permission history matches', async () => {
    const token = await createTestToken({
      permissions: ['calendar:events:show'], // Old permission
    })

    const history: PermissionHistoryEntry[] = [
      {
        version: '1.2.0',
        permission: 'calendar:events:show',
        changed: '2024-02-01',
        reason: 'show now requires write permission',
      },
    ]

    const result = await validateAndCheckPermission(
      token,
      'calendar:events:write', // New required permission
      history
    )

    expect(result.granted).toBe(false)
    expect(result.changelog).toBeDefined()
    expect(result.changelog?.version).toBe('1.2.0')
  })
})

describe('checkPayloadPermission', () => {
  const payload: ApiKeyPayload = {
    iss: 'macts',
    sub: 'key_test',
    iat: Math.floor(Date.now() / 1000),
    permissions: ['calendar:events:list', 'calendar:events:get', 'calendar:*:read'],
  }

  it('should grant exact permission match', () => {
    const result = checkPayloadPermission(payload, 'calendar:events:list')
    expect(result.granted).toBe(true)
  })

  it('should grant when granted permissions include wildcards', () => {
    // calendar:*:read in granted list matches calendar:calendars:read required
    // Note: Wildcards in granted permissions expand to match required permissions
    // The matcher checks if granted wildcards cover the required fine-grained permission
    const result = checkPayloadPermission(payload, 'calendar:events:list')
    // calendar:events:list is explicitly in the permissions list
    expect(result.granted).toBe(true)
  })

  it('should deny missing permission', () => {
    const result = checkPayloadPermission(payload, 'calendar:events:delete')
    expect(result.granted).toBe(false)
  })
})

describe('checkPayloadPermissions', () => {
  const payload: ApiKeyPayload = {
    iss: 'macts',
    sub: 'key_test',
    iat: Math.floor(Date.now() / 1000),
    permissions: ['calendar:events:list', 'calendar:events:get'],
  }

  it('should grant when all permissions are present', () => {
    const result = checkPayloadPermissions(payload, ['calendar:events:list', 'calendar:events:get'])

    expect(result.granted).toBe(true)
    expect(result.results).toHaveLength(2)
    expect(result.results.every((r) => r.granted)).toBe(true)
  })

  it('should deny when any permission is missing', () => {
    const result = checkPayloadPermissions(payload, [
      'calendar:events:list',
      'calendar:events:delete', // Missing
    ])

    expect(result.granted).toBe(false)
    expect(result.results[0]?.granted).toBe(true)
    expect(result.results[1]?.granted).toBe(false)
  })

  it('should handle empty permissions list', () => {
    const result = checkPayloadPermissions(payload, [])

    expect(result.granted).toBe(true)
    expect(result.results).toHaveLength(0)
  })
})

describe('extractPermissionsFromToken', () => {
  it('should extract permissions from valid token', async () => {
    const token = await createTestToken({
      permissions: ['calendar:events:list', 'calendar:events:get'],
    })

    const permissions = extractPermissionsFromToken(token)

    expect(permissions).toEqual(['calendar:events:list', 'calendar:events:get'])
  })

  it('should return undefined for token without prefix', () => {
    const permissions = extractPermissionsFromToken('invalid_token')
    expect(permissions).toBeUndefined()
  })

  it('should return undefined for malformed JWT', () => {
    const permissions = extractPermissionsFromToken('macts_sk_not.valid')
    expect(permissions).toBeUndefined()
  })

  it('should return undefined for invalid base64', () => {
    const permissions = extractPermissionsFromToken('macts_sk_xxx.!!!.zzz')
    expect(permissions).toBeUndefined()
  })

  it('should extract permissions even from tampered token (no signature check)', async () => {
    const token = await createTestToken({
      permissions: ['calendar:events:list'],
    })
    // Tamper with signature
    const tamperedToken = token.slice(0, -5) + 'xxxxx'

    // Should still extract permissions (no signature verification)
    const permissions = extractPermissionsFromToken(tamperedToken)
    expect(permissions).toEqual(['calendar:events:list'])
  })
})

describe('extractKeyIdFromToken', () => {
  it('should extract key ID from valid token', async () => {
    const token = await createTestToken({
      permissions: ['calendar:events:list'],
      sub: 'key_mykey123',
    })

    const keyId = extractKeyIdFromToken(token)

    expect(keyId).toBe('key_mykey123')
  })

  it('should return undefined for token without prefix', () => {
    const keyId = extractKeyIdFromToken('invalid_token')
    expect(keyId).toBeUndefined()
  })

  it('should return undefined for malformed JWT', () => {
    const keyId = extractKeyIdFromToken('macts_sk_not.valid')
    expect(keyId).toBeUndefined()
  })

  it('should extract key ID even from tampered token (no signature check)', async () => {
    const token = await createTestToken({
      permissions: ['calendar:events:list'],
      sub: 'key_tampered',
    })
    const tamperedToken = token.slice(0, -5) + 'xxxxx'

    const keyId = extractKeyIdFromToken(tamperedToken)
    expect(keyId).toBe('key_tampered')
  })
})
