/**
 * Tests for the rule that says when a resource's primary identifier may rely
 * on the default targeting, and which resources are refused because it may
 * not.
 *
 * Expected values are written by hand from phases/13 D10 ("Identifier
 * targeting"): an identifier with no `targeting` is looked up with the app's
 * `id` specifier (`byId`), and that default is valid only when the
 * identifier's property is the class's dictionary id, code `ID  `, whatever
 * the property is named. Any other identifier declares its targeting. The
 * primary identifier is judged as resolved, inherited identifiers and
 * properties included; a singleton root's `byRoot` targeting is derived and
 * always declared.
 *
 * @see ../../../../phases/13-sdk-value-and-execution-contracts.md §D10
 * @see `man 5 sdef`, the `code` attribute of a property
 */

import { describe, expect, it } from 'vitest'
import { identifierTargetingProblem, untargetedIdentifiers } from './identifier-targeting.js'
import { parseManifestYaml } from './loader.js'
import type { AppManifest } from './schemas/app.js'
import type { Property } from './schemas/property.js'
import type { Identifier, Resource } from './schemas/resource.js'

/** The phrase every refusal states the rule in. */
const RULE = "the class's dictionary id, code ID"

/** A read-only string property, with the dictionary code `code` when one is given. */
function property(code?: string): Property {
  return {
    access: 'r',
    type: 'string',
    description: 'A property',
    optional: false,
    ...(code === undefined ? {} : { code }),
  }
}

/** A resource with `properties` and the one primary identifier `identifier`. */
function resource(identifier: Identifier, properties: Record<string, Property>): Resource {
  return {
    name: 'Document',
    plural: 'Documents',
    description: 'A document',
    properties,
    identifiers: [identifier],
  }
}

/** A minimal manifest holding `resources`. */
function manifestWith(resources: AppManifest['resources']): AppManifest {
  return {
    version: '1.0',
    app: { name: 'Pages', bundleId: 'com.example.pages', tccEntitlements: [] },
    suites: [],
    resources,
    enums: {},
    hierarchy: { children: {} },
    relationships: [],
    commands: {},
  }
}

describe('identifierTargetingProblem accepts', () => {
  // Guards that the default keys on the dictionary code, not the name: a
  // class whose dictionary id is spelled `uid` (Calendar's event) keeps it.
  it('the default on a property with code ID under any name', () => {
    const event = resource({ property: 'uid', primary: true }, { uid: property('ID  ') })
    expect(identifierTargetingProblem('Event', event)).toBeUndefined()
  })

  // Guards that the default on the class's own `id` is unchanged.
  it('the default on an `id` property with code ID', () => {
    const item = resource({ property: 'id', primary: true }, { id: property('ID  ') })
    expect(identifierTargetingProblem('Item', item)).toBeUndefined()
  })

  // Guards that any declared targeting is the curator's call, the explicit
  // `byId` included: the rule refuses only an identifier left to the default.
  it.each(['byId', 'byProperty', 'byKey'] as const)('an explicit %s on `name`', (targeting) => {
    const document = resource(
      { property: 'name', primary: true, targeting },
      { name: property('pnam') }
    )
    expect(identifierTargetingProblem('Document', document)).toBeUndefined()
  })

  // Guards that a singleton root, whose identifier normalisation derives with
  // `byRoot`, is never refused.
  it('a singleton root', () => {
    const manifest = parseManifestYaml(`
version: '1.0'
app: { name: Desks, bundleId: com.example.desks, tccEntitlements: [] }
suites: []
enums: {}
relationships: []
hierarchy: { children: {} }
commands: {}
resources:
  Desk:
    name: Desk
    plural: Desks
    description: A desk
    roots:
      front:
        property: frontDesk
        evidence: { source: dictionary, bundleId: com.example.desks, appVersion: '1.0', osVersion: '27.2', term: front desk }
    properties: {}
`)
    expect(untargetedIdentifiers(manifest)).toEqual([])
  })

  // Guards that a resource with no identifier is not judged: nothing about it
  // is looked up by an identifier.
  it('a resource with no identifier', () => {
    const memo: Resource = { name: 'Memo', plural: 'Memos', description: 'A memo', properties: {} }
    expect(identifierTargetingProblem('Memo', memo)).toBeUndefined()
  })
})

