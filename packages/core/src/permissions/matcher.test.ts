/**
 * Tests for permission matching and denial hints.
 *
 * @see phases/13-sdk-value-and-execution-contracts.md (D2)
 * @see https://github.com/mike-north/macts/issues/153
 */
import { describe, it, expect } from 'vitest'
import {
  hasPermission,
  checkPermission,
  checkPermissions,
  filterPermissionsByApp,
  groupPermissionsByResource,
  describePermissions,
} from './matcher.js'
import type { PermissionHistoryEntry } from './index.js'

describe('hasPermission', () => {
  describe('positive cases - direct match', () => {
    it('should grant permission for exact match', () => {
      const result = hasPermission(
        ['calendar:events:list', 'calendar:events:get'],
        'calendar:events:list'
      )
      expect(result.granted).toBe(true)
      expect(result.matchedBy).toBe('calendar:events:list')
    })

    it('should grant permission for single granted permission', () => {
      const result = hasPermission(['calendar:events:list'], 'calendar:events:list')
      expect(result.granted).toBe(true)
    })
  })

  describe('positive cases - wildcard match', () => {
    it('should grant permission via resource wildcard', () => {
      const result = hasPermission(['calendar:*:list'], 'calendar:events:list')
      expect(result.granted).toBe(true)
      expect(result.matchedBy).toBe('calendar:*:list')
    })

    it('should grant permission via operation wildcard', () => {
      const result = hasPermission(['calendar:events:*'], 'calendar:events:list')
      expect(result.granted).toBe(true)
      expect(result.matchedBy).toBe('calendar:events:*')
    })

    it('should grant permission via full wildcard', () => {
      const result = hasPermission(['calendar:*:*'], 'calendar:events:list')
      expect(result.granted).toBe(true)
      expect(result.matchedBy).toBe('calendar:*:*')
    })
  })

  describe('negative cases', () => {
    it('should deny permission for missing permission', () => {
      const result = hasPermission(['calendar:events:list'], 'calendar:events:create')
      expect(result.granted).toBe(false)
      expect(result.hint).toContain('calendar:events:create')
    })

    it('should deny permission for different app', () => {
      const result = hasPermission(['notes:events:list'], 'calendar:events:list')
      expect(result.granted).toBe(false)
    })

    it('should deny permission for different resource', () => {
      const result = hasPermission(['calendar:calendars:list'], 'calendar:events:list')
      expect(result.granted).toBe(false)
    })

    it('should deny permission for empty granted array', () => {
      const result = hasPermission([], 'calendar:events:list')
      expect(result.granted).toBe(false)
    })

    it('should deny permission for invalid required format', () => {
      const result = hasPermission(['calendar:events:list'], 'invalid')
      expect(result.granted).toBe(false)
      expect(result.hint).toContain('Invalid permission format')
    })
  })

  describe('permission history', () => {
    // History tracks when a permission REQUIREMENT changed.
    // If a user has a key with the OLD permission (from history),
    // and the command now requires a DIFFERENT permission,
    // we should provide a helpful hint about the change.
    const history: PermissionHistoryEntry[] = [
      {
        version: '1.2.0',
        permission: 'calendar:events:show', // OLD permission that was changed
        changed: '2024-02-01',
        reason: 'show now modifies view state',
      },
    ]

    it('should include changelog when user has old permission from history', () => {
      // User has the OLD permission (from before the change)
      // Command now requires a NEW permission
      const result = hasPermission(
        ['calendar:events:show'], // User has old permission
        'calendar:events:write', // Command now requires this
        history
      )

      expect(result.granted).toBe(false)
      expect(result.changelog).toBeDefined()
      expect(result.changelog?.version).toBe('1.2.0')
      expect(result.changelog?.previousPermission).toBe('calendar:events:show')
      expect(result.changelog?.reason).toBe('show now modifies view state')
      expect(result.hint).toContain('Permission changed in v1.2.0')
      expect(result.hint).toContain('was: calendar:events:show')
    })

    it('should not include changelog when user does not have old permission', () => {
      // User has a completely different permission, not the old one
      const result = hasPermission(
        ['calendar:events:list'], // User has different permission
        'calendar:events:write', // Command requires this
        history
      )

      expect(result.granted).toBe(false)
      expect(result.changelog).toBeUndefined()
      expect(result.hint).toContain('Missing required permission')
    })

    it('should not include changelog when permission is granted', () => {
      // User has the required permission - no need for changelog
      const result = hasPermission(
        ['calendar:events:write'], // User has required permission
        'calendar:events:write',
        history
      )

      expect(result.granted).toBe(true)
      expect(result.changelog).toBeUndefined()
    })
  })

  describe('edge cases', () => {
    it('should handle duplicate permissions in granted array', () => {
      const result = hasPermission(
        ['calendar:events:list', 'calendar:events:list'],
        'calendar:events:list'
      )
      expect(result.granted).toBe(true)
    })

    it('should not be case-sensitive for wildcards', () => {
      // Wildcards are literal * not regex
      const result = hasPermission(
        ['calendar:*:list'],
        'calendar:EVENTS:list' // Uppercase should fail
      )
      expect(result.granted).toBe(false)
    })
  })
})

