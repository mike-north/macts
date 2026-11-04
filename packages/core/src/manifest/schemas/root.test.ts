/**
 * Tests for the two addressing forms the Archive fixture exercises: an
 * identifier found by the app's key specifier (`targeting: byKey`), and a
 * singleton root, a resource whose objects the app holds as its own
 * properties, one per kind (`roots`).
 *
 * Expected outcomes are written by hand from phases/13 D10 ("Identifier
 * targeting", "Singleton roots"):
 *
 * - `byKey` takes the identifier property's value as the key; a
 *   `runtimeProperty`, which names the property a match is made on, has no
 *   meaning there and is rejected.
 * - A root maps each kind to the app's spelling of the application property
 *   holding it, with the dictionary term it spells. Its identity is derived:
 *   validation gives it a closed enum of its kinds (`<Resource>Kind`), a
 *   read-only `kind` property of that enum, and a unique primary identifier
 *   on `kind` with `byRoot` targeting, and accepts exactly those pieces when
 *   a validated manifest is validated again. A root's standard commands are a
 *   get taking one required parameter of the kind enum, and a list taking
 *   none; it records no collection spelling, no range read and no parent, is
 *   no command's parent, and no hierarchy entry (each a collection) names it.
 *
 * @see ../../../../../phases/13-sdk-value-and-execution-contracts.md (D10)
 */

import { load } from 'js-yaml'
import { describe, expect, it } from 'vitest'
import { ARCHIVE_MANIFEST_YAML } from '../test-support/archive-key-and-root.js'
import { normalizeRoots, resolveRoots, rootProperties } from '../roots.js'
import { AppManifestSchema } from './app.js'

/** The parts of the Archive source the variants below change. */
interface ArchiveSource {
  resources: Record<string, Record<string, unknown> & { identifiers?: Record<string, unknown>[] }>
  enums: Record<string, unknown>
  commands: Record<string, Record<string, unknown>>
  hierarchy: { children: Record<string, Record<string, unknown>> }
}

/** A fresh copy of the Archive manifest source, before validation. */
function archiveSource(): ArchiveSource {
  return load(ARCHIVE_MANIFEST_YAML) as ArchiveSource
}

/** The resource `key` of `source`; fails the test when the fixture lacks it. */
function resourceOf(source: ArchiveSource, key: string): Record<string, unknown> {
  const resource = source.resources[key]
  if (resource === undefined) throw new Error(`the Archive fixture has no ${key}`)
  return resource
}

/** The command `key` of `source`; fails the test when the fixture lacks it. */
function commandOf(source: ArchiveSource, key: string): Record<string, unknown> {
  const command = source.commands[key]
  if (command === undefined) throw new Error(`the Archive fixture has no ${key}`)
  return command
}