describe('identifierTargetingProblem refuses', () => {
  // Guards the shape of the 8 shipped documents and layers whose get, update
  // and delete looked an item up by `byId(name)`, which finds nothing.
  it('`name` with no targeting', () => {
    const document = resource({ property: 'name', primary: true }, { name: property('pnam') })
    const problem = identifierTargetingProblem('Document', document)
    expect(problem).toContain('"Document"')
    expect(problem).toContain('"name"')
    expect(problem).toContain(RULE)
  })

  // Guards that a class having an `id` does not make another identifier valid
  // for the default: `byId` matches the id, never the name (Notes, Terminal).
  it('`name` with no targeting on a class that also has an `id`', () => {
    const window = resource(
      { property: 'name', primary: true },
      { id: property('ID  '), name: property('pnam') }
    )
    const problem = identifierTargetingProblem('Window', window)
    expect(problem).toContain('"Window"')
    expect(problem).toContain('"name"')
    expect(problem).toContain(RULE)
  })

  // Guards that a property with no code (one the dictionary does not declare,
  // or an identifier not listed under properties) never qualifies.
  it.each([
    ['declared with no code', { serial: property() }],
    ['not declared as a property', {}],
  ])('an identifier property %s', (_label, properties) => {
    const part = resource({ property: 'serial', primary: true }, properties)
    const problem = identifierTargetingProblem('Part', part)
    expect(problem).toContain('"Part"')
    expect(problem).toContain('"serial"')
    expect(problem).toContain(RULE)
  })

  // Guards that the primary identifier is the one judged: a later `id` entry
  // does not rescue an untargeted primary `name`.
  it('an untargeted primary identifier beside a non-primary `id`', () => {
    const document: Resource = {
      ...resource({ property: 'name', primary: true }, { id: property('ID  '), name: property() }),
      identifiers: [
        { property: 'id', primary: false },
        { property: 'name', primary: true },
      ],
    }
    expect(identifierTargetingProblem('Document', document)).toContain('"name"')
  })
})

describe('untargetedIdentifiers', () => {
  // Guards that inherited identifiers count (D10, "Identifiers travel with
  // their claims"): a subclass that declares none is judged on the identifier,
  // targeting and property code it inherits, and is refused under its own key.
  it('refuses an inherited untargeted identifier on the subclass', () => {
    const manifest = parseManifestYaml(`
version: '1.0'
app: { name: Pages, bundleId: com.example.pages, tccEntitlements: [] }
suites: []
enums: {}
relationships: []
hierarchy: { children: {} }
commands: {}
resources:
  Document:
    name: Document
    plural: Documents
    description: A document
    identifiers:
      - { property: name, primary: true }
    properties:
      name: { access: r, type: string, description: Its name, code: pnam }
  TextDocument:
    name: TextDocument
    plural: TextDocuments
    description: A text document
    inherits:
      resource: Document
      evidence: { source: dictionary, bundleId: com.example.pages, appVersion: '1.0', osVersion: '27.2', term: document }
    properties:
      text: { access: r, type: string, description: Its text, code: ctxt }
`)
    const found = untargetedIdentifiers(manifest)
    expect(found.map((entry) => [entry.resourceKey, entry.property])).toEqual([
      ['Document', 'name'],
      ['TextDocument', 'name'],
    ])
    expect(found[1]?.problem).toContain('"TextDocument"')
    expect(found[1]?.problem).toContain(RULE)
  })

  // Guards that an inherited dictionary id keeps the default on the subclass:
  // the code is looked up on the properties the subclass inherits.
  it('accepts a subclass inheriting an identifier on a code ID property', () => {
    const manifest = parseManifestYaml(`
version: '1.0'
app: { name: Pages, bundleId: com.example.pages, tccEntitlements: [] }
suites: []
enums: {}
relationships: []
hierarchy: { children: {} }
commands: {}
resources:
  Item:
    name: Item
    plural: Items
    description: An item
    identifiers:
      - { property: id, primary: true }
    properties:
      id: { access: r, type: string, description: Its id, code: 'ID  ' }
  Book:
    name: Book
    plural: Books
    description: A book
    inherits:
      resource: Item
      evidence: { source: dictionary, bundleId: com.example.pages, appVersion: '1.0', osVersion: '27.2', term: item }
    properties: {}
`)
    expect(untargetedIdentifiers(manifest)).toEqual([])
  })

  // Guards that a resource marked unsupported, which no surface offers, is
  // never refused.
  it('skips a resource marked unsupported', () => {
    const manifest = manifestWith({
      Document: {
        ...resource({ property: 'name', primary: true }, { name: property('pnam') }),
        unsupported: {
          evidence: {
            source: 'dictionary',
            bundleId: 'com.example.pages',
            appVersion: '1.0',
            osVersion: '27.2',
            term: 'document',
            finding: 'no-class',
          },
        },
      },
    })
    expect(untargetedIdentifiers(manifest)).toEqual([])
  })

  // Guards the order generation and registration report in: declaration
  // order, one entry per refused resource, with the identifier property.
  it('lists each refused resource once, in declaration order', () => {
    const manifest = manifestWith({
      Window: resource({ property: 'name', primary: true }, { name: property('pnam') }),
      Tab: resource({ property: 'id', primary: true }, { id: property('ID  ') }),
      Paragraph: resource({ property: 'paragraphId', primary: true }, { paragraphId: property() }),
    })
    expect(
      untargetedIdentifiers(manifest).map(({ resourceKey, property: name }) => [resourceKey, name])
    ).toEqual([
      ['Window', 'name'],
      ['Paragraph', 'paragraphId'],
    ])
  })
})
