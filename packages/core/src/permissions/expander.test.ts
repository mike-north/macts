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

// Test fixture - permissions section from a calendar manifest
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
  })
})
