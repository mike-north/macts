/** Hierarchy placements constrain positional list/create routes without guessing scope. */
import { describe, expect, it } from 'vitest'
import { panesManifest } from './test-support/panes-positional.js'
import { AppManifestSchema } from './schemas/app.js'
import { generateConsolidatedPackages } from '../generator/orchestrate.js'
import { buildNativeBody } from '../jxa/native-scripts.js'

type Placement = 'nested' | 'both' | 'multiple' | 'unplaced' | 'top'
type Holder = 'Window' | 'Group' | undefined

/** A fresh Panes manifest whose list/create routes exercise declared containment. */
function containmentManifest(placement: Placement, holder: Holder, operation: 'list' | 'create') {
  const manifest = panesManifest()
  const window = manifest.resources['Window']
  const getWindow = manifest.commands['getWindow']
  if (window === undefined || getWindow === undefined) throw new Error('Panes requires Window')
  manifest.resources['Group'] = { ...window, name: 'Group', plural: 'Groups' }
  manifest.commands['getGroup'] = { ...getWindow, resourceType: 'Group' }
  const tab = { resource: 'Tab', access: 'r' as const, description: 'Tabs' }
  if (placement === 'unplaced') manifest.hierarchy.children = {}
  else {
    const windows = manifest.hierarchy.children['windows']
    if (windows === undefined) throw new Error('Panes requires windows')
    if (placement === 'top') delete windows.children
    if (placement === 'both' || placement === 'top') manifest.hierarchy.children['tabs'] = tab
    manifest.hierarchy.children['groups'] = {
      resource: 'Group',
      access: 'r',
      description: 'Groups',
      ...(placement === 'multiple' ? { children: { tabs: tab } } : {}),
    }
  }
  const key = operation === 'list' ? 'listTabs' : 'createTab'
  manifest.commands[key] = {
    name: operation,
    description: `${operation} tabs`,
    scope: 'resource',
    resourceType: 'Tab',
    ...(holder === undefined ? {} : { parent: { resource: holder, parameter: 'parentId' } }),
    parameters:
      holder === undefined
        ? []
        : [{ name: 'parentId', type: 'integer', description: 'Parent', required: true }],
  }
  if (operation === 'create') delete manifest.commands['listTabs']
  return manifest
}

/** Expected placement behavior is independent of a get's parent. */
const cases: readonly [Placement, Holder, boolean][] = [
  ['nested', undefined, false],
  ['nested', 'Window', true],
  ['nested', 'Group', false],
  ['both', undefined, true],
  ['both', 'Window', true],
  ['both', 'Group', false],
  ['multiple', undefined, false],
  ['multiple', 'Window', true],
  ['multiple', 'Group', true],
  ['unplaced', undefined, true],
  ['unplaced', 'Group', true],
  ['top', 'Group', false],
]

describe.each(['list', 'create'] as const)('%s containment', (operation) => {
  it('refuses the application-scoped body when the collection is nested only', () => {
    const manifest = containmentManifest('nested', undefined, operation)
    const key = operation === 'list' ? 'listTabs' : 'createTab'
    const body = buildNativeBody(manifest, { command: key, resource: 'Tab' })
    expect(body).toContain(operation === 'list' ? 'app["tabs"]' : 'item.make();')
    expect(AppManifestSchema.safeParse(manifest).success).toBe(false)
  })

  it('refuses a body scoped under a resource that does not hold the collection', () => {
    const manifest = containmentManifest('nested', 'Group', operation)
    const key = operation === 'list' ? 'listTabs' : 'createTab'
    const body = buildNativeBody(manifest, { command: key, resource: 'Tab' })
    expect(body).toContain('app["groups"]')
    expect(AppManifestSchema.safeParse(manifest).success).toBe(false)
  })

  it.each(cases)('%s placement with %s parent: admitted=%s', (placement, holder, admitted) => {
    const manifest = containmentManifest(placement, holder, operation)
    const schema = AppManifestSchema.safeParse(manifest)
    expect(schema.success).toBe(admitted)
    if (!schema.success) {
      const key = operation === 'list' ? 'listTabs' : 'createTab'
      expect(
        schema.error.issues.some(
          ({ path }) =>
            path.join('.') === `commands.${key}.parent${holder === undefined ? '' : '.resource'}`
        )
      ).toBe(true)
    }
    const generated = generateConsolidatedPackages(manifest, { appName: 'panes' })
    expect(generated.errors.length === 0).toBe(admitted)
  })
})

