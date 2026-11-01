/**
 * Unit tests for mapping manifest types to value-type expressions and SDK
 * types.
 *
 * Each case is one row of the mapping table: a manifest type at an output
 * (read) or input (write) position, and the `ValueTypes` expression and SDK
 * type it must render as. Expected strings are written by hand from the
 * table and the value library's constructor signatures.
 *
 * @see phases/13-sdk-value-and-execution-contracts.md §D2 (SDK types)
 * @see phases/13-sdk-value-and-execution-contracts.md §D7 (reference value types, ReferenceList)
 * @see phases/13-sdk-value-and-execution-contracts.md §D8 (file values at outputs, file sources at inputs)
 */

import { describe, expect, it } from 'vitest'
import type { AppManifest } from '../../manifest/index.js'
import type { DeclaredType } from '../surface.js'
import {
  ValueRenderer,
  createNameResolver,
  mapDeclaredType,
  normalizeTypeName,
  stringLiteral,
  type ValuePosition,
  type ValueShape,
} from './value-mapping.js'

/**
 * Resources: `TextItem` (plural `Text Items`, string id), `Window` (integer
 * id), `Tag` (no id). Enums: `SaveOption`. `Shared` is both a resource and an
 * enum, to pin which wins where.
 */
const manifest: AppManifest = {
  version: '1.0',
  app: { name: 'Fixture', bundleId: 'com.example.fixture', tccEntitlements: [] },
  resources: {
    TextItem: {
      name: 'TextItem',
      plural: 'Text Items',
      description: 'A text item',
      properties: {
        uid: { access: 'r', type: 'string', description: 'Id', optional: false },
      },
      identifiers: [{ property: 'uid', primary: true }],
    },
    Window: {
      name: 'Window',
      plural: 'Windows',
      description: 'A window',
      properties: {
        index: { access: 'r', type: 'integer', description: 'Index', optional: false },
      },
      identifiers: [{ property: 'index', primary: true }],
    },
    Tag: { name: 'Tag', plural: 'Tags', description: 'A tag', properties: {} },
    Shared: { name: 'Shared', plural: 'Shareds', description: 'Shared', properties: {} },
  },
  enums: {
    SaveOption: { name: 'SaveOption', values: [{ name: 'yes', value: 'yes' }] },
    Shared: { name: 'Shared', values: [{ name: 'x', value: 'x' }] },
  },
  hierarchy: { children: {} },
  suites: [],
  relationships: [],
  commands: {},
}

const names = createNameResolver(manifest)

const IDENTIFIERS: Readonly<Record<string, ValueShape>> = {
  TextItem: { kind: 'string' },
  Window: { kind: 'integer' },
}

function renderer(): ValueRenderer {
  return new ValueRenderer({
    enumMembers: (enumKey) => `${enumKey.charAt(0).toLowerCase()}${enumKey.slice(1)}Members`,
    recordInterface: (resourceKey) => resourceKey,
    identifier: (resourceKey) => IDENTIFIERS[resourceKey],
    resourcesBinding: 'resources',
  })
}

/** Map and render one declared type at `position`. */
function render(type: DeclaredType, position: ValuePosition) {
  const mapped = mapDeclaredType(type, position, names)
  const r = renderer()
  return {
    expression: r.expression(mapped.shape),
    sdk: r.sdkType(mapped.shape),
    resolved: mapped.resolved,
  }
}

/** Assert a type renders the same at both positions. */
function expectBoth(type: DeclaredType, expression: string, sdk: string): void {
  for (const position of ['output', 'input'] as const) {
    expect(render(type, position)).toEqual({ expression, sdk, resolved: true })
  }
}

describe('primitive types', () => {
  it('maps string and boolean to themselves', () => {
    expectBoth('string', 't.string()', 'string')
    expectBoth('boolean', 't.boolean()', 'boolean')
  })

  it('maps integer to Integer and number to a double', () => {
    expectBoth('integer', 't.integer()', 'Integer')
    expectBoth('number', 't.double()', 'number')
  })

  it('maps date, point, rect, and rgb to their value types', () => {
    expectBoth('date', 't.date()', 'Date')
    expectBoth('point', 't.point()', 'Point')
    expectBoth('rect', 't.rectangle()', 'Rectangle')
    expectBoth('rgb', 't.rgb()', 'Rgb')
  })

  it('maps any to unknown', () => {
    expectBoth('any', 't.unknown()', 'unknown')
  })

  it('maps an absent property type to a string, the manifest default', () => {
    expectBoth(undefined, 't.string()', 'string')
  })
})