describe('checkPermission', () => {
  it('should return true for granted permission', () => {
    expect(checkPermission(['calendar:events:list'], 'calendar:events:list')).toBe(true)
  })

  it('should return false for denied permission', () => {
    expect(checkPermission(['calendar:events:list'], 'calendar:events:create')).toBe(false)
  })
})

describe('checkPermissions', () => {
  describe('positive cases', () => {
    it('should grant when all permissions present', () => {
      const result = checkPermissions(
        ['calendar:events:list', 'calendar:events:create'],
        ['calendar:events:list', 'calendar:events:create']
      )
      expect(result.granted).toBe(true)
      expect(result.results).toHaveLength(2)
      expect(result.results.every((r) => r.granted)).toBe(true)
    })
  })

  describe('negative cases', () => {
    it('should deny when any permission missing', () => {
      const result = checkPermissions(
        ['calendar:events:list'],
        ['calendar:events:list', 'calendar:events:create']
      )
      expect(result.granted).toBe(false)
      expect(result.results[0]?.granted).toBe(true)
      expect(result.results[1]?.granted).toBe(false)
    })

    it('should deny when all permissions missing', () => {
      const result = checkPermissions([], ['calendar:events:list', 'calendar:events:create'])
      expect(result.granted).toBe(false)
      expect(result.results.every((r) => !r.granted)).toBe(true)
    })
  })

  describe('edge cases', () => {
    it('should grant for empty required array', () => {
      const result = checkPermissions(['calendar:events:list'], [])
      expect(result.granted).toBe(true)
      expect(result.results).toHaveLength(0)
    })
  })
})

describe('filterPermissionsByApp', () => {
  it('should filter to matching app', () => {
    const result = filterPermissionsByApp(
      ['calendar:events:list', 'notes:folders:list', 'calendar:calendars:get'],
      'calendar'
    )
    expect(result).toEqual(['calendar:events:list', 'calendar:calendars:get'])
  })

  it('should return empty for no matches', () => {
    const result = filterPermissionsByApp(['notes:folders:list'], 'calendar')
    expect(result).toEqual([])
  })

  it('should skip invalid permissions', () => {
    const result = filterPermissionsByApp(
      ['calendar:events:list', 'invalid', 'calendar:calendars:get'],
      'calendar'
    )
    expect(result).toEqual(['calendar:events:list', 'calendar:calendars:get'])
  })
})

describe('groupPermissionsByResource', () => {
  it('should group by resource', () => {
    const result = groupPermissionsByResource([
      'calendar:events:list',
      'calendar:events:create',
      'calendar:calendars:list',
    ])

    expect(result.get('events')).toEqual(['calendar:events:list', 'calendar:events:create'])
    expect(result.get('calendars')).toEqual(['calendar:calendars:list'])
  })

  it('should handle empty array', () => {
    const result = groupPermissionsByResource([])
    expect(result.size).toBe(0)
  })

  it('should skip invalid permissions', () => {
    const result = groupPermissionsByResource(['calendar:events:list', 'invalid'])
    expect(result.size).toBe(1)
    expect(result.get('events')).toEqual(['calendar:events:list'])
  })
})