describe('inactive containment declarations', () => {
  const evidence = {
    source: 'live' as const,
    observedAt: '2026-11-01T06:05:32.244Z',
    bundleId: 'com.example.panes',
    appVersion: '1.0',
    osVersion: '27.2',
    expression: 'the collection',
    errorNumber: -1728,
  }

  it.each(['list', 'create'] as const)(
    'does not impose containment on an unsupported %s command',
    (operation) => {
      const manifest = containmentManifest('nested', undefined, operation)
      const key = operation === 'list' ? 'listTabs' : 'createTab'
      const command = manifest.commands[key]
      if (command === undefined) throw new Error('fixture command missing')
      command.unsupported = { evidence }
      expect(AppManifestSchema.safeParse(manifest).success).toBe(true)
      expect(generateConsolidatedPackages(manifest, { appName: 'panes' }).errors).toEqual([])
    }
  )

  it('does not treat a descendant of an unsupported holder as a usable placement', () => {
    const manifest = containmentManifest('multiple', 'Group', 'list')
    const group = manifest.resources['Group']
    if (group === undefined) throw new Error('fixture group missing')
    group.unsupported = { evidence }
    const result = AppManifestSchema.safeParse(manifest)
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(
        result.error.issues.some(
          ({ path }) => path.join('.') === 'commands.listTabs.parent.resource'
        )
      ).toBe(true)
    }
  })
})

/** A command under Tab can only be ignored when it has no usable route. */
function commandUnderTab(unsupported: boolean) {
  const manifest = panesManifest()
  manifest.commands['closed'] = {
    name: 'closed',
    description: 'Unavailable command',
    scope: 'application',
    parent: { resource: 'Tab', parameter: 'tabId' },
    parameters: [{ name: 'tabId', type: 'integer', description: 'Tab', required: true }],
    ...(unsupported
      ? {
          unsupported: {
            evidence: {
              source: 'live' as const,
              observedAt: '2026-11-01T06:05:32.244Z',
              bundleId: 'com.example.panes',
              appVersion: '1.0',
              osVersion: '27.2',
              expression: 'the command',
              errorNumber: -1728,
            },
          },
        }
      : {}),
  }
  return manifest
}

describe('commands under a positional parent', () => {
  it.each([
    [true, true],
    [false, false],
  ])('unsupported=%s is admitted=%s', (unsupported, admitted) => {
    const manifest = commandUnderTab(unsupported)
    expect(AppManifestSchema.safeParse(manifest).success).toBe(admitted)
    expect(generateConsolidatedPackages(manifest, { appName: 'panes' }).errors.length === 0).toBe(
      admitted
    )
  })
})

// Regression (#287): non-CRUD item commands must meet the same position and parent contract as get.
describe('positional resource commands', () => {
  it.each(['parent', 'type', 'nullable', 'missing'] as const)(
    'refuses invalid %s addressing',
    (shape) => {
      const manifest = panesManifest()
      const get = manifest.commands['getTab']
      if (get === undefined) throw new Error('Panes requires getTab')
      const subject = structuredClone(get)
      subject.name = 'activate'
      manifest.commands['activate'] = subject
      if (shape === 'parent') delete subject.parent
      const position = subject.parameters.find(({ name }) => name === 'index')
      if (position === undefined) throw new Error('Panes requires index')
      if (shape === 'type') position.type = 'string'
      if (shape === 'missing')
        subject.parameters = subject.parameters.filter(({ name }) => name !== 'index')
      if (shape === 'nullable') {
        position.nullable = true
        position.evidence = { nullable: { source: 'curated', note: 'Fixture allows null' } }
      }
      expect(AppManifestSchema.safeParse(manifest).success).toBe(false)
      expect(generateConsolidatedPackages(manifest, { appName: 'panes' }).errors.join(' ')).toMatch(
        /activate.*(parent|position)|positional.*activate/
      )
    }
  )
})