describe('file-like types', () => {
  it('are file values where an operation returns them', () => {
    expect(render('file', 'output')).toEqual({
      expression: 't.file()',
      sdk: 'FileValue',
      resolved: true,
    })
    expect(render('data', 'output')).toEqual({
      expression: 't.file()',
      sdk: 'FileValue',
      resolved: true,
    })
  })

  it('are file sources where an operation consumes them', () => {
    expect(render('file', 'input')).toEqual({
      expression: 't.fileSource()',
      sdk: 'FileSource',
      resolved: true,
    })
    expect(render('data', 'input')).toEqual({
      expression: 't.fileSource()',
      sdk: 'FileSource',
      resolved: true,
    })
  })

  it('keep their position inside arrays', () => {
    expect(render({ array: 'file' }, 'output').expression).toBe('t.array(t.file())')
    expect(render({ array: 'file' }, 'input').expression).toBe('t.array(t.fileSource())')
  })
})

describe('enums', () => {
  it('map { enum: E } to an enumeration of its member tuple, typed by the enum', () => {
    expectBoth({ enum: 'SaveOption' }, 't.enumeration(saveOptionMembers)', 'SaveOption')
  })

  it('resolve by normalized name', () => {
    expectBoth({ enum: 'save option' }, 't.enumeration(saveOptionMembers)', 'SaveOption')
    expectBoth({ enum: 'save_option' }, 't.enumeration(saveOptionMembers)', 'SaveOption')
  })

  it('resolve a bare name that names an enum', () => {
    expectBoth('SaveOption', 't.enumeration(saveOptionMembers)', 'SaveOption')
    expectBoth('save-option', 't.enumeration(saveOptionMembers)', 'SaveOption')
  })
})

describe('references', () => {
  it('map { resource: R } to a single reference read through the lazy resource table', () => {
    expectBoth(
      { resource: 'TextItem' },
      "t.reference<TextItem, string>(() => resources, 'TextItem', 'one')",
      'ObjectReferenceVariant<TextItem, string>'
    )
  })

  it("type the identifier by the target resource's identifier", () => {
    expectBoth(
      { resource: 'Window' },
      "t.reference<Window, Integer>(() => resources, 'Window', 'one')",
      'ObjectReferenceVariant<Window, Integer>'
    )
  })

  it('type the identifier as never when the target has none (selector forms only)', () => {
    expectBoth(
      { resource: 'Tag' },
      "t.reference<Tag, never>(() => resources, 'Tag', 'one')",
      'ObjectReferenceVariant<Tag, never>'
    )
  })

  it('resolve by normalized key, name, or plural', () => {
    for (const name of ['textitem', 'text item', 'Text Items', 'text-items', 'TEXT_ITEM']) {
      expect(render({ resource: name }, 'output').expression).toBe(
        "t.reference<TextItem, string>(() => resources, 'TextItem', 'one')"
      )
    }
  })

  it('resolve a bare name that names only a resource', () => {
    expect(render('window', 'output').sdk).toBe('ObjectReferenceVariant<Window, Integer>')
  })

  it('map an array of references to a materialized reference list', () => {
    expectBoth(
      { array: { resource: 'Window' } },
      "t.array(t.reference<Window, Integer>(() => resources, 'Window', 'one'))",
      'readonly ObjectReferenceVariant<Window, Integer>[]'
    )
  })
})

