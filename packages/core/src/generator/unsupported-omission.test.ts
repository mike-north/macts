/**
 * Cross-surface tests: a property marked `unsupported` is a field of its
 * resource in no generated public surface.
 *
 * The manifest keeps a property the app's dictionary declares but the app
 * cannot provide, with the evidence; every generated surface (the contract,
 * the legacy SDK types, the MCP tool and capability input schemas, the shared
 * create input, and the CLI plugin) leaves it out, on input and output alike.
 *
 * Fields are read structurally (see `./test-support/surface-fields.ts`), not by
 * searching the generated text: a marked name may legitimately appear as a
 * command parameter, a parent identifier, or the canonical `id` alias.
 *
 * Expected field lists are derived by hand from the Jotter fixture: its
 * declared properties, minus the ones marked here.
 *
 * @see ../manifest/unsupported.ts
 * @see ../manifest/schemas/evidence.ts (UnsupportedSchema)
 */

import { readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  AppManifestSchema,
  resolvePrimaryIdentifierProperty,
  type AppManifest,
  type Property,
  type Resource,
  type Unsupported,
} from '../manifest/index.js'
import { loadManifest, parseManifestYaml } from '../manifest/loader.js'
import { JOTTER_MANIFEST_YAML } from './contract/test-fixtures.js'
import {
  exposedProperties,
  exposedUnsupportedProperties,
  generatedFieldLists,
  type FieldList,
} from './test-support/surface-fields.js'

const MANIFESTS_DIR = resolve(process.cwd(), '../../manifests')

const MARK: Unsupported = {
  reason: 'The app does not implement this property.',
  evidence: {
    source: 'probe',
    observedAt: '2026-11-01T06:05:32.244Z',
    bundleId: 'com.example.jotter',
    appVersion: '2.1',
    osVersion: '27.2',
    sampleSize: 40,
    failedReads: 40,
    errorNumbers: [-1728],
  },
}

const MARK_YAML = `
        unsupported:
          reason: The app does not implement this property.
          evidence:
            source: probe
            observedAt: '2026-11-01T06:05:32.244Z'
            bundleId: com.example.jotter
            appVersion: '2.1'
            osVersion: '27.2'
            sampleSize: 40
            failedReads: 40
            errorNumbers: [-1728]`

/** A kind-form marker: every value of a declared string was an object reference. */
const KIND_MARK_YAML = `
        unsupported:
          reason: Values are object references, which the generated code cannot decode yet.
          trackingIssue: 155
          evidence:
            source: probe
            observedAt: '2026-11-01T06:05:32.244Z'
            bundleId: com.example.jotter
            appVersion: '2.1'
            osVersion: '27.2'
            sampleSize: 3
            observedKinds: { reference: 3 }`

/** Insert text after the one occurrence of an anchor in the fixture YAML. */
function insertAfter(text: string, anchor: string, addition: string): string {
  const index = text.indexOf(anchor)
  if (index === -1 || text.includes(anchor, index + 1)) {
    throw new Error(`the fixture anchor must occur exactly once: ${anchor}`)
  }
  return text.slice(0, index + anchor.length) + addition + text.slice(index + anchor.length)
}

/**
 * The Jotter fixture with a CLI hierarchy (so the CLI plugin has resource
 * commands) and, when `marked`, `Note.rating` (writable, every read failed)
 * and `Tag.label` (read-only, every value a reference: kind evidence) marked
 * unsupported.
 */
function jotter(marked: boolean): AppManifest {
  let text = JOTTER_MANIFEST_YAML.replace(
    'hierarchy:\n  children: {}',
    'hierarchy:\n  children:\n    notes: { resource: Note, access: rw }\n    tags: { resource: Tag, access: r }'
  )
  if (marked) {
    text = insertAfter(text, "description: The note's rating\n        optional: true", MARK_YAML)
    text = insertAfter(text, "description: The tag's label", KIND_MARK_YAML)
  }
  return parseManifestYaml(text)
}

