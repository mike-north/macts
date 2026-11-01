/**
 * Tests for the kinds a probed property's declared type expects, with its
 * type names resolved against the manifest.
 *
 * Expected kinds are derived by hand from the table's rules: text and enums
 * are strings, integers and numbers are numbers, references are object
 * specifiers, arrays are lists, points and colors are lists or records (both
 * decode), rectangles are records, and files, `any`, and unresolved names are
 * not checked.
 *
 * @see ./value-kinds.ts
 * @see ../manifest/value-kinds.ts
 */

import { describe, expect, it } from 'vitest'
import { createNameResolver } from '../generator/contract/value-mapping.js'
import { parseManifestYaml } from '../manifest/loader.js'
import type { PropertyType } from '../manifest/schemas/property.js'
import type { ValueKind } from '../manifest/value-kinds.js'
import { expectedValueKindsIn } from './value-kinds.js'

const NAMES = createNameResolver(
  parseManifestYaml(`
version: '1.0'
app: { bundleId: com.example.jotter, name: Jotter, tccEntitlements: [] }
resources:
  Note:
    name: Note
    plural: Notes
    description: A note
    properties: {}
enums:
  Priority:
    name: Priority
    description: How urgent
    values:
      - { name: low, value: low }
hierarchy: { children: {} }
commands: {}
`)
)

describe('expectedValueKindsIn: a declared type, resolved against the manifest', () => {
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
    ['an enum', { enum: 'Priority' }, ['string']],
    ['a resource reference', { resource: 'Note' }, ['reference']],
    // Names resolve as the contract generator resolves them: each form tries
    // its own kind first, then the other.
    ['a resource form naming an enum', { resource: 'Priority' }, ['string']],
    ['an enum form naming a resource', { enum: 'Note' }, ['reference']],
    ['an array', { array: 'date' }, ['list']],
    ['file: not checked', 'file', undefined],
    ['data: not checked', 'data', undefined],
    ['any: not checked', 'any', undefined],
    ['a name that is no resource or enum: not checked', { resource: 'Nowhere' }, undefined],
    ['an array of an unresolved name: not checked', { array: { enum: 'Nowhere' } }, undefined],
  ]
  it.each(cases)('%s', (_case, type, expected) => {
    expect(expectedValueKindsIn(type, NAMES)).toEqual(expected)
  })
})
