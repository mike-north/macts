import { describe, it, expect } from 'vitest'
import {
  expandCoarsePermission,
  expandPermissions,
  findCoarseCategory,
  generatePermissionMap,
  validateCommandPermissions,
  PermissionExpansionError,
} from './expander.js'
import type { PermissionsSection } from './index.js'

// Test fixture: a permissions section shaped like the calendar manifest's, with
// write and delete groups on both resources so every coarse operation has
// something to expand. It is not the shipped manifest's section, which lists
// only permissions some calendar route requires.
const calendarPermissions: PermissionsSection = {
  events: {
    read: ['calendar:events:list', 'calendar:events:get', 'calendar:events:show'],
    create: ['calendar:events:create'],
    write: ['calendar:events:update'],
    delete: ['calendar:events:delete'],
  },
  calendars: {
    read: ['calendar:calendars:list', 'calendar:calendars:get', 'calendar:calendars:reload'],
    create: ['calendar:calendars:create'],
    write: ['calendar:calendars:update'],
    delete: ['calendar:calendars:delete'],
  },
  app: {
    read: ['calendar:app:switchView', 'calendar:app:viewCalendar'],
  },
}

describe('expandCoarsePermission', () => {
  describe('positive cases', () => {
    it('should expand coarse read permission', () => {
      const result = expandCoarsePermission('calendar:events:read', calendarPermissions)
      expect(result).toEqual([
        'calendar:events:list',
        'calendar:events:get',
        'calendar:events:show',
      ])
    })

    it('should expand coarse create permission', () => {
      const result = expandCoarsePermission('calendar:events:create', calendarPermissions)
      expect(result).toEqual(['calendar:events:create'])
    })

    it('should expand coarse write permission', () => {
      const result = expandCoarsePermission('calendar:events:write', calendarPermissions)
      expect(result).toEqual(['calendar:events:update'])
    })

    it('should expand coarse delete permission', () => {
      const result = expandCoarsePermission('calendar:events:delete', calendarPermissions)
      expect(result).toEqual(['calendar:events:delete'])
    })

    it('should return fine-grained permission as-is', () => {
      const result = expandCoarsePermission('calendar:events:list', calendarPermissions)
      expect(result).toEqual(['calendar:events:list'])
    })

    it('should expand wildcard resource permission', () => {
      const result = expandCoarsePermission('calendar:*:read', calendarPermissions)
      expect(result).toContain('calendar:events:list')
      expect(result).toContain('calendar:events:get')
      expect(result).toContain('calendar:events:show')
      expect(result).toContain('calendar:calendars:list')
      expect(result).toContain('calendar:calendars:get')
      expect(result).toContain('calendar:calendars:reload')
      expect(result).toContain('calendar:app:switchView')
      expect(result).toContain('calendar:app:viewCalendar')
    })

    it('should expand wildcard operation permission', () => {
      const result = expandCoarsePermission('calendar:events:*', calendarPermissions)
      expect(result).toContain('calendar:events:list')
      expect(result).toContain('calendar:events:get')
      expect(result).toContain('calendar:events:show')
      expect(result).toContain('calendar:events:create')
      expect(result).toContain('calendar:events:update')
      expect(result).toContain('calendar:events:delete')
    })

    it('should expand full wildcard permission', () => {
      const result = expandCoarsePermission('calendar:*:*', calendarPermissions)
      // Should include all permissions
      expect(result.length).toBeGreaterThan(10)
      expect(result).toContain('calendar:events:list')
      expect(result).toContain('calendar:calendars:create')
      expect(result).toContain('calendar:app:switchView')
    })
  })

  describe('negative cases', () => {
    it('should throw for unknown resource', () => {
      expect(() => expandCoarsePermission('calendar:unknown:read', calendarPermissions)).toThrow(
        PermissionExpansionError
      )
    })

    it('should throw for unknown operation on known resource', () => {
      expect(() => expandCoarsePermission('calendar:events:admin', calendarPermissions)).toThrow(
        PermissionExpansionError
      )
    })

    it('should throw for wildcard with unknown resource', () => {
      // This should NOT throw because wildcard iterates over existing resources
      const result = expandCoarsePermission('calendar:*:read', calendarPermissions)
      expect(result.length).toBeGreaterThan(0)
    })
  })

  describe('edge cases', () => {
    it('should handle empty permissions section', () => {
      expect(() => expandCoarsePermission('calendar:events:read', {})).toThrow(
        PermissionExpansionError
      )
    })

    it('should return unique permissions for wildcard', () => {
      const result = expandCoarsePermission('calendar:*:*', calendarPermissions)
      const uniqueResult = [...new Set(result)]
      expect(result.length).toBe(uniqueResult.length)
    })
  })
})

