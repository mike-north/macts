/**
 * Tests for the value kind labels and the kinds each declared manifest type
 * expects.
 *
 * Expected kinds are derived by hand from the table's rules: text and enums
 * are strings, integers and numbers are numbers, references are object
 * specifiers, arrays are lists, points and colors are lists or records (both
 * decode), rectangles are records, and files, `any`, and names that resolve to
 * nothing are not checked. Without the manifest's names, a named type could
 * be either a reference or a string.
 *
 * @see ./value-kinds.ts
 */

import { describe, expect, it } from 'vitest'
import type { PropertyType } from './schemas/property.js'
import {
  VALUE_KINDS,
  describeDeclaredType,
  expectedValueKinds,
  isValueKind,
  possibleValueKinds,
  type TypeNameResolver,
  type ValueKind,
} from './value-kinds.js'

/** Resolves `Note` as a resource and `Priority` as an enum; nothing else. */
const RESOLVE: TypeNameResolver = (name) =>
  name === 'Note' ? 'resource' : name === 'Priority' ? 'enum' : undefined

describe('VALUE_KINDS', () => {
  it('is the closed set of labels', () => {
    expect(VALUE_KINDS).toEqual([
      'date',
      'number',
      'boolean',
      'string',
      'record',
      'list',
      'reference',
      'other',
    ])
  })

  it('recognizes exactly those labels', () => {
    for (const label of VALUE_KINDS) expect(isValueKind(label)).toBe(true)
    for (const other of ['', 'text', 'Date', 'object', 'null', 'constructor', 1, null]) {
      expect(isValueKind(other)).toBe(false)
    }
  })
})

describe('expectedValueKinds', () => {
  const cases: [string, PropertyType | undefined, readonly ValueKind[] | undefined][] = [
    ['an absent type, which is a string', undefined, ['string']],
    ['string', 'string', ['string']],
    ['integer', 'integer', ['number']],
    ['number', 'number', ['number']],
    ['boolean', 'boolean', ['boolean']],
    ['date', 'date', ['date']],
    ['point', 'point', ['list', 'record']],
    ['rgb', 'rgb', ['list', 'record']],
    ['rect', 'rect', ['record']],
    ['a resource', { resource: 'Note' }, ['reference']],
    ['an enum', { enum: 'Priority' }, ['string']],
    ['a list', { array: 'date' }, ['list']],
    ['file: not checked', 'file', undefined],
    ['data: not checked', 'data', undefined],
    ['any: not checked', 'any', undefined],
    ['a name that resolves to nothing: not checked', { resource: 'Nowhere' }, undefined],
    ['a list of an unchecked type: not checked', { array: 'any' }, undefined],
  ]
  it.each(cases)('%s', (_case, type, expected) => {
    expect(expectedValueKinds(type, RESOLVE)).toEqual(expected)
  })

  it('asks the resolver with the preferred kind of each form', () => {
    const asked: [string, string][] = []
    const resolve: TypeNameResolver = (name, preferred) => {
      asked.push([name, preferred])
      return preferred
    }
    expectedValueKinds({ resource: 'A' }, resolve)
    expectedValueKinds({ enum: 'B' }, resolve)
    expect(asked).toEqual([
      ['A', 'resource'],
      ['B', 'enum'],
    ])
  })
})

describe('possibleValueKinds', () => {
  it('is the expected kinds of a type with no names, in label order', () => {
    expect(possibleValueKinds('string')).toEqual(['string'])
    expect(possibleValueKinds('rgb')).toEqual(['record', 'list'])
    expect(possibleValueKinds({ array: 'date' })).toEqual(['list'])
  })

  it('takes a named type as either a reference or a string, in label order', () => {
    expect(possibleValueKinds({ resource: 'Anything' })).toEqual(['string', 'reference'])
    expect(possibleValueKinds({ enum: 'Anything' })).toEqual(['string', 'reference'])
  })

  it('is undefined for a type that is not checked', () => {
    expect(possibleValueKinds('any')).toBeUndefined()
    expect(possibleValueKinds('file')).toBeUndefined()
    expect(possibleValueKinds({ array: 'data' })).toBeUndefined()
  })
})

describe('describeDeclaredType', () => {
  it('shows primitives, lists, references, and enums', () => {
    expect(describeDeclaredType(undefined)).toBe('string')
    expect(describeDeclaredType('date')).toBe('date')
    expect(describeDeclaredType({ array: { array: 'string' } })).toBe('list of list of string')
    expect(describeDeclaredType({ resource: 'Note' })).toBe('Note')
    expect(describeDeclaredType({ enum: 'Priority' })).toBe('Priority')
  })
})