/** The fields of one list, by its surface name and resource. */
function fieldsOf(lists: readonly FieldList[], surface: string, resourceKey: string): string[] {
  const list = lists.find((l) => l.surface === surface && l.resourceKey === resourceKey)
  if (list === undefined) throw new Error(`no field list "${surface}" for ${resourceKey}`)
  return [...list.fields]
}

describe('a fixture with properties marked unsupported', () => {
  const lists = generatedFieldLists(jotter(true))

  it('leaves them out of the contract records and inputs', () => {
    // Note declares uid, title, priority, folder, attachment, created,
    // wordCount, rating; rating is marked.
    const noteRecord = ['uid', 'title', 'priority', 'folder', 'attachment', 'created', 'wordCount']
    expect(fieldsOf(lists, 'contract interface Note', 'Note')).toEqual(noteRecord)
    expect(fieldsOf(lists, 'contract noteRecordType', 'Note')).toEqual(noteRecord)
    // Create input: writable properties (title, priority), then the create
    // command's parameters (folderId, title, attachment).
    expect(fieldsOf(lists, 'contract interface NoteCreateInput', 'Note')).toEqual([
      'title',
      'priority',
      'folderId',
      'attachment',
    ])
    expect(fieldsOf(lists, 'contract noteCreateInputType', 'Note')).toEqual([
      'title',
      'priority',
      'folderId',
      'attachment',
    ])
    // Update input: the create input minus the positional identifiers.
    expect(fieldsOf(lists, 'contract interface NoteUpdateInput', 'Note')).toEqual([
      'title',
      'priority',
      'attachment',
    ])
    // Tag declares label and name; label is marked.
    expect(fieldsOf(lists, 'contract interface Tag', 'Tag')).toEqual(['name'])
    expect(fieldsOf(lists, 'contract tagRecordType', 'Tag')).toEqual(['name'])
  })

  it('leaves them out of the legacy SDK types and schemas', () => {
    // The read type adds the canonical `id` alias for a resource with an
    // identifier; Tag has none.
    expect(fieldsOf(lists, 'SDK interface Note', 'Note')).toEqual([
      'id',
      'uid',
      'title',
      'priority',
      'folder',
      'attachment',
      'created',
      'wordCount',
    ])
    expect(fieldsOf(lists, 'SDK NoteSchema', 'Note')).not.toContain('rating')
    expect(fieldsOf(lists, 'SDK interface NoteCreateInput', 'Note')).toEqual([
      'title',
      'priority',
      'folderId',
      'attachment',
    ])
    expect(fieldsOf(lists, 'SDK interface Tag', 'Tag')).toEqual(['name'])
    expect(fieldsOf(lists, 'SDK TagSchema', 'Tag')).toEqual(['name'])
  })

  it('leaves them out of the MCP and capability input schemas', () => {
    // createNote: its parameters, plus the writable properties not already
    // parameters (priority).
    expect(fieldsOf(lists, 'MCP createNote input schema', 'Note').sort()).toEqual(
      ['attachment', 'folderId', 'priority', 'title'].sort()
    )
    expect(fieldsOf(lists, 'MCP updateNote input schema', 'Note')).not.toContain('rating')
    expect(fieldsOf(lists, 'capability jotter.notes.create input schema', 'Note').sort()).toEqual(
      ['attachment', 'folderId', 'priority', 'title'].sort()
    )
  })

  it('leaves them out of the shared create input', () => {
    expect(fieldsOf(lists, 'create input of Note', 'Note')).toEqual([
      'title',
      'priority',
      'folderId',
      'attachment',
    ])
  })

  it('leaves them out of the CLI options and the fields it prints', () => {
    const cli = lists.filter((l) => l.surface.startsWith('CLI '))
    // The CLI has list commands for both resources, so it reads both.
    expect(new Set(cli.map((l) => l.resourceKey))).toEqual(new Set(['Note', 'Tag']))
    const noteFields = cli.filter((l) => l.resourceKey === 'Note').flatMap((l) => l.fields)
    expect(noteFields).toContain('wordCount')
    expect(noteFields).not.toContain('rating')
    const tagFields = cli.filter((l) => l.resourceKey === 'Tag').flatMap((l) => l.fields)
    expect(tagFields).toContain('name')
    expect(tagFields).not.toContain('label')
  })

  it('exposes no marked property anywhere, with either evidence form', () => {
    const manifest = jotter(true)
    expect(manifest.resources['Note']?.properties['rating']?.unsupported?.evidence).toHaveProperty(
      'errorNumbers'
    )
    expect(manifest.resources['Tag']?.properties['label']?.unsupported?.evidence).toHaveProperty(
      'observedKinds'
    )
    expect(exposedUnsupportedProperties(manifest)).toEqual([])
  })

  it('still generates the marked properties when unmarked (the check is not vacuous)', () => {
    // The same fields, generated without the markers, expose both properties
    // in every surface family the check reads.
    const exposed = exposedProperties(
      generatedFieldLists(jotter(false)),
      new Map([
        ['Note', new Set(['rating'])],
        ['Tag', new Set(['label'])],
      ])
    )
    const families = (property: string): Set<string> =>
      new Set(
        exposed
          .filter((e) => e.property === property)
          .map((e) => e.surface.split(' ')[0] ?? e.surface)
      )
    expect(families('rating')).toEqual(
      new Set(['contract', 'SDK', 'MCP', 'capability', 'create', 'CLI'])
    )
    // A read-only property is an output field only: records, read types, and
    // the CLI's printed fields.
    expect(families('label')).toEqual(new Set(['contract', 'SDK', 'CLI']))
  })
})