describe('expandPermissions', () => {
  describe('positive cases', () => {
    it('should expand multiple coarse permissions', () => {
      const result = expandPermissions(
        ['calendar:events:read', 'calendar:calendars:read'],
        calendarPermissions
      )
      expect(result).toContain('calendar:events:list')
      expect(result).toContain('calendar:calendars:list')
    })

    it('should deduplicate results', () => {
      const result = expandPermissions(
        ['calendar:events:read', 'calendar:events:read'],
        calendarPermissions
      )
      const uniqueResult = [...new Set(result)]
      expect(result.length).toBe(uniqueResult.length)
    })

    it('should handle mixed fine and coarse permissions', () => {
      const result = expandPermissions(
        ['calendar:events:list', 'calendar:calendars:read'],
        calendarPermissions
      )
      expect(result).toContain('calendar:events:list')
      expect(result).toContain('calendar:calendars:list')
    })

    it('should handle empty array', () => {
      const result = expandPermissions([], calendarPermissions)
      expect(result).toEqual([])
    })
  })
})

describe('findCoarseCategory', () => {
  describe('positive cases', () => {
    it('should find coarse category for list', () => {
      const result = findCoarseCategory('calendar:events:list', calendarPermissions)
      expect(result).toBe('calendar:events:read')
    })

    it('should find coarse category for create', () => {
      const result = findCoarseCategory('calendar:events:create', calendarPermissions)
      expect(result).toBe('calendar:events:create')
    })

    it('should find coarse category for update', () => {
      const result = findCoarseCategory('calendar:events:update', calendarPermissions)
      expect(result).toBe('calendar:events:write')
    })
  })

  describe('negative cases', () => {
    it('should return undefined for unknown permission', () => {
      const result = findCoarseCategory('calendar:events:unknown', calendarPermissions)
      expect(result).toBeUndefined()
    })
  })
})

describe('generatePermissionMap', () => {
  it('should generate coarse-to-fine mapping', () => {
    const map = generatePermissionMap('calendar', calendarPermissions)

    expect(map.coarseToFine.get('calendar:events:read')).toEqual([
      'calendar:events:list',
      'calendar:events:get',
      'calendar:events:show',
    ])
  })

  it('should generate fine-to-coarse mapping', () => {
    const map = generatePermissionMap('calendar', calendarPermissions)

    expect(map.fineToCoarse.get('calendar:events:list')).toBe('calendar:events:read')
    expect(map.fineToCoarse.get('calendar:events:create')).toBe('calendar:events:create')
  })

  it('should collect all fine permissions', () => {
    const map = generatePermissionMap('calendar', calendarPermissions)

    expect(map.allFine.has('calendar:events:list')).toBe(true)
    expect(map.allFine.has('calendar:calendars:create')).toBe(true)
  })

  it('should collect all coarse permissions', () => {
    const map = generatePermissionMap('calendar', calendarPermissions)

    expect(map.allCoarse.has('calendar:events:read')).toBe(true)
    expect(map.allCoarse.has('calendar:calendars:write')).toBe(true)
  })
})

describe('validateCommandPermissions', () => {
  describe('positive cases', () => {
    it('should return empty array for valid permissions', () => {
      const commandPermissions = new Map([
        ['list', 'calendar:events:list'],
        ['get', 'calendar:events:get'],
      ])

      const errors = validateCommandPermissions(commandPermissions, calendarPermissions)
      expect(errors).toEqual([])
    })
  })

  describe('negative cases', () => {
    it('should return errors for missing permissions', () => {
      const commandPermissions = new Map([
        ['list', 'calendar:events:list'],
        ['unknown', 'calendar:events:unknown'],
      ])

      const errors = validateCommandPermissions(commandPermissions, calendarPermissions)
      expect(errors).toHaveLength(1)
      expect(errors[0]).toContain('unknown')
      expect(errors[0]).toContain('calendar:events:unknown')
    })

    it('should return multiple errors for multiple missing', () => {
      const commandPermissions = new Map([
        ['cmd1', 'calendar:events:foo'],
        ['cmd2', 'calendar:events:bar'],
      ])

      const errors = validateCommandPermissions(commandPermissions, calendarPermissions)
      expect(errors).toHaveLength(2)
    })

    it('should reject a command whose operation is a grouping-only coarse alias (read)', () => {
      // Regression guard: a command must not use `read`/`write` as its
      // operation (the microsoft-word `createRange` -> `microsoft-word:documents:read`
      // bug). Such a permission collides with the coarse vocabulary and
      // authorizes nothing on its own.
      const commandPermissions = new Map([['createRange', 'microsoft-word:documents:read']])

      const errors = validateCommandPermissions(commandPermissions, {
        documents: { read: ['microsoft-word:documents:list', 'microsoft-word:documents:get'] },
      })

      expect(errors.some((e) => e.includes('grouping-only coarse alias'))).toBe(true)
    })

    it('should reject a command whose operation is `write`', () => {
      const commandPermissions = new Map([['save', 'microsoft-word:documents:write']])

      const errors = validateCommandPermissions(commandPermissions, {
        documents: { write: ['microsoft-word:documents:save'] },
      })

      expect(errors.some((e) => e.includes('grouping-only coarse alias'))).toBe(true)
    })

    it('should NOT reject a command whose operation is `create` (a real fine-grained op)', () => {
      const commandPermissions = new Map([['create', 'calendar:events:create']])

      const errors = validateCommandPermissions(commandPermissions, calendarPermissions)
      expect(errors).toEqual([])
    })
  })
})

