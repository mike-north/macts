import { describe, it, expect } from 'vitest'
import {
  parsePermission,
  formatPermission,
  finePermission,
  coarsePermission,
  wildcardPermission,
  isValidPermission,
  extractAppName,
  extractResourceName,
  extractOperation,
  PermissionParseError,
} from './parser.js'
// isCoarseOperation is the single-sourced vocabulary authority (see vocabulary.ts).
import { isCoarseOperation } from './vocabulary.js'

describe('parsePermission', () => {
  describe('positive cases', () => {
    it('should parse fine-grained permission', () => {
      const result = parsePermission('calendar:events:list')
      expect(result).toEqual({
        type: 'fine',
        app: 'calendar',
        resource: 'events',
        operation: 'list',
      })
    })

    it('should parse coarse read permission', () => {
      const result = parsePermission('calendar:events:read')
      expect(result).toEqual({
        type: 'coarse',
        app: 'calendar',
        resource: 'events',
        operation: 'read',
      })
    })

    it('should parse coarse create permission', () => {
      const result = parsePermission('calendar:events:create')
      expect(result).toEqual({
        type: 'coarse',
        app: 'calendar',
        resource: 'events',
        operation: 'create',
      })
    })

    it('should parse coarse write permission', () => {
      const result = parsePermission('calendar:calendars:write')
      expect(result).toEqual({
        type: 'coarse',
        app: 'calendar',
        resource: 'calendars',
        operation: 'write',
      })
    })

    it('should parse coarse delete permission', () => {
      const result = parsePermission('notes:folders:delete')
      expect(result).toEqual({
        type: 'coarse',
        app: 'notes',
        resource: 'folders',
        operation: 'delete',
      })
    })

    it('should parse wildcard resource permission', () => {
      const result = parsePermission('calendar:*:read')
      expect(result).toEqual({
        type: 'wildcard',
        app: 'calendar',
        resource: '*',
        operation: 'read',
      })
    })

    it('should parse wildcard operation permission', () => {
      const result = parsePermission('calendar:events:*')
      expect(result).toEqual({
        type: 'wildcard',
        app: 'calendar',
        resource: 'events',
        operation: '*',
      })
    })

    it('should parse full wildcard permission', () => {
      const result = parsePermission('calendar:*:*')
      expect(result).toEqual({
        type: 'wildcard',
        app: 'calendar',
        resource: '*',
        operation: '*',
      })
    })

    it('should handle underscores in names', () => {
      const result = parsePermission('my_app:some_resource:do_action')
      expect(result.app).toBe('my_app')
      expect(result.resource).toBe('some_resource')
      expect(result.operation).toBe('do_action')
    })

    it('should handle dashes in names', () => {
      const result = parsePermission('my-app:some-resource:do-action')
      expect(result.app).toBe('my-app')
      expect(result.resource).toBe('some-resource')
      expect(result.operation).toBe('do-action')
    })

    it('should handle numbers in names', () => {
      const result = parsePermission('app2:resource3:action4')
      expect(result.app).toBe('app2')
      expect(result.resource).toBe('resource3')
      expect(result.operation).toBe('action4')
    })
  })

  describe('negative cases', () => {
    it('should reject empty string', () => {
      expect(() => parsePermission('')).toThrow(PermissionParseError)
    })

    it('should reject single part', () => {
      expect(() => parsePermission('calendar')).toThrow(PermissionParseError)
    })

    it('should reject two parts', () => {
      expect(() => parsePermission('calendar:events')).toThrow(PermissionParseError)
    })

    it('should reject four parts', () => {
      expect(() => parsePermission('calendar:events:list:extra')).toThrow(PermissionParseError)
    })

    it('should reject names starting with numbers', () => {
      expect(() => parsePermission('1app:events:list')).toThrow(PermissionParseError)
    })

    it('should reject names starting with underscore', () => {
      expect(() => parsePermission('_app:events:list')).toThrow(PermissionParseError)
    })

    it('should reject names starting with dash', () => {
      expect(() => parsePermission('-app:events:list')).toThrow(PermissionParseError)
    })

    it('should reject uppercase letters', () => {
      expect(() => parsePermission('Calendar:Events:List')).toThrow(PermissionParseError)
    })

    it('should reject spaces', () => {
      expect(() => parsePermission('calendar: events:list')).toThrow(PermissionParseError)
    })

    it('should reject special characters', () => {
      expect(() => parsePermission('calendar:events:list!')).toThrow(PermissionParseError)
    })
  })

  describe('edge cases', () => {
    it('should handle single character names', () => {
      const result = parsePermission('a:b:c')
      expect(result.app).toBe('a')
      expect(result.resource).toBe('b')
      expect(result.operation).toBe('c')
    })

    it('should handle very long names', () => {
      const longName = 'a'.repeat(100)
      const result = parsePermission(`${longName}:${longName}:${longName}`)
      expect(result.app).toBe(longName)
    })
  })
})