// ---------------------------------------------------------------------------
// Every shipped manifest
// ---------------------------------------------------------------------------

/** Every shipped manifest, loaded and validated. */
async function shippedManifests(): Promise<[string, AppManifest][]> {
  const entries = await readdir(MANIFESTS_DIR, { withFileTypes: true })
  const apps = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name)
  return Promise.all(
    apps.sort().map(async (app): Promise<[string, AppManifest]> => {
      return [app, await loadManifest(resolve(MANIFESTS_DIR, app, 'app.yaml'))]
    })
  )
}

/** A property marked unsupported, with any nullability claim removed. */
function marked(property: Property): Property {
  const {
    nullable: _nullable,
    resettable: _resettable,
    evidence: _evidence,
    ...unclaimed
  } = property
  return { ...unclaimed, unsupported: MARK }
}

/**
 * A manifest with every property but each resource's primary identifier
 * marked unsupported, validated: the widest marking the schema allows.
 */
function markEveryProperty(manifest: AppManifest): AppManifest {
  const resources = Object.fromEntries(
    Object.entries(manifest.resources).map(([key, resource]): [string, Resource] => {
      const identifier = resolvePrimaryIdentifierProperty(resource)
      const properties = Object.fromEntries(
        Object.entries(resource.properties).map(([name, property]): [string, Property] => [
          name,
          name === identifier ? property : marked(property),
        ])
      )
      return [key, { ...resource, properties }]
    })
  )
  return AppManifestSchema.parse({ ...manifest, resources })
}

describe('every shipped manifest', async () => {
  const manifests = await shippedManifests()

  it('finds the shipped manifests', () => {
    expect(manifests.length).toBeGreaterThan(0)
  })

  it.each(manifests)(
    '%s: no property marked unsupported is a generated field',
    (_app, manifest) => {
      expect(exposedUnsupportedProperties(manifest)).toEqual([])
    }
  )

  it.each(manifests)(
    '%s: with every non-identifier property marked, none is a generated field',
    (_app, manifest) => {
      expect(exposedUnsupportedProperties(markEveryProperty(manifest))).toEqual([])
    }
  )
})