describe('resolution precedence', () => {
  it('checks resources first for { resource }', () => {
    expect(render({ resource: 'Shared' }, 'output').expression).toBe(
      "t.reference<Shared, never>(() => resources, 'Shared', 'one')"
    )
  })

  it('checks enums first for { enum } and bare names', () => {
    expect(render({ enum: 'Shared' }, 'output').expression).toBe('t.enumeration(sharedMembers)')
    expect(render('Shared', 'output').expression).toBe('t.enumeration(sharedMembers)')
  })

  it('falls back to the other kind when the first does not match', () => {
    expect(render({ resource: 'SaveOption' }, 'output').expression).toBe(
      't.enumeration(saveOptionMembers)'
    )
    expect(render({ enum: 'Tag' }, 'output').expression).toBe(
      "t.reference<Tag, never>(() => resources, 'Tag', 'one')"
    )
  })
})

describe('arrays', () => {
  it('map { array: X } to an array of X, with a readonly SDK type', () => {
    expectBoth({ array: 'date' }, 't.array(t.date())', 'readonly Date[]')
  })

  it('parenthesize nested readonly arrays in the SDK type', () => {
    expectBoth(
      { array: { array: 'string' } },
      't.array(t.array(t.string()))',
      'readonly (readonly string[])[]'
    )
  })
})

describe('unresolved types', () => {
  it('map an unknown multi-word name to unknown and report it unresolved', () => {
    for (const position of ['output', 'input'] as const) {
      expect(render({ resource: 'icon view options' }, position)).toEqual({
        expression: 't.unknown()',
        sdk: 'unknown',
        resolved: false,
      })
      expect(render('Rich text', position)).toEqual({
        expression: 't.unknown()',
        sdk: 'unknown',
        resolved: false,
      })
    }
  })

  it('report an array of an unresolved name unresolved, as an array of unknown', () => {
    expect(render({ array: 'Rich text' }, 'output')).toEqual({
      expression: 't.array(t.unknown())',
      sdk: 'readonly unknown[]',
      resolved: false,
    })
  })

  it('report a record with no recognized key unresolved', () => {
    expect(render({ list: 'string' }, 'input').resolved).toBe(false)
    expect(render({ enum: 'SaveOption', extra: 'x' }, 'input').resolved).toBe(false)
  })
})

describe('descriptions', () => {
  it('attach to the outermost value type', () => {
    const r = renderer()
    expect(r.expression({ kind: 'string' }, 'The name')).toBe(
      "t.string({ description: 'The name' })"
    )
    expect(r.expression({ kind: 'array', item: { kind: 'date' } }, 'Due dates')).toBe(
      "t.array(t.date(), { description: 'Due dates' })"
    )
    expect(r.expression({ kind: 'enum', enumKey: 'SaveOption' }, 'Save?')).toBe(
      "t.enumeration(saveOptionMembers, { description: 'Save?' })"
    )
    expect(r.expression({ kind: 'reference', resourceKey: 'Tag' }, 'Owner')).toBe(
      "t.reference<Tag, never>(() => resources, 'Tag', 'one', { description: 'Owner' })"
    )
  })
})

describe('usage tracking', () => {
  it('records the contract types and enum tuples rendered output refers to', () => {
    const r = renderer()
    r.sdkType({ kind: 'integer' })
    r.sdkType({ kind: 'array', item: { kind: 'reference', resourceKey: 'Window' } })
    r.expression({ kind: 'enum', enumKey: 'SaveOption' })
    r.sdkType({ kind: 'string' })
    expect([...r.usedTypes].sort()).toEqual(['Integer', 'ObjectReferenceVariant'])
    expect([...r.usedEnums]).toEqual(['SaveOption'])
  })
})

describe('normalizeTypeName', () => {
  it('lowercases and drops spaces, dashes, and underscores', () => {
    expect(normalizeTypeName('Text Item')).toBe('textitem')
    expect(normalizeTypeName('text-item')).toBe('textitem')
    expect(normalizeTypeName('TEXT_ITEM')).toBe('textitem')
  })
})

describe('stringLiteral', () => {
  it('quotes text so quotes, backslashes, and line breaks round-trip', () => {
    expect(stringLiteral('plain')).toBe("'plain'")
    expect(stringLiteral("it's")).toBe("'it\\'s'")
    expect(stringLiteral('say "hi"')).toBe(`'say "hi"'`)
    expect(stringLiteral('a\\b')).toBe("'a\\\\b'")
    expect(stringLiteral('line\nbreak')).toBe("'line\\nbreak'")
  })
})