describe('expandCoarsePermission unmapped policy (issue #168)', () => {
  // A permission map lists only permissions some route requires, so key
  // creation must still be able to grant a well-formed fine-grained permission
  // the map does not list. `keep` returns it as itself; the default `reject`
  // is unchanged, so `macts permissions expand` still errors on it.
  const section: PermissionsSection = { events: { read: ['calendar:events:list'] } }
  const keep = { unmapped: 'keep' } as const

  describe('with unmapped: keep', () => {
    it('keeps a permission whose resource is not in the map', () => {
      // Under the default this throws "Resource attendees not found".
      expect(expandCoarsePermission('calendar:attendees:list', section, keep)).toEqual([
        'calendar:attendees:list',
      ])
    })

    it('keeps a permission whose operation is neither a key nor a listed value', () => {
      // Under the default this throws "Operation get not found".
      expect(expandCoarsePermission('calendar:events:get', section, keep)).toEqual([
        'calendar:events:get',
      ])
    })

    it('still expands a coarse key to its list', () => {
      expect(expandCoarsePermission('calendar:events:read', section, keep)).toEqual([
        'calendar:events:list',
      ])
    })

    it('still returns a listed fine-grained permission as itself', () => {
      expect(expandCoarsePermission('calendar:events:list', section, keep)).toEqual([
        'calendar:events:list',
      ])
    })

    it('still throws for a grouping-only coarse operation on a resource not in the map', () => {
      // `read` names no command, so granting it as written authorizes nothing.
      expect(() => expandCoarsePermission('calendar:attendees:read', section, keep)).toThrow(
        PermissionExpansionError
      )
    })

    it('still throws for a grouping-only coarse operation that is not a key', () => {
      // `events` has no `write` key, and `write` names no command.
      expect(() => expandCoarsePermission('calendar:events:write', section, keep)).toThrow(
        PermissionExpansionError
      )
    })

    it('expands a resource wildcard as before', () => {
      expect(expandCoarsePermission('calendar:events:*', section, keep)).toEqual([
        'calendar:events:list',
      ])
    })

    it('applies to every permission given to expandPermissions', () => {
      expect(
        expandPermissions(['calendar:events:read', 'calendar:attendees:list'], section, keep)
      ).toEqual(['calendar:events:list', 'calendar:attendees:list'])
    })
  })

  describe('with the default policy (reject)', () => {
    it('throws for a permission whose resource is not in the map', () => {
      expect(() => expandCoarsePermission('calendar:attendees:list', section)).toThrow(
        'Resource "attendees" not found in permissions mapping'
      )
    })

    it('throws for a permission whose operation is neither a key nor a listed value', () => {
      expect(() => expandCoarsePermission('calendar:events:get', section)).toThrow(
        'Operation "get" not found in resource "events" mapping'
      )
    })

    it('expands a coarse key to its list', () => {
      expect(expandCoarsePermission('calendar:events:read', section)).toEqual([
        'calendar:events:list',
      ])
    })

    it('returns a listed fine-grained permission as itself', () => {
      expect(expandCoarsePermission('calendar:events:list', section)).toEqual([
        'calendar:events:list',
      ])
    })

    it('throws for a grouping-only coarse operation on a resource not in the map', () => {
      expect(() => expandCoarsePermission('calendar:attendees:read', section)).toThrow(
        PermissionExpansionError
      )
    })

    it('throws for a grouping-only coarse operation that is not a key', () => {
      expect(() => expandCoarsePermission('calendar:events:write', section)).toThrow(
        PermissionExpansionError
      )
    })

    it('expands a resource wildcard', () => {
      expect(expandCoarsePermission('calendar:events:*', section)).toEqual(['calendar:events:list'])
    })

    it('throws from expandPermissions for an unmapped permission', () => {
      expect(() =>
        expandPermissions(['calendar:events:read', 'calendar:attendees:list'], section)
      ).toThrow(PermissionExpansionError)
    })
  })
})