describe('formatPermission', () => {
  it('should format fine-grained permission', () => {
    const result = formatPermission({
      type: 'fine',
      app: 'calendar',
      resource: 'events',
      operation: 'list',
    })
    expect(result).toBe('calendar:events:list')
  })

  it('should format coarse permission', () => {
    const result = formatPermission({
      type: 'coarse',
      app: 'calendar',
      resource: 'events',
      operation: 'read',
    })
    expect(result).toBe('calendar:events:read')
  })

  it('should format wildcard permission', () => {
    const result = formatPermission({
      type: 'wildcard',
      app: 'calendar',
      resource: '*',
      operation: 'read',
    })
    expect(result).toBe('calendar:*:read')
  })
})

describe('permission string builders', () => {
  it('finePermission should build correct string', () => {
    expect(finePermission('calendar', 'events', 'list')).toBe('calendar:events:list')
  })

  it('coarsePermission should build correct string', () => {
    expect(coarsePermission('calendar', 'events', 'read')).toBe('calendar:events:read')
  })

  it('wildcardPermission should build correct string', () => {
    expect(wildcardPermission('calendar', '*', 'read')).toBe('calendar:*:read')
    expect(wildcardPermission('calendar', 'events', '*')).toBe('calendar:events:*')
  })
})

describe('isValidPermission', () => {
  describe('positive cases', () => {
    it('should accept valid permission', () => {
      expect(isValidPermission('calendar:events:list')).toBe(true)
    })

    it('should accept wildcard permission', () => {
      expect(isValidPermission('calendar:*:read')).toBe(true)
    })
  })

  describe('negative cases', () => {
    it('should reject empty string', () => {
      expect(isValidPermission('')).toBe(false)
    })

    it('should reject malformed permission', () => {
      expect(isValidPermission('calendar')).toBe(false)
    })

    it('should reject uppercase', () => {
      expect(isValidPermission('Calendar:Events:List')).toBe(false)
    })
  })
})

describe('extractors', () => {
  describe('extractAppName', () => {
    it('should extract app name', () => {
      expect(extractAppName('calendar:events:list')).toBe('calendar')
    })

    it('should return undefined for invalid', () => {
      expect(extractAppName('invalid')).toBeUndefined()
    })
  })

  describe('extractResourceName', () => {
    it('should extract resource name', () => {
      expect(extractResourceName('calendar:events:list')).toBe('events')
    })

    it('should extract wildcard', () => {
      expect(extractResourceName('calendar:*:read')).toBe('*')
    })

    it('should return undefined for invalid', () => {
      expect(extractResourceName('invalid')).toBeUndefined()
    })
  })

  describe('extractOperation', () => {
    it('should extract operation', () => {
      expect(extractOperation('calendar:events:list')).toBe('list')
    })

    it('should extract wildcard', () => {
      expect(extractOperation('calendar:events:*')).toBe('*')
    })

    it('should return undefined for invalid', () => {
      expect(extractOperation('invalid')).toBeUndefined()
    })
  })
})

describe('isCoarseOperation', () => {
  describe('positive cases', () => {
    it('should return true for read', () => {
      expect(isCoarseOperation('read')).toBe(true)
    })

    it('should return true for create', () => {
      expect(isCoarseOperation('create')).toBe(true)
    })

    it('should return true for write', () => {
      expect(isCoarseOperation('write')).toBe(true)
    })

    it('should return true for delete', () => {
      expect(isCoarseOperation('delete')).toBe(true)
    })
  })

  describe('negative cases', () => {
    it('should return false for list', () => {
      expect(isCoarseOperation('list')).toBe(false)
    })

    it('should return false for show', () => {
      expect(isCoarseOperation('show')).toBe(false)
    })

    it('should return false for purge', () => {
      expect(isCoarseOperation('purge')).toBe(false)
    })

    it('should return false for admin', () => {
      expect(isCoarseOperation('admin')).toBe(false)
    })

    it('should return false for empty string', () => {
      expect(isCoarseOperation('')).toBe(false)
    })
  })
})
