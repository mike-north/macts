/**
 * Tests for `./type-names.ts`: the matching rule a declared type's name
 * follows. Expected values are derived by hand from the rule (lowercase, drop
 * spaces, dashes and underscores).
 */

import { describe, expect, it } from 'vitest'
import { normalizeTypeName } from './type-names.js'

describe('normalizeTypeName', () => {
  it('lowercases and drops spaces, dashes, and underscores', () => {
    expect(normalizeTypeName('Text Item')).toBe('textitem')
    expect(normalizeTypeName('text-item')).toBe('textitem')
    expect(normalizeTypeName('TEXT_ITEM')).toBe('textitem')
  })
})
