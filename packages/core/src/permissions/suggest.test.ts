/**
 * Tests for permission suggestions: the closest valid permission(s) for a
 * mis-cased or mistyped permission string.
 *
 * @see phases/13-sdk-value-and-execution-contracts.md (D2)
 * @see https://github.com/mike-north/macts/issues/153
 */
import { describe, it, expect } from 'vitest'
import {
  suggestPermissions,
  findCaseOnlyMismatch,
  explainInvalidPermission,
  listKnownPermissions,
} from './suggest.js'
import type { AppManifest } from '../manifest/schemas/index.js'

const PHOTOS = [
  'photos:mediaItems:list',
  'photos:mediaItems:get',
  'photos:albums:list',
  'photos:mediaItems:*',
  'photos:*:*',
]
const KNOWN = [...PHOTOS, 'iterm:sessions:splitVertically', 'iterm:sessions:list']

describe('suggestPermissions', () => {
  it('ranks the case-only match first', () => {
    expect(suggestPermissions('photos:mediaitems:list', KNOWN)[0]).toBe('photos:mediaItems:list')
  })

  it('ranks a case-only match ahead of a nearer edit-distance neighbour', () => {
    // "photos:mediaitems:lis" is 1 edit from a mis-cased "photos:mediaitems:list"
    // but the case-only candidate must still win over any other.
    const known = ['photos:mediaItems:lis', 'photos:mediaItems:list']
    expect(suggestPermissions('photos:mediaitems:list', known)).toEqual([
      'photos:mediaItems:list',
      'photos:mediaItems:lis',
    ])
  })

  it('suggests by edit distance when no case-only match exists', () => {
    // one missing letter: "mediaItem" vs "mediaItems"
    expect(suggestPermissions('photos:mediaItem:list', KNOWN)[0]).toBe('photos:mediaItems:list')
  })

  it('recovers a dash-separated operation by edit distance', () => {
    expect(suggestPermissions('iterm:sessions:split-vertically', KNOWN)).toEqual([
      'iterm:sessions:splitVertically',
    ])
  })

  it('never suggests a permission of another app, however close', () => {
    // "iterm:sessions:list" is 1 edit from the request below, but is another app.
    const known = ['iterm:sessions:list', 'photos:sessions:lists']
    expect(suggestPermissions('itermm:sessions:list', known)).toEqual([])
    expect(suggestPermissions('photos:sessions:list', known)).toEqual(['photos:sessions:lists'])
  })

  it('treats the app segment case-insensitively when choosing the app', () => {
    expect(suggestPermissions('Photos:mediaItems:list', KNOWN)[0]).toBe('photos:mediaItems:list')
  })

  it('returns at most three suggestions', () => {
    const known = ['a:b:cd1', 'a:b:cd2', 'a:b:cd3', 'a:b:cd4', 'a:b:cd5']
    expect(suggestPermissions('a:b:cd', known)).toHaveLength(3)
  })

  it('returns nothing when nothing is close', () => {
    expect(suggestPermissions('photos:zzzzzzzzzzzz:qqqqqqqqqq', KNOWN)).toEqual([])
  })

  it('returns nothing for an app with no known permissions', () => {
    expect(suggestPermissions('unknownapp:things:list', KNOWN)).toEqual([])
  })

  it('does not suggest the requested permission itself', () => {
    expect(suggestPermissions('photos:mediaItems:list', KNOWN)).not.toContain(
      'photos:mediaItems:list'
    )
  })

  it('returns nothing for an empty known set', () => {
    expect(suggestPermissions('photos:mediaItems:list', [])).toEqual([])
  })
})

describe('findCaseOnlyMismatch', () => {
  it('names the canonical permission for a case-only difference', () => {
    expect(findCaseOnlyMismatch('photos:mediaitems:list', KNOWN)).toBe('photos:mediaItems:list')
  })

  it('finds a mis-cased wildcard', () => {
    expect(findCaseOnlyMismatch('photos:mediaitems:*', KNOWN)).toBe('photos:mediaItems:*')
  })

  it('returns undefined for an exact known permission', () => {
    expect(findCaseOnlyMismatch('photos:mediaItems:list', KNOWN)).toBeUndefined()
  })

  it('returns undefined for a permission that differs by more than case', () => {
    expect(findCaseOnlyMismatch('photos:mediaitems:remove', KNOWN)).toBeUndefined()
  })
})

describe('explainInvalidPermission', () => {
  it('states the rule and an example when nothing is known', () => {
    const message = explainInvalidPermission('photos:MediaItems:list')
    expect(message).toContain('app:resource:operation')
    expect(message).toContain('camelCase')
    expect(message).toContain('photos:mediaItems:list')
    expect(message).not.toContain('Did you mean')
  })

  it('names the closest valid permission when known', () => {
    expect(explainInvalidPermission('photos:MediaItems:list', KNOWN)).toContain(
      'Did you mean "photos:mediaItems:list"'
    )
  })
})

describe('listKnownPermissions', () => {
  const manifest: AppManifest = {
    version: '1.0',
    app: { name: 'Photos', bundleId: 'com.apple.Photos', tccEntitlements: [] },
    resources: {
      MediaItem: {
        name: 'MediaItem',
        plural: 'mediaItems',
        description: 'A photo or video',
        properties: {},
        identifiers: [{ property: 'id', primary: true }],
      },
    },
    enums: {},
    hierarchy: { children: {} },
    suites: [],
    relationships: [],
    commands: {
      list: {
        name: 'list',
        description: 'List media items',
        scope: 'resource',
        resourceType: 'MediaItem',
        parameters: [],
      },
      runSlideshow: {
        name: 'runSlideshow',
        description: 'Run a slideshow',
        scope: 'application',
        parameters: [],
      },
    },
  }

  it('lists route permissions, then resource wildcards, then the app wildcard', () => {
    // route permission derivation: app:scope:segment (see manifest/route.ts);
    // the resource scope segment is the lowercased plural.
    expect(listKnownPermissions(manifest)).toEqual([
      'photos:mediaitems:list',
      'photos:app:runSlideshow',
      'photos:mediaitems:*',
      'photos:app:*',
      'photos:*:*',
    ])
  })
})
