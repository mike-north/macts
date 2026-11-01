/**
 * Tests for the permission grammar and parser.
 *
 * @see phases/13-sdk-value-and-execution-contracts.md (D2)
 * @see https://github.com/mike-north/macts/issues/153
 */
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

    it('should allow underscores in the app segment only', () => {
      const result = parsePermission('my_app:someResource:doAction')
      expect(result.app).toBe('my_app')
      expect(result.resource).toBe('someResource')
      expect(result.operation).toBe('doAction')
    })

    it('should allow dashes in the app segment only', () => {
      const result = parsePermission('my-app:someResource:doAction')
      expect(result.app).toBe('my-app')
      expect(result.resource).toBe('someResource')
      expect(result.operation).toBe('doAction')
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

// Grammar decided in issue #153: the app segment is `[a-z][a-z0-9_-]*`; the
// resource and operation segments are `[a-z][a-zA-Z0-9]*` or `*`.
describe('permission grammar (camelCase resource and operation)', () => {
  describe('accepts', () => {
    it.each([
      'photos:mediaItems:list',
      'iterm:sessions:splitVertically',
      'calendar:events:*',
      'calendar:*:*',
      'script-editor:documents:list',
      'my_app:events:list',
      'photos:*:list',
      'app2:resource3:action4',
    ])('%s', (permission) => {
      expect(isValidPermission(permission)).toBe(true)
    })

    it('parses camelCase segments without altering case', () => {
      expect(parsePermission('iterm:sessions:splitVertically')).toEqual({
        type: 'fine',
        app: 'iterm',
        resource: 'sessions',
        operation: 'splitVertically',
      })
      expect(extractResourceName('photos:mediaItems:list')).toBe('mediaItems')
    })
  })

  describe('rejects', () => {
    it.each([
      ['an uppercase-first resource', 'photos:MediaItems:list'],
      ['an uppercase-first operation', 'iterm:sessions:SplitVertically'],
      ['an uppercase app segment', 'Photos:mediaItems:list'],
      ['an uppercase letter inside the app segment', 'phOtos:mediaItems:list'],
      ['a dash in the resource', 'photos:media-items:list'],
      ['a dash in the operation', 'iterm:sessions:split-vertically'],
      ['an underscore in the resource', 'photos:media_items:list'],
      ['an underscore in the operation', 'iterm:sessions:split_vertically'],
      ['an empty app', ':events:list'],
      ['an empty resource', 'calendar::list'],
      ['an empty operation', 'calendar:events:'],
      ['two segments', 'calendar:events'],
      ['four segments', 'calendar:events:list:extra'],
      ['a partial wildcard', 'calendar:ev*:list'],
      ['a digit-first resource', 'calendar:1events:list'],
    ])('%s (%s)', (_label, permission) => {
      expect(isValidPermission(permission)).toBe(false)
      expect(() => parsePermission(permission)).toThrow(PermissionParseError)
    })

    it('states the real rule in user terms', () => {
      expect(() => parsePermission('photos:MediaItems:list')).toThrow(/camelCase/)
      expect(() => parsePermission('photos:MediaItems:list')).toThrow(/case-sensitive/)
    })
  })
})
