/**
 * Tests for the two addressing forms the Archive fixture exercises: an
 * identifier found by the app's key specifier (`targeting: byKey`), and a
 * singleton root, a resource whose one object the app holds as one of its own
 * properties (`root`).
 *
 * Expected outcomes are written by hand from phases/13 D10 ("Identifier
 * targeting", "Singleton roots"):
 *
 * - `byKey` takes the identifier property's value as the key; a
 *   `runtimeProperty`, which names the property a match is made on, has no
 *   meaning there and is rejected.
 * - A root names the app's accessor for the property, with the dictionary
 *   term it spells. Its one object needs no identifier and is held in no
 *   collection, so a root declares no identifiers, no collection spelling and
 *   no range read; its only standard command is a get that takes no
 *   identifier and records no parent; no command finds anything within it
 *   yet, and no hierarchy entry (each of which is a collection) names it.
 *
 * @see ../../../../../phases/13-sdk-value-and-execution-contracts.md (D10)
 */

import { load } from 'js-yaml'
import { describe, expect, it } from 'vitest'
import { ARCHIVE_MANIFEST_YAML } from '../test-support/archive-key-and-root.js'
import { resolveRoot } from '../roots.js'
import { AppManifestSchema } from './app.js'

/** The parts of the Archive source the variants below change. */
interface ArchiveSource {
  resources: Record<string, Record<string, unknown> & { identifiers?: Record<string, unknown>[] }>
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

/** The issues validating `source` reports, as `path: message` lines. */
function issuesOf(source: ArchiveSource): string[] {
  const result = AppManifestSchema.safeParse(source)
  if (result.success) return []
  return result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`)
}

const ROOT_EVIDENCE = {
  source: 'dictionary',
  bundleId: 'com.example.archive',
  appVersion: '1.0',
  osVersion: '27.2',
  term: 'front desk',
} as const

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
    expect(issuesOf(source).map((line) => line.split(':')[0])).toEqual([
      'resources.Entry.identifiers.0.targeting',
    ])
  })
})

describe('singleton roots', () => {
  it('records the application property and its evidence', () => {
    const manifest = AppManifestSchema.parse(archiveSource())
    expect(manifest.resources['Desk']?.root).toEqual({
      property: 'frontDesk',
      evidence: ROOT_EVIDENCE,
    })
    expect(resolveRoot(manifest, 'Desk')).toEqual({
      property: 'frontDesk',
      evidence: ROOT_EVIDENCE,
    })
  })

  it('resolves no root for a resource reached through a collection, or an unknown key', () => {
    const manifest = AppManifestSchema.parse(archiveSource())
    expect(resolveRoot(manifest, 'Entry')).toBeUndefined()
    expect(resolveRoot(manifest, 'Nope')).toBeUndefined()
  })

  it('requires the property and its dictionary evidence', () => {
    const missingProperty = archiveSource()
    resourceOf(missingProperty, 'Desk')['root'] = { property: '', evidence: ROOT_EVIDENCE }
    expect(issuesOf(missingProperty).map((line) => line.split(':')[0])).toEqual([
      'resources.Desk.root.property',
    ])
    const missingEvidence = archiveSource()
    resourceOf(missingEvidence, 'Desk')['root'] = { property: 'frontDesk' }
    expect(issuesOf(missingEvidence).map((line) => line.split(':')[0])).toEqual([
      'resources.Desk.root.evidence',
    ])
  })

  it('rejects an identifier on a root', () => {
    const source = archiveSource()
    resourceOf(source, 'Desk')['identifiers'] = [{ property: 'clerk', primary: true }]
    expect(issuesOf(source)).toEqual([
      'resources.Desk.identifiers: The application holds one front desk as its "frontDesk" property, so a root declares no identifier; remove identifiers.',
    ])
  })

  it('rejects a collection spelling and a range read on a root, which is in no collection', () => {
    const source = archiveSource()
    resourceOf(source, 'Desk')['native'] = {
      collection: 'frontDesks',
      evidence: { ...ROOT_EVIDENCE, term: 'front desks' },
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
      'resources.Desk.native: A root is held by the application as its "frontDesk" property, not in a collection, so it records no collection spelling; remove native.',
      'resources.Desk.rangeRead: A root is held by the application as its "frontDesk" property, not in a collection, so it records no range read; remove rangeRead.',
    ])
  })

  it.each(['list', 'create', 'update', 'delete'])(
    'rejects a %s of a root, which has only its get',
    (shape) => {
      const source = archiveSource()
      source.commands[`${shape}Desk`] = {
        name: shape,
        description: `${shape} the desk`,
        scope: 'resource',
        resourceType: 'Desk',
      }
      expect(issuesOf(source)).toEqual([
        `commands.${shape}Desk.name: "Desk" is the application's "frontDesk" property, a single object, so its only standard command is a get; remove the ${shape}.`,
      ])
    }
  )

  it('rejects a command that applies to every resource with a standard name, since it covers the root', () => {
    const source = archiveSource()
    source.commands['deleteAny'] = { name: 'delete', description: 'Delete', scope: 'resource' }
    expect(issuesOf(source)).toEqual([
      'commands.deleteAny.name: "Desk" is the application\'s "frontDesk" property, a single object, so its only standard command is a get; remove the delete.',
    ])
  })

  it('rejects a get of a root that takes an identifier', () => {
    const source = archiveSource()
    const getDesk = source.commands['getDesk']
    if (getDesk === undefined) throw new Error('the Archive fixture has no getDesk')
    getDesk['parameters'] = [{ name: 'id', type: 'string', description: 'The desk' }]
    expect(issuesOf(source)).toEqual([
      'commands.getDesk.parameters: The get of "Desk" reads the application\'s "frontDesk" property, so it takes no required parameter; make "id" optional or remove it.',
    ])
  })

  it('accepts an optional parameter on the get of a root', () => {
    const source = archiveSource()
    const getDesk = source.commands['getDesk']
    if (getDesk === undefined) throw new Error('the Archive fixture has no getDesk')
    getDesk['parameters'] = [
      { name: 'verbose', type: 'boolean', description: 'Say more', required: false },
    ]
    expect(issuesOf(source)).toEqual([])
  })

  it('rejects a root as the get parent or as a command parent', () => {
    const asParent = archiveSource()
    asParent.commands['getLabel'] = {
      name: 'get',
      description: 'Get a label on the desk',
      scope: 'resource',
      resourceType: 'Label',
      parent: { resource: 'Desk', parameter: 'deskId' },
      parameters: [
        { name: 'deskId', type: 'string', description: 'The desk' },
        { name: 'id', type: 'string', description: 'The label' },
      ],
    }
    expect(issuesOf(asParent)).toEqual([
      'commands.getLabel.parent.resource: "Desk" is the application\'s "frontDesk" property, which has no identifier to carry in a parameter, so it cannot be a parent yet.',
    ])

    const rootGetWithParent = archiveSource()
    const getDesk = rootGetWithParent.commands['getDesk']
    if (getDesk === undefined) throw new Error('the Archive fixture has no getDesk')
    getDesk['parent'] = { resource: 'Volume', parameter: 'volumeId' }
    getDesk['parameters'] = [{ name: 'volumeId', type: 'string', description: 'The volume' }]
    expect(issuesOf(rootGetWithParent)).toContain(
      'commands.getDesk.parent: The get of "Desk" reads the application\'s "frontDesk" property, so it records no parent; remove parent.'
    )
  })

  it('rejects a hierarchy entry naming a root, since each entry is a collection', () => {
    const source = archiveSource()
    source.hierarchy.children['desks'] = { resource: 'Desk', access: 'r' }
    expect(issuesOf(source)).toEqual([
      'hierarchy.children.desks.resource: "Desk" is the application\'s "frontDesk" property, not a collection, so no hierarchy entry names it.',
    ])
  })

  it('rejects a nested hierarchy entry naming a root', () => {
    const source = archiveSource()
    const volumes = source.hierarchy.children['volumes']
    if (volumes === undefined) throw new Error('the Archive fixture has no volumes entry')
    volumes['children'] = { desks: { resource: 'Desk', access: 'r' } }
    expect(issuesOf(source)).toEqual([
      'hierarchy.children.volumes.children.desks.resource: "Desk" is the application\'s "frontDesk" property, not a collection, so no hierarchy entry names it.',
    ])
  })
})
