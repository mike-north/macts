/**
 * Tests for API key creation.
 *
 * @see phases/13-sdk-value-and-execution-contracts.md (D2)
 * @see https://github.com/mike-north/macts/issues/153
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  createApiKey,
  createApiKeySimple,
  createFullAccessKey,
  createReadOnlyKey,
  PermissionCaseMismatchError,
} from './generator.js'
import { PermissionExpansionError, PermissionParseError } from '@macts/core'
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

describe('createApiKey permission validation (issue #153)', () => {
  const PHOTOS_KNOWN = ['photos:mediaItems:list', 'photos:mediaItems:get', 'photos:albums:list']

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('accepts camelCase resource and operation permissions', async () => {
    const result = await createApiKey({
      name: 'camel',
      permissions: ['photos:mediaItems:list', 'iterm:sessions:splitVertically'],
    })
    expect(result.metadata.permissions).toEqual([
      'photos:mediaItems:list',
      'iterm:sessions:splitVertically',
    ])
  })

  it('rejects a malformed permission without a manifest, stating the rule and an example', async () => {
    const error: unknown = await createApiKey({
      name: 'bad',
      permissions: ['photos:MediaItems:list'],
    }).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(PermissionParseError)
    expect((error as Error).message).toContain('camelCase')
    expect((error as Error).message).toContain('"photos:mediaItems:list"')
    expect((error as Error).message).not.toContain('Did you mean')
  })

  it('names the closest valid permission for a malformed one when known permissions are given', async () => {
    const error: unknown = await createApiKey({
      name: 'bad',
      permissions: ['photos:MediaItems:list'],
      knownPermissions: PHOTOS_KNOWN,
    }).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(PermissionParseError)
    expect((error as Error).message).toContain('Did you mean "photos:mediaItems:list"')
  })

  it('rejects a valid permission that differs from a known one only in case', async () => {
    const error: unknown = await createApiKey({
      name: 'miscased',
      permissions: ['photos:mediaitems:list'],
      knownPermissions: PHOTOS_KNOWN,
    }).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(PermissionCaseMismatchError)
    expect((error as PermissionCaseMismatchError).canonical).toBe('photos:mediaItems:list')
    expect((error as Error).message).toContain('Use "photos:mediaItems:list"')
  })

  it('mints a mis-cased permission when no known permissions are supplied (older keys)', async () => {
    const result = await createApiKey({ name: 'older', permissions: ['photos:mediaitems:list'] })
    expect(result.metadata.permissions).toEqual(['photos:mediaitems:list'])
  })

  it('accepts a well-formed permission that matches nothing known', async () => {
    const result = await createApiKey({
      name: 'future',
      permissions: ['photos:memories:list'],
      knownPermissions: PHOTOS_KNOWN,
    })
    expect(result.metadata.permissions).toEqual(['photos:memories:list'])
  })

  it("does not apply another app's known permissions to a permission of an unrelated app", async () => {
    const result = await createApiKey({
      name: 'other-app',
      permissions: ['music:tracks:list'],
      knownPermissions: PHOTOS_KNOWN,
    })
    expect(result.metadata.permissions).toEqual(['music:tracks:list'])
  })
})

describe('createApiKey with a permissions map that does not list a permission (issue #168)', () => {
  // A permission map lists only permissions some route requires. A
  // well-formed fine-grained permission it does not list is still a grant of
  // exactly itself, while coarse and wildcard permissions still expand.
  const section: PermissionsSection = {
    events: { read: ['calendar:events:list'] },
  }
  const KNOWN = ['calendar:events:list', 'calendar:events:*', 'calendar:*:*']

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('grants an unlisted fine-grained permission as written, beside an expanded coarse one', async () => {
    const result = await createApiKey(
      {
        name: 'unlisted',
        permissions: ['calendar:events:read', 'calendar:attendees:list'],
        knownPermissions: KNOWN,
      },
      section
    )
    // calendar:events:read expands to the map's read list; calendar:attendees:list
    // is not in the map and is kept as itself.
    expect(result.metadata.permissions).toEqual(['calendar:events:list', 'calendar:attendees:list'])
    expect(result.metadata.originalPermissions).toEqual([
      'calendar:events:read',
      'calendar:attendees:list',
    ])
  })

  it('still rejects a grouping-only coarse operation the map cannot expand', async () => {
    // `write` names no command and `events` has no `write` key.
    await expect(
      createApiKey({ name: 'dead', permissions: ['calendar:events:write'] }, section)
    ).rejects.toThrow(PermissionExpansionError)
  })

  it('still rejects a case-only mismatch with a known permission', async () => {
    // A case-only variant reaches the case check only when it satisfies the
    // grammar: photos:mediaitems:list does, unlike calendar:Events:list (next
    // test). The map lists the canonical spelling, so `keep` is what would
    // otherwise let the mis-cased one through.
    const section2: PermissionsSection = { mediaItems: { read: ['photos:mediaItems:list'] } }
    const error: unknown = await createApiKey(
      {
        name: 'miscased',
        permissions: ['photos:mediaitems:list'],
        knownPermissions: ['photos:mediaItems:list'],
      },
      section2
    ).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(PermissionCaseMismatchError)
    expect((error as PermissionCaseMismatchError).canonical).toBe('photos:mediaItems:list')
  })

  it('still rejects a malformed permission before expansion', async () => {
    // calendar:Events:list fails the grammar (a resource segment is
    // lower camelCase), so it never reaches the map.
    const error: unknown = await createApiKey(
      { name: 'malformed', permissions: ['calendar:Events:list'], knownPermissions: KNOWN },
      section
    ).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(PermissionParseError)
  })
})
