import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  createApiKey,
  createApiKeySimple,
  createFullAccessKey,
  createReadOnlyKey,
} from './generator.js'
import type { PermissionsSection } from '@macts/core'
import * as storage from './storage.js'

// Mock storage module
vi.mock('./storage.js', async () => {
  const actual = await vi.importActual<typeof storage>('./storage.js')
  return {
    ...actual,
    getSigningSecret: vi.fn().mockResolvedValue('test-secret-key-for-testing'),
    addKeyMetadata: vi.fn().mockResolvedValue(undefined),
    generateKeyId: vi.fn().mockReturnValue('key_test123'),
  }
})

// Test fixture - permissions section
const testPermissions: PermissionsSection = {
  events: {
    read: ['calendar:events:list', 'calendar:events:get'],
    create: ['calendar:events:create'],
    write: ['calendar:events:update'],
    delete: ['calendar:events:delete'],
  },
  calendars: {
    read: ['calendar:calendars:list', 'calendar:calendars:get'],
  },
}

describe('createApiKey', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('positive cases', () => {
    it('should create key with fine-grained permissions', async () => {
      const result = await createApiKey(
        {
          name: 'Test Key',
          permissions: ['calendar:events:list'],
        },
        testPermissions
      )

      expect(result.token).toMatch(/^macts_sk_/)
      expect(result.keyId).toBe('key_test123')
      expect(result.metadata.name).toBe('Test Key')
      expect(result.metadata.permissions).toContain('calendar:events:list')
    })

    it('should expand coarse permissions at creation', async () => {
      const result = await createApiKey(
        {
          name: 'Read Key',
          permissions: ['calendar:events:read'],
        },
        testPermissions
      )

      expect(result.metadata.permissions).toContain('calendar:events:list')
      expect(result.metadata.permissions).toContain('calendar:events:get')
      expect(result.metadata.originalPermissions).toEqual(['calendar:events:read'])
    })

    it('should expand wildcard permissions', async () => {
      const result = await createApiKey(
        {
          name: 'Full Read Key',
          permissions: ['calendar:*:read'],
        },
        testPermissions
      )

      expect(result.metadata.permissions).toContain('calendar:events:list')
      expect(result.metadata.permissions).toContain('calendar:calendars:list')
    })

    it('should handle expiration', async () => {
      const result = await createApiKey(
        {
          name: 'Expiring Key',
          permissions: ['calendar:events:list'],
          expires: '1d',
        },
        testPermissions
      )

      expect(result.metadata.expiresAt).toBeDefined()
      expect(result.metadata.expiresAt?.getTime()).toBeGreaterThan(Date.now())
    })

    it('should handle Date expiration', async () => {
      const futureDate = new Date(Date.now() + 86400000)
      const result = await createApiKey(
        {
          name: 'Date Expiring Key',
          permissions: ['calendar:events:list'],
          expires: futureDate,
        },
        testPermissions
      )

      expect(result.metadata.expiresAt).toBeDefined()
      // Expiration is stored as Unix seconds, so milliseconds are truncated
      const expectedSeconds = Math.floor(futureDate.getTime() / 1000)
      expect(Math.floor((result.metadata.expiresAt?.getTime() ?? 0) / 1000)).toBe(expectedSeconds)
    })

    it('should store metadata', async () => {
      await createApiKey(
        {
          name: 'Stored Key',
          permissions: ['calendar:events:list'],
        },
        testPermissions
      )

      expect(storage.addKeyMetadata).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Stored Key',
          revoked: false,
        })
      )
    })
  })

  describe('without permissions section', () => {
    it('should keep permissions as-is without mapping', async () => {
      const result = await createApiKeySimple({
        name: 'Simple Key',
        permissions: ['calendar:events:custom'],
      })

      expect(result.metadata.permissions).toEqual(['calendar:events:custom'])
    })
  })
})

describe('createFullAccessKey', () => {
  it('should create key with full wildcard', async () => {
    const result = await createFullAccessKey('calendar', 'Full Access')

    expect(result.metadata.permissions).toContain('calendar:*:*')
    expect(result.metadata.name).toBe('Full Access')
  })

  it('should handle expiration', async () => {
    const result = await createFullAccessKey('calendar', 'Temp Full', '1h')

    expect(result.metadata.expiresAt).toBeDefined()
  })
})

describe('createReadOnlyKey', () => {
  it('should create key with read permissions only', async () => {
    const result = await createReadOnlyKey('calendar', 'Read Only', testPermissions)

    expect(result.metadata.originalPermissions).toEqual(['calendar:*:read'])
    // Expanded permissions should all be read operations
    for (const perm of result.metadata.permissions) {
      expect(perm.includes(':list') || perm.includes(':get') || perm.includes(':read')).toBe(true)
    }
  })
})