describe('describePermissions', () => {
  it('should describe permissions', () => {
    const result = describePermissions([
      'calendar:events:list',
      'calendar:events:create',
      'calendar:calendars:get',
    ])

    expect(result).toContain('events')
    expect(result).toContain('list')
    expect(result).toContain('create')
    expect(result).toContain('calendars')
    expect(result).toContain('get')
  })

  it('should handle empty array', () => {
    const result = describePermissions([])
    expect(result).toBe('No permissions')
  })
})

describe('hasPermission with camelCase permissions (issue #153)', () => {
  describe('grants', () => {
    it('matches a camelCase grant exactly', () => {
      const result = hasPermission(['photos:mediaItems:list'], 'photos:mediaItems:list')
      expect(result).toEqual({
        granted: true,
        required: 'photos:mediaItems:list',
        matchedBy: 'photos:mediaItems:list',
      })
    })

    it('grants a camelCase requirement via the app wildcard', () => {
      const result = hasPermission(['photos:*:*'], 'photos:mediaItems:list')
      expect(result.granted).toBe(true)
      expect(result.matchedBy).toBe('photos:*:*')
    })

    it('grants a camelCase operation via the resource wildcard', () => {
      const result = hasPermission(['iterm:sessions:*'], 'iterm:sessions:splitVertically')
      expect(result.granted).toBe(true)
      expect(result.matchedBy).toBe('iterm:sessions:*')
    })

    it('grants a camelCase resource via the operation wildcard', () => {
      expect(hasPermission(['photos:*:list'], 'photos:mediaItems:list').granted).toBe(true)
    })
  })

  describe('case-only mismatches are denied, never matched', () => {
    it('denies a grant that differs only in case, and says so', () => {
      const result = hasPermission(['photos:mediaitems:list'], 'photos:mediaItems:list')
      expect(result.granted).toBe(false)
      expect(result.matchedBy).toBeUndefined()
      expect(result.hint).toBe(
        'This key holds "photos:mediaitems:list", which differs from the required ' +
          '"photos:mediaItems:list" only in letter case; permissions are case-sensitive. ' +
          'Grant "photos:mediaItems:list".'
      )
    })

    it('denies a differently cased wildcard grant, and says so', () => {
      const result = hasPermission(['photos:mediaitems:*'], 'photos:mediaItems:list')
      expect(result.granted).toBe(false)
      expect(result.hint).toBe(
        'This key holds "photos:mediaitems:*", which would cover the required ' +
          '"photos:mediaItems:list" if letter case were ignored; permissions are ' +
          'case-sensitive. Grant "photos:mediaItems:list".'
      )
    })

    it('denies a mis-cased operation', () => {
      const result = hasPermission(
        ['iterm:sessions:splitvertically'],
        'iterm:sessions:splitVertically'
      )
      expect(result.granted).toBe(false)
      expect(result.hint).toContain('Grant "iterm:sessions:splitVertically"')
    })

    it('does not add a case hint when the difference is more than case', () => {
      const result = hasPermission(['photos:mediaitems:get'], 'photos:mediaItems:list')
      expect(result.granted).toBe(false)
      expect(result.hint).toContain('Missing required permission')
      expect(result.hint).not.toContain('letter case')
    })

    it('does not add a case hint for another app', () => {
      const result = hasPermission(['music:mediaitems:list'], 'photos:mediaItems:list')
      expect(result.hint).not.toContain('letter case')
    })

    it('keeps a rename hint and appends the case explanation when both apply', () => {
      const history: PermissionHistoryEntry[] = [
        { version: '1.2.0', permission: 'photos:mediaitems:list', changed: '2024-02-01' },
      ]
      const result = hasPermission(['photos:mediaitems:list'], 'photos:mediaItems:list', history)
      expect(result.granted).toBe(false)
      expect(result.changelog?.previousPermission).toBe('photos:mediaitems:list')
      expect(result.hint).toMatch(/^Permission changed in v1\.2\.0 /)
      expect(result.hint).toContain(
        'differs from the required "photos:mediaItems:list" only in letter case'
      )
    })
  })
})
