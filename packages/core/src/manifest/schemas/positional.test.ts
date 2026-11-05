/**
 * Tests for the manifest's `positional` marker: a resource whose objects have
 * no identifier and are found by their zero-based position within their
 * parent.
 *
 * Expected outcomes are written by hand from phases/13 D10 ("Positional
 * resources"): the marker carries curated evidence (a note, when it was
 * observed and on which app version); nothing is inferred from a missing
 * identifier. The schema refuses the marker on a resource that has a
 * primary identifier, on one whose get records no parent, on one whose
 * parent the app does not find by its identifier, and on one whose item
 * commands select an item by anything but an integer position. Generation
 * and registration refuse by the same rule (their own tests).
 *
 * @see ../../../../../phases/13-sdk-value-and-execution-contracts.md (D10)
 * @see ../test-support/panes-positional.ts
 */

import * as yaml from 'js-yaml'
import { describe, expect, it } from 'vitest'
import { emittedReferenceForm, omittedOutputReason } from '../output-references.js'
import { isPositional } from '../positional.js'
import { PANES_MANIFEST_YAML, panesManifest } from '../test-support/panes-positional.js'
import { AppManifestSchema } from './app.js'

/** The raw Panes manifest, as an editable object. */
interface Raw {
  resources: Record<string, Record<string, unknown>>
  commands: Record<string, Record<string, unknown>>
}

/** The raw Panes manifest, edited by `edit`. */
function panes(edit: (raw: Raw) => void = () => undefined): unknown {
  const raw = yaml.load(PANES_MANIFEST_YAML) as Raw
  edit(raw)
  return raw
}

/** The resource `key` of a raw manifest; fails when it is absent. */
function resource(raw: Raw, key: string): Record<string, unknown> {
  const found = raw.resources[key]
  if (found === undefined) throw new Error(`the Panes fixture has no resource ${key}`)
  return found
}

/** The command `key` of a raw manifest; fails when it is absent. */
function command(raw: Raw, key: string): Record<string, unknown> {
  const found = raw.commands[key]
  if (found === undefined) throw new Error(`the Panes fixture has no command ${key}`)
  return found
}

function issues(input: unknown): { path: PropertyKey[]; message: string }[] {
  const result = AppManifestSchema.safeParse(input)
  return result.success ? [] : result.error.issues.map(({ path, message }) => ({ path, message }))
}