/** The issues validating `source` reports, as `path: message` lines. */
function issuesOf(source: unknown): string[] {
  const result = AppManifestSchema.safeParse(source)
  if (result.success) return []
  return result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`)
}

/** The paths of the issues validating `source` reports. */
function issuePathsOf(source: unknown): string[] {
  return issuesOf(source).map((line) => line.split(':')[0] ?? '')
}

/** Dictionary evidence for the root property spelling `term`. */
function rootEvidence(term: string) {
  return {
    source: 'dictionary',
    bundleId: 'com.example.archive',
    appVersion: '1.0',
    osVersion: '27.2',
    term,
  } as const
}

describe('the Archive fixture', () => {
  it('validates', () => {
    expect(issuesOf(archiveSource())).toEqual([])
  })
})

describe('key targeting (byKey)', () => {
  it('keeps the targeting and the identifier property', () => {
    const manifest = AppManifestSchema.parse(archiveSource())
    expect(manifest.resources['Entry']?.identifiers).toEqual([
      { property: 'location', primary: true, targeting: 'byKey' },
    ])
  })

  it('rejects a runtimeProperty, since the key is the identifier value itself', () => {
    const source = archiveSource()
    const identifier = resourceOf(source, 'Entry')['identifiers']
    if (!Array.isArray(identifier)) throw new Error('the Archive Entry has no identifiers')
    ;(identifier[0] as Record<string, unknown>)['runtimeProperty'] = 'title'
    expect(issuesOf(source)).toEqual([
      'resources.Entry.identifiers.0.runtimeProperty: runtimeProperty names the property a byProperty match is made on; byKey looks the item up by the identifier value itself, so remove it.',
    ])
  })

  it('rejects an unknown targeting', () => {
    const source = archiveSource()
    const identifier = resourceOf(source, 'Entry')['identifiers']
    if (!Array.isArray(identifier)) throw new Error('the Archive Entry has no identifiers')
    ;(identifier[0] as Record<string, unknown>)['targeting'] = 'byName'
    expect(issuePathsOf(source)).toEqual(['resources.Entry.identifiers.0.targeting'])
  })
})

describe('singleton roots: the identity validation derives', () => {
  it('records each kind with its application property and evidence', () => {
    const manifest = AppManifestSchema.parse(archiveSource())
    const roots = resolveRoots(manifest, 'Desk')
    expect(roots).toEqual({
      front: { property: 'frontDesk', evidence: rootEvidence('front desk') },
      back: { property: 'backDesk', evidence: rootEvidence('back desk') },
    })
    expect(roots === undefined ? undefined : rootProperties(roots)).toEqual({
      front: 'frontDesk',
      back: 'backDesk',
    })
  })

  it('resolves no roots for a resource reached through a collection, or an unknown key', () => {
    const manifest = AppManifestSchema.parse(archiveSource())
    expect(resolveRoots(manifest, 'Entry')).toBeUndefined()
    expect(resolveRoots(manifest, 'Nope')).toBeUndefined()
  })

  it('adds the kind enum, a read-only kind property, and a unique byRoot identifier', () => {
    const manifest = AppManifestSchema.parse(archiveSource())
    expect(manifest.enums['DeskKind']?.values).toEqual([
      { name: 'front', value: 'front' },
      { name: 'back', value: 'back' },
    ])
    const desk = manifest.resources['Desk']
    expect(desk?.properties['kind']).toMatchObject({
      access: 'r',
      type: { enum: 'DeskKind' },
      optional: false,
    })
    expect(desk?.identifiers).toEqual([
      {
        property: 'kind',
        primary: true,
        targeting: 'byRoot',
        unique: true,
        evidence: {
          unique: {
            source: 'curated',
            note: 'Each kind names one application property, which holds one object.',
          },
        },
      },
    ])
  })

  it('validates a validated manifest to the same manifest', () => {
    const once = AppManifestSchema.parse(archiveSource())
    expect(AppManifestSchema.parse(once)).toEqual(once)
  })

  it('replaces any identifiers a root already carries with the single kind identifier', () => {
    const manifest = AppManifestSchema.parse(archiveSource())
    const desk = manifest.resources['Desk']
    const entryIdentifiers = manifest.resources['Entry']?.identifiers
    if (desk === undefined || entryIdentifiers === undefined) throw new Error('fixture lacks Desk')
    const inherited = {
      ...manifest,
      resources: { ...manifest.resources, Desk: { ...desk, identifiers: entryIdentifiers } },
    }
    const normalized = normalizeRoots(inherited).resources['Desk']
    expect(normalized?.identifiers).toHaveLength(1)
    expect(normalized?.identifiers?.[0]).toMatchObject({
      property: 'kind',
      primary: true,
      targeting: 'byRoot',
    })
  })

  it('gives a one-kind root that kind as its only value', () => {
    const source = archiveSource()
    resourceOf(source, 'Desk')['roots'] = {
      front: { property: 'frontDesk', evidence: rootEvidence('front desk') },
    }
    const manifest = AppManifestSchema.parse(source)
    expect(manifest.enums['DeskKind']?.values).toEqual([{ name: 'front', value: 'front' }])
    expect(manifest.resources['Desk']?.identifiers?.[0]?.property).toBe('kind')
  })

  it('requires at least one kind, each a lower camel case name', () => {
    const empty = archiveSource()
    resourceOf(empty, 'Desk')['roots'] = {}
    expect(issuePathsOf(empty)).toContain('resources.Desk.roots')
    const badKind = archiveSource()
    resourceOf(badKind, 'Desk')['roots'] = {
      'Front desk': { property: 'frontDesk', evidence: rootEvidence('front desk') },
    }
    expect(issuePathsOf(badKind)).toContain('resources.Desk.roots.Front desk')
  })

  it('requires each kind’s property and its dictionary evidence', () => {
    const missingProperty = archiveSource()
    resourceOf(missingProperty, 'Desk')['roots'] = {
      front: { property: '', evidence: rootEvidence('front desk') },
    }
    expect(issuePathsOf(missingProperty)).toEqual(['resources.Desk.roots.front.property'])
    const missingEvidence = archiveSource()
    resourceOf(missingEvidence, 'Desk')['roots'] = { front: { property: 'frontDesk' } }
    expect(issuePathsOf(missingEvidence)).toEqual(['resources.Desk.roots.front.evidence'])
  })

  it('rejects an identifier of its own on a root', () => {
    const source = archiveSource()
    resourceOf(source, 'Desk')['identifiers'] = [{ property: 'clerk', primary: true }]
    expect(issuesOf(source)).toEqual([
      'resources.Desk.identifiers: "Desk" is identified by its kind, which its roots define; remove identifiers.',
    ])
  })

  it('rejects a kind property of another type, and a kind enum with other values', () => {
    const property = archiveSource()
    const properties = resourceOf(property, 'Desk')['properties'] as Record<string, unknown>
    properties['kind'] = { access: 'r', type: 'string', description: 'The kind' }
    expect(issuesOf(property)).toEqual([
      'resources.Desk.properties.kind: "Desk" holds its kind in "kind", of the enum DeskKind its roots define; remove the property.',
    ])
    const enumValues = archiveSource()
    enumValues.enums['DeskKind'] = {
      name: 'DeskKind',
      values: [{ name: 'front', value: 'front' }],
    }
    expect(issuesOf(enumValues)).toEqual([
      'enums.DeskKind: The enum DeskKind is the kinds of the root "Desk", which its roots define; remove the enum or rename it.',
    ])
  })

  it('rejects byRoot targeting on a resource with no roots', () => {
    const source = archiveSource()
    const identifiers = resourceOf(source, 'Volume')['identifiers']
    if (!Array.isArray(identifiers)) throw new Error('the Archive Volume has no identifiers')
    ;(identifiers[0] as Record<string, unknown>)['targeting'] = 'byRoot'
    expect(issuesOf(source)).toEqual([
      'resources.Volume.identifiers.0.targeting: byRoot targeting finds a root\'s object from its kind, and "Volume" records no roots; choose another targeting.',
    ])
  })

  it('rejects a collection spelling and a range read on a root, which is in no collection', () => {
    const source = archiveSource()
    resourceOf(source, 'Desk')['native'] = {
      collection: 'deskList',
      evidence: rootEvidence('desk list'),
    }
    resourceOf(source, 'Desk')['rangeRead'] = {
      supported: false,
      evidence: {
        source: 'probe',
        observedAt: '2026-11-01T12:00:00.000Z',
        bundleId: 'com.example.archive',
        appVersion: '1.0',
        osVersion: '27.2',
        errorNumbers: [-1728],
      },
    }
    expect(issuesOf(source)).toEqual([
      'resources.Desk.native: A root is held by the application as its properties, not in a collection, so it records no collection spelling; remove native.',
      'resources.Desk.rangeRead: A root is held by the application as its properties, not in a collection, so it records no range read; remove rangeRead.',
    ])
  })
})

describe('singleton roots: commands and the hierarchy', () => {
  it.each(['create', 'update', 'delete'])('rejects a %s of a root', (shape) => {
    const source = archiveSource()
    source.commands[`${shape}Desk`] = {
      name: shape,
      description: `${shape} a desk`,
      scope: 'resource',
      resourceType: 'Desk',
    }
    expect(issuesOf(source)).toEqual([
      `commands.${shape}Desk.name: "Desk" is held by the application as its properties, so it has no ${shape}; its standard commands are a get and a list.`,
    ])
  })

  it('rejects a command that applies to every resource with a standard name, since it covers the root', () => {
    const source = archiveSource()
    source.commands['deleteAny'] = { name: 'delete', description: 'Delete', scope: 'resource' }
    expect(issuesOf(source)).toEqual([
      'commands.deleteAny.name: "Desk" is held by the application as its properties, so it has no delete; its standard commands are a get and a list.',
    ])
  })

  it.each([
    ['no parameter', []],
    ['a string parameter', [{ name: 'kind', type: 'string', description: 'Which desk' }]],
    [
      'two required parameters',
      [
        { name: 'kind', type: { enum: 'DeskKind' }, description: 'Which desk' },
        { name: 'floor', type: 'string', description: 'Which floor' },
      ],
    ],
  ])('rejects a get of a root that takes %s', (_case, parameters) => {
    const source = archiveSource()
    commandOf(source, 'getDesk')['parameters'] = parameters
    expect(issuesOf(source)).toEqual([
      'commands.getDesk.parameters: The get of "Desk" finds an object from its kind, so it takes exactly one required parameter, of type { enum: DeskKind }.',
    ])
  })

  it('accepts an optional parameter beside the kind on the get of a root', () => {
    const source = archiveSource()
    commandOf(source, 'getDesk')['parameters'] = [
      { name: 'kind', type: { enum: 'DeskKind' }, description: 'Which desk' },
      { name: 'verbose', type: 'boolean', description: 'Say more', required: false },
    ]
    expect(issuesOf(source)).toEqual([])
  })

  it('rejects a list of a root that takes a required parameter', () => {
    const source = archiveSource()
    commandOf(source, 'listDesks')['parameters'] = [
      { name: 'floor', type: 'string', description: 'Which floor' },
    ]
    expect(issuesOf(source)).toEqual([
      'commands.listDesks.parameters: The list of "Desk" reads every kind the application holds, so it takes no required parameter; make "floor" optional or remove it.',
    ])
  })

  it('rejects a parent on a root command, and a root as a command parent', () => {
    const withParent = archiveSource()
    commandOf(withParent, 'listDesks')['parent'] = { resource: 'Volume', parameter: 'volumeId' }
    commandOf(withParent, 'listDesks')['parameters'] = [
      { name: 'volumeId', type: 'string', description: 'The volume', required: false },
    ]
    expect(issuesOf(withParent)).toContain(
      'commands.listDesks.parent: "Desk" is held by the application as its properties, so its list records no parent; remove parent.'
    )

    const asParent = archiveSource()
    asParent.commands['getLabel'] = {
      name: 'get',
      description: 'Get a label on a desk',
      scope: 'resource',
      resourceType: 'Label',
      parent: { resource: 'Desk', parameter: 'deskKind' },
      parameters: [
        { name: 'deskKind', type: { enum: 'DeskKind' }, description: 'The desk' },
        { name: 'id', type: 'string', description: 'The label' },
      ],
    }
    expect(issuesOf(asParent)).toEqual([
      'commands.getLabel.parent.resource: "Desk" is held by the application as its properties, so nothing is found within one yet; it cannot be a parent.',
    ])
  })

  it('rejects a hierarchy entry naming a root, at the top or nested', () => {
    const top = archiveSource()
    top.hierarchy.children['desks'] = { resource: 'Desk', access: 'r' }
    expect(issuesOf(top)).toEqual([
      'hierarchy.children.desks.resource: "Desk" is held by the application as its properties, not in a collection, so no hierarchy entry names it.',
    ])
    const nested = archiveSource()
    const volumes = nested.hierarchy.children['volumes']
    if (volumes === undefined) throw new Error('the Archive fixture has no volumes entry')
    volumes['children'] = { desks: { resource: 'Desk', access: 'r' } }
    expect(issuesOf(nested)).toEqual([
      'hierarchy.children.volumes.children.desks.resource: "Desk" is held by the application as its properties, not in a collection, so no hierarchy entry names it.',
    ])
  })
})