describe('a positional resource', () => {
  it('is accepted with curated evidence, a parent-scoped get and an integer position', () => {
    expect(issues(panes())).toEqual([])
    const manifest = panesManifest()
    expect(isPositional(manifest, 'Tab')).toBe(true)
    expect(isPositional(manifest, 'Window')).toBe(false)
  })

  it('is refused with a primary identifier, which it would be found by instead', () => {
    const marked = panes((raw) => {
      const tab = resource(raw, 'Tab')
      tab['properties'] = {
        ...(tab['properties'] as object),
        id: { access: 'r', type: 'integer', description: "The tab's id", code: 'ID  ' },
      }
      tab['identifiers'] = [{ property: 'id', primary: true }]
    })

    expect(issues(marked)).toEqual([
      {
        path: ['resources', 'Tab', 'positional'],
        message:
          '"Tab" is found by its primary identifier "id", so it cannot also be positional: a positional resource has no identifier. Remove positional, or the identifier.',
      },
    ])
  })

  it('is refused when its get records no parent', () => {
    const atApplication = panes((raw) => {
      const get = command(raw, 'getTab')
      delete get['parent']
      get['parameters'] = [
        { name: 'index', type: 'integer', description: 'The tab', required: true },
      ]
      delete raw.commands['listTabs']
    })

    expect(issues(atApplication)).toContainEqual({
      path: ['resources', 'Tab', 'positional'],
      message:
        'A positional resource is found by its position within its parent, so the get "getTab" of "Tab" must record that parent.',
    })
  })

  it('is refused with no get', () => {
    const noGet = panes((raw) => {
      delete raw.commands['getTab']
    })

    expect(issues(noGet)).toEqual([
      {
        path: ['resources', 'Tab', 'positional'],
        message:
          'A positional resource is found by its position within its parent, through its get, so "Tab" needs a get that records that parent.',
      },
    ])
  })

  it('is refused within a parent the app does not find by its identifier', () => {
    const unidentifiedParent = panes((raw) => {
      delete resource(raw, 'Window')['identifiers']
    })

    expect(issues(unidentifiedParent)).toContainEqual({
      path: ['resources', 'Tab', 'positional'],
      message:
        'A positional resource is counted within a parent the app finds at the application by its identifier, but "Window", the parent the get "getTab" of "Tab" records, is not: it needs a primary identifier and a get.',
    })
  })

  // The get, update and delete bodies find the parent at the application
  // (\`app.windows.byId(id)\`), so a window held in a group is out of reach.
  it('is refused within a parent that is itself found within another', () => {
    const nested = panes((raw) => {
      raw.resources['Group'] = {
        name: 'Group',
        plural: 'Groups',
        description: 'A group of windows',
        properties: {
          id: { access: 'r', type: 'integer', description: "The group's id", code: 'ID  ' },
        },
        identifiers: [{ property: 'id', primary: true }],
      }
      raw.commands['getGroup'] = {
        name: 'get',
        description: 'Get a group',
        scope: 'resource',
        resourceType: 'Group',
        parameters: [{ name: 'id', type: 'integer', description: 'The group', required: true }],
      }
      const getWindow = command(raw, 'getWindow')
      getWindow['parent'] = { resource: 'Group', parameter: 'groupId' }
      getWindow['parameters'] = [
        { name: 'groupId', type: 'integer', description: 'The group', required: true },
        ...(getWindow['parameters'] as object[]),
      ]
    })

    expect(issues(nested)).toContainEqual({
      path: ['resources', 'Tab', 'positional'],
      message:
        'A positional resource is counted within a parent the app finds at the application by its identifier, but "Window", the parent the get "getTab" of "Tab" records, is found within "Group". Nested parents are not supported yet.',
    })
  })

  it.each<[string, Record<string, unknown> | undefined]>([
    ['records no parent', undefined],
    ['records a parent other than its get’s', { resource: 'Tab', parameter: 'windowId' }],
  ])('is refused when an item command %s', (_label, parent) => {
    const parentless = panes((raw) => {
      raw.commands['deleteTab'] = {
        name: 'delete',
        description: 'Close a tab',
        scope: 'resource',
        resourceType: 'Tab',
        ...(parent === undefined ? {} : { parent }),
        parameters: [
          { name: 'windowId', type: 'integer', description: 'The window', required: true },
          { name: 'index', type: 'integer', description: 'The tab', required: true },
        ],
      }
    })

    expect(issues(parentless)).toContainEqual({
      path: ['commands', 'deleteTab', 'parent'],
      message:
        'The delete command "deleteTab" selects an item of the positional resource "Tab" within its parent, so it must record the parent "Window", as the get "getTab" does.',
    })
  })

  it('is refused when an item command selects it by anything but an integer position', () => {
    const byName = panes((raw) => {
      const parameters = command(raw, 'getTab')['parameters'] as Record<string, unknown>[]
      const position = parameters[1]
      if (position === undefined) throw new Error('getTab has no position parameter')
      position['type'] = 'string'
    })

    expect(issues(byName)).toEqual([
      {
        path: ['commands', 'getTab', 'parameters', 1, 'type'],
        message:
          'The get command "getTab" selects an item of the positional resource "Tab" by its zero-based position, so its item parameter "index" must be of type integer.',
      },
    ])
  })

  it.each<[string, Record<string, unknown>]>([
    ['with no evidence', {}],
    [
      'with evidence from another source',
      {
        evidence: {
          source: 'probe',
          note: 'n',
          observedAt: '2026-11-01T12:00:00.000Z',
          appVersion: '1.0',
        },
      },
    ],
    [
      'with no note',
      {
        evidence: { source: 'curated', observedAt: '2026-11-01T12:00:00.000Z', appVersion: '1.0' },
      },
    ],
    ['with no observation time', { evidence: { source: 'curated', note: 'n', appVersion: '1.0' } }],
    [
      'with no app version',
      { evidence: { source: 'curated', note: 'n', observedAt: '2026-11-01T12:00:00.000Z' } },
    ],
  ])('is refused %s', (_label, marker) => {
    const unproven = panes((raw) => {
      resource(raw, 'Tab')['positional'] = marker
    })

    expect(issues(unproven).length).toBeGreaterThan(0)
    expect(
      issues(unproven).every(
        ({ path }) => path.slice(0, 3).join('.') === 'resources.Tab.positional'
      )
    ).toBe(true)
  })
})

describe('references to a positional resource at outputs (D7)', () => {
  const manifest = panesManifest()

  it('are emitted as index selectors', () => {
    expect(emittedReferenceForm(manifest, 'Tab')).toBe('index')
    expect(emittedReferenceForm(manifest, 'Window')).toBe('identity')
  })

  it('are kept at a field of the parent’s own record, which carries the container', () => {
    expect(omittedOutputReason(manifest, 'Tab', 'Window')).toBeUndefined()
  })

  it('are left out of a command result, which no window record carries', () => {
    expect(omittedOutputReason(manifest, 'Tab')).toBe('parent-scoped')
  })
})
