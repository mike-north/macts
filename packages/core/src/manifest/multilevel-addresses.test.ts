/**
 * Address paths select ancestors explicitly; identity never borrows a position.
 * These fixtures specify selection independently of argument declaration order.
 */
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { AppManifestSchema } from './schemas/app.js'
import { itemIdentifierParameter } from './item-selection.js'
import { panesManifest } from './test-support/panes-positional.js'
import { generateConsolidatedPackages } from '../generator/orchestrate.js'
import type { AppManifest } from './schemas/app.js'
import { buildNativeBody } from '../jxa/native-scripts.js'
import { createNativeCodecFunctions } from '../jxa/native-codec-functions.js'
import { runInNewContext } from 'node:vm'

/** A Session is reached through Window identity and Tab position, never app scope. */
function sessionFixture(): AppManifest {
  const manifest = Object.assign(panesManifest(), { version: '1.1' as const })
  manifest.resources['Session'] = {
    name: 'Session',
    plural: 'Sessions',
    description: 'A terminal session',
    properties: {
      id: {
        access: 'r',
        type: 'string',
        description: 'Session identity',
        code: 'ID  ',
        optional: false,
      },
    },
    identifiers: [{ property: 'id', primary: true }],
  }
  const window = manifest.hierarchy.children['windows']
  const tab = window?.children?.['tabs']
  if (tab === undefined) throw new Error('Fixture requires windows and tabs')
  tab.children = { sessions: { resource: 'Session', access: 'r' } }
  manifest.commands['getSession'] = {
    name: 'get',
    description: 'Read a session in a tab',
    scope: 'resource' as const,
    resourceType: 'Session',
    routeName: 'getWithinTab',
    resolvesReferences: false,
    parameters: [
      {
        name: 'action',
        type: 'string',
        description: 'An unrelated required argument',
        required: true,
      },
      { name: 'sessionId', type: 'string', description: 'Session identity', required: true },
      { name: 'tabIndex', type: 'integer', description: 'Tab position', required: true },
      { name: 'windowId', type: 'integer', description: 'Window identity', required: true },
    ],
    parents: [
      { resource: 'Window', collection: 'windows', by: 'identity', parameter: 'windowId' },
      { resource: 'Tab', collection: 'tabs', by: 'index', parameter: 'tabIndex' },
    ],
    item: { by: 'identity', parameter: 'sessionId' },
  }
  manifest.commands['resolveSession'] = {
    name: 'get',
    description: 'Resolve Session identity within its Window',
    scope: 'resource',
    resourceType: 'Session',
    parent: { resource: 'Window', parameter: 'windowId' },
    identityTraversal: {
      collections: ['tabs'],
      evidence: 'Sessions are elements of tabs in their window',
    },
    parameters: [
      { name: 'windowId', type: 'integer', description: 'Window identity', required: true },
      { name: 'sessionId', type: 'string', description: 'Session identity', required: true },
    ],
  }
  return manifest
}

/** Raw declarations intentionally bypass parsing to exercise generation refusal independently. */
function subject(manifest: AppManifest): Record<string, unknown> {
  const command = manifest.commands['getSession']
  if (command === undefined) throw new Error('Missing fixture command')
  return command
}

describe('multilevel address declarations', () => {
  it('requires format 1.1 rather than silently stripping new address metadata', () => {
    const old = { ...sessionFixture(), version: '1.0' as const }
    const parsed = AppManifestSchema.safeParse(old)
    expect(parsed.success).toBe(false)
    expect(parsed.error?.issues.some(({ message }) => message.includes('1.1'))).toBe(true)
    expect(generateConsolidatedPackages(old, { appName: 'panes' }).errors.join(' ')).toContain(
      '1.1'
    )
  })

  it.each(['resolvesReferences', 'identityTraversal'])('requires 1.1 for %s too', (field) => {
    const manifest = panesManifest()
    const command = manifest.commands['getWindow']
    if (command === undefined) throw new Error('Missing get')
    Object.assign(
      command,
      field === 'resolvesReferences'
        ? { resolvesReferences: false }
        : { identityTraversal: { collections: ['tabs'], evidence: 'Declared tab containment' } }
    )
    expect(AppManifestSchema.safeParse(manifest).success).toBe(false)
    expect(generateConsolidatedPackages(manifest, { appName: 'panes' }).errors.join(' ')).toContain(
      '1.1'
    )
  })

  it('requires 1.1 for properties reserved for separate reads', () => {
    const manifest = panesManifest()
    const property = manifest.resources['Window']?.properties['name']
    if (property === undefined) throw new Error('Missing property')
    Object.assign(property, {
      separateRead: {
        operation: 'readName',
        permission: 'panes:windows:readName',
        reason: 'Independent read cost',
      },
    })
    expect(AppManifestSchema.safeParse(manifest).success).toBe(false)
    expect(generateConsolidatedPackages(manifest, { appName: 'panes' }).errors.join(' ')).toContain(
      '1.1'
    )
  })

  it('makes a 1.0-only runtime reject the format discriminator before reinterpretation', () => {
    const olderRuntime = z.object({
      version: z.literal('1.0'),
      commands: z.record(z.string(), z.object({ name: z.string() })),
    })
    expect(olderRuntime.safeParse(sessionFixture()).success).toBe(false)
    expect(AppManifestSchema.safeParse(panesManifest()).success).toBe(true)
  })

  it('preserves an explicit positional intermediate ancestor when parsing', () => {
    const parsed = AppManifestSchema.parse(sessionFixture())
    expect(subject(parsed)).toMatchObject({
      parents: [
        { resource: 'Window', collection: 'windows', by: 'identity', parameter: 'windowId' },
        { resource: 'Tab', collection: 'tabs', by: 'index', parameter: 'tabIndex' },
      ],
      item: { by: 'identity', parameter: 'sessionId' },
    })
  })

  it('selects the declared item even when an unrelated required argument comes first', () => {
    const command = sessionFixture().commands['getSession']
    if (command === undefined) throw new Error('Missing command')
    expect(itemIdentifierParameter(command)?.name).toBe('sessionId')
  })

  it('executes the supplied ancestors outside-in and never asks for application sessions', () => {
    const manifest = sessionFixture()
    const selectedWindow = manifest.resources['Window']
    if (selectedWindow === undefined) throw new Error('Missing Window')
    selectedWindow.plural = 'OwnedWindows'
    const reads: string[] = []
    const session = { exists: () => true, properties: () => ({ id: 's2' }) }
    const tab = {
      exists: () => true,
      sessions: {
        byId: (id: string) => {
          reads.push(`session:${id}`)
          return session
        },
      },
    }
    const window = {
      exists: () => true,
      tabs: {
        length: 2,
        at: (index: number) => {
          reads.push(`tab:${String(index)}`)
          return tab
        },
      },
    }
    const app = {
      ownedWindows: {
        byId: (id: number) => {
          reads.push(`window:${String(id)}`)
          return window
        },
      },
    }
    const body = buildNativeBody(manifest, { command: 'getSession', resource: 'Session' })
    const result: unknown = runInNewContext(`(function(app,args) { ${body} })(app,args)`, {
      app,
      args: { action: 'unrelated', windowId: 8, tabIndex: 1, sessionId: 's2' },
    })
    expect(result).toEqual({ id: 's2' })
    expect(reads).toEqual(['window:8', 'tab:1', 'session:s2'])
  })

  it.each([
    [
      'legacy and multilevel parents',
      (command: Record<string, unknown>) => {
        command['parent'] = { resource: 'Window', parameter: 'windowId' }
      },
    ],
    [
      'missing item binding',
      (command: Record<string, unknown>) => {
        delete command['item']
      },
    ],
    [
      'unknown selection mode',
      (command: Record<string, unknown>) => {
        command['item'] = { by: 'name', parameter: 'sessionId' }
      },
    ],
    [
      'reused selection parameter',
      (command: Record<string, unknown>) => {
        command['item'] = { by: 'identity', parameter: 'windowId' }
      },
    ],
    [
      'unknown edge',
      (command: Record<string, unknown>) => {
        command['parents'] = [
          { resource: 'Window', collection: 'invented', by: 'identity', parameter: 'windowId' },
        ]
      },
    ],
    [
      'missing intermediate ancestor',
      (command: Record<string, unknown>) => {
        command['parents'] = [
          { resource: 'Window', collection: 'windows', by: 'identity', parameter: 'windowId' },
        ]
      },
    ],
    [
      'position promoted to identity',
      (command: Record<string, unknown>) => {
        command['parents'] = [
          { resource: 'Window', collection: 'windows', by: 'identity', parameter: 'windowId' },
          { resource: 'Tab', collection: 'tabs', by: 'identity', parameter: 'tabIndex' },
        ]
      },
    ],
  ] as const)('refuses %s at parse and generation', (_name, mutate) => {
    const manifest = sessionFixture()
    mutate(subject(manifest))
    expect(AppManifestSchema.safeParse(manifest).success).toBe(false)
    expect(
      generateConsolidatedPackages(manifest, { appName: 'panes' }).errors.length
    ).toBeGreaterThan(0)
  })
})

/** Formats are an opt-in boundary; unrelated manifests keep their established contracts. */
it('retains format 1.0 for every shipped manifest other than the explicit-path adopter', async () => {
  const fs = await import('node:fs/promises')
  const { parseManifestYaml } = await import('./loader.js')
  const root = new URL('../../../../manifests/', import.meta.url)
  for (const entry of await fs.readdir(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    const manifest = parseManifestYaml(
      await fs.readFile(new URL(`${entry.name}/app.yaml`, root), 'utf8')
    )
    expect(manifest.version, entry.name).toBe(entry.name === 'iterm' ? '1.1' : '1.0')
  }
})

it('accepts a positional intermediate after multiple identified ancestors', () => {
  const manifest = sessionFixture()
  const window = manifest.resources['Window']
  const windows = manifest.hierarchy.children['windows']
  const getWindow = manifest.commands['getWindow']
  const getTab = manifest.commands['getTab']
  const getSession = manifest.commands['getSession']
  if (!window || !windows || !getWindow || !getTab || !getSession)
    throw new Error('Missing fixture')
  manifest.resources['Group'] = { ...window, name: 'Group', plural: 'Groups' }
  manifest.commands['getGroup'] = {
    ...getWindow,
    resourceType: 'Group',
    parameters: [...getWindow.parameters],
  }
  manifest.hierarchy.children = {
    groups: { resource: 'Group', access: 'r', children: { windows } },
  }
  const group = {
    resource: 'Group',
    collection: 'groups',
    by: 'identity' as const,
    parameter: 'groupId',
  }
  const parent = {
    resource: 'Window',
    collection: 'windows',
    by: 'identity' as const,
    parameter: 'windowId',
  }
  const parameter = {
    name: 'groupId',
    type: 'integer',
    description: 'Group identity',
    required: true,
  }
  getWindow.parents = [group]
  getWindow.item = { by: 'identity', parameter: 'id' }
  getWindow.parameters.unshift(parameter)
  delete getTab.parent
  getTab.parents = [group, parent]
  getTab.item = { by: 'index', parameter: 'index' }
  getTab.parameters.unshift(parameter)
  getSession.parents?.unshift(group)
  getSession.parameters.unshift(parameter)
  delete manifest.commands['listWindows']
  delete manifest.commands['listTabs']
  delete manifest.commands['resolveSession']
  getSession.resolvesReferences = true
  // A canonical identity route cannot contain the Tab position, even when the address is navigable.
  expect(AppManifestSchema.safeParse(manifest).success).toBe(false)
  getSession.resolvesReferences = false
  // The get exists for explicit reads; no Session references are requested by this fixture.
  expect(AppManifestSchema.safeParse(manifest).success).toBe(true)
  expect(generateConsolidatedPackages(manifest, { appName: 'panes' }).errors).toEqual([])
  const identifiedTab = manifest.resources['Tab']
  const tabSelection = getSession.parents?.at(-1)
  if (!identifiedTab || !tabSelection) throw new Error('Missing Tab selection')
  delete identifiedTab.positional
  identifiedTab.properties['id'] = {
    access: 'r',
    type: 'integer',
    description: 'Tab identity',
    code: 'ID  ',
    optional: false,
  }
  identifiedTab.identifiers = [{ property: 'id', primary: true }]
  getTab.item.by = 'identity'
  tabSelection.by = 'identity'
  expect(AppManifestSchema.safeParse(manifest).success).toBe(true)
  expect(generateConsolidatedPackages(manifest, { appName: 'panes' }).errors).toEqual([])
})

it.each([
  'missing-parameter',
  'wrong-type',
  'missing-get',
  'swapped-order',
  'ambiguous-edge',
  'root-ancestor',
] as const)('refuses %s without guessing address context', (problem) => {
  const manifest = sessionFixture()
  const command = manifest.commands['getSession']
  const window = manifest.resources['Window']
  const tab = manifest.hierarchy.children['windows']?.children?.['tabs']
  if (!command || !window || !tab) throw new Error('Missing fixture')
  if (problem === 'missing-parameter')
    command.parameters = command.parameters.filter(({ name }) => name !== 'windowId')
  if (problem === 'wrong-type') {
    const parameter = command.parameters.find(({ name }) => name === 'windowId')
    if (parameter) parameter.type = 'string'
  }
  if (problem === 'missing-get') delete manifest.commands['getWindow']
  if (problem === 'swapped-order') command.parents?.reverse()
  if (problem === 'ambiguous-edge')
    tab.children = {
      sessions: { resource: 'Session', access: 'r' },
      duplicateSessions: { resource: 'Session', access: 'r' },
    }
  if (problem === 'root-ancestor') window.roots = {}
  expect(AppManifestSchema.safeParse(manifest).success).toBe(false)
  expect(
    generateConsolidatedPackages(manifest, { appName: 'panes' }).errors.length
  ).toBeGreaterThan(0)
})

it.each(['identityTraversal', 'separateRead'] as const)(
  'refuses malformed %s at raw generation instead of dropping or executing it',
  (field) => {
    const manifest = sessionFixture()
    if (field === 'identityTraversal') subject(manifest)['identityTraversal'] = null
    else {
      const property = manifest.resources['Window']?.properties['name']
      if (!property) throw new Error('Missing property')
      Object.assign(property, { separateRead: null })
    }
    expect(AppManifestSchema.safeParse(manifest).success).toBe(false)
    expect(
      generateConsolidatedPackages(manifest, { appName: 'panes' }).errors.length
    ).toBeGreaterThan(0)
  }
)

it.each(['missing-parent-input', 'wrong-parent-type', 'unsupported-branch'] as const)(
  'refuses %s in a scoped identity traversal',
  (problem) => {
    const manifest = sessionFixture()
    const command = manifest.commands['resolveSession']
    const tab = manifest.resources['Tab']
    if (!command || !tab) throw new Error('Missing fixture')
    if (problem === 'missing-parent-input')
      command.parameters = command.parameters.filter(({ name }) => name !== 'windowId')
    if (problem === 'wrong-parent-type') {
      const parameter = command.parameters.find(({ name }) => name === 'windowId')
      if (parameter) parameter.type = 'string'
    }
    if (problem === 'unsupported-branch')
      Object.assign(tab, {
        unsupported: { evidence: { source: 'dictionary', note: 'No usable Tab collection' } },
      })
    expect(AppManifestSchema.safeParse(manifest).success).toBe(false)
    expect(
      generateConsolidatedPackages(manifest, { appName: 'panes' }).errors.length
    ).toBeGreaterThan(0)
  }
)

it('refuses an ancestor whose resolving get requires omitted identity context, even with a top-level placement', () => {
  const manifest = sessionFixture()
  const window = manifest.resources['Window']
  const tab = manifest.resources['Tab']
  const getWindow = manifest.commands['getWindow']
  const tabSegment = manifest.commands['getSession']?.parents?.[1]
  if (!window || !tab || !getWindow || !tabSegment) throw new Error('Missing fixture')
  delete manifest.commands['resolveSession']
  delete tab.positional
  tab.properties['id'] = {
    access: 'r',
    type: 'integer',
    description: 'Tab identity',
    code: 'ID  ',
    optional: false,
  }
  tab.identifiers = [{ property: 'id', primary: true }]
  tabSegment.by = 'identity'
  manifest.resources['Group'] = { ...window, name: 'Group', plural: 'Groups' }
  manifest.commands['getGroup'] = {
    ...getWindow,
    resourceType: 'Group',
    parameters: [...getWindow.parameters],
  }
  manifest.hierarchy.children['groups'] = { resource: 'Group', access: 'r' }
  getWindow.parent = { resource: 'Group', parameter: 'groupId' }
  getWindow.parameters.unshift({
    name: 'groupId',
    type: 'integer',
    description: 'Group identity',
    required: true,
  })
  expect(AppManifestSchema.safeParse(manifest).success).toBe(false)
  expect(
    generateConsolidatedPackages(manifest, { appName: 'panes' }).errors.length
  ).toBeGreaterThan(0)
})

it('admits a finite explicit path that repeats an identified resource type', () => {
  const base = panesManifest()
  const manifest = { ...base, version: '1.1' as const }
  // Identified folders may contain folders; this finite address is an input,
  // and makes no recursive or positional reference-data claim.
  manifest.resources['Folder'] = {
    name: 'Folder',
    plural: 'Folders',
    description: 'An identified folder',
    properties: {
      id: { access: 'r', type: 'string', description: 'Folder id', code: 'ID  ', optional: false },
    },
    identifiers: [{ property: 'id', primary: true }],
  }
  manifest.resources['Document'] = {
    name: 'Document',
    plural: 'Documents',
    description: 'An identified document',
    properties: {
      id: {
        access: 'r',
        type: 'string',
        description: 'Document id',
        code: 'ID  ',
        optional: false,
      },
    },
    identifiers: [{ property: 'id', primary: true }],
  }
  manifest.hierarchy.children['folders'] = {
    resource: 'Folder',
    access: 'r',
    children: {
      folders: {
        resource: 'Folder',
        access: 'r',
        children: { documents: { resource: 'Document', access: 'r' } },
      },
    },
  }
  manifest.commands['getFolder'] = {
    name: 'get',
    scope: 'resource',
    resourceType: 'Folder',
    description: 'Get a folder by globally unique id',
    parameters: [{ name: 'folderId', type: 'string', description: 'Folder id', required: true }],
  }
  manifest.commands['getDocument'] = {
    name: 'get',
    scope: 'resource',
    resourceType: 'Document',
    description: 'Read a document at an explicit finite address',
    resolvesReferences: false,
    parents: [
      { resource: 'Folder', collection: 'folders', by: 'identity', parameter: 'outerId' },
      { resource: 'Folder', collection: 'folders', by: 'identity', parameter: 'innerId' },
    ],
    item: { by: 'identity', parameter: 'documentId' },
    parameters: ['outerId', 'innerId', 'documentId'].map((name) => ({
      name,
      type: 'string',
      description: name,
      required: true,
    })),
  }
  const parsed = AppManifestSchema.safeParse(manifest)
  expect(parsed.error?.issues).toBeUndefined()
  expect(parsed.success).toBe(true)
  expect(generateConsolidatedPackages(manifest, { appName: 'panes' }).errors).toEqual([])
  // A finite operation path does not admit cyclic container data for its global identity.
  const cyclic: Record<string, unknown> = {
    resource: 'Folder',
    form: 'identity',
    cardinality: 'one',
    id: 'folder',
  }
  cyclic['container'] = cyclic
  expect(() =>
    createNativeCodecFunctions().decode(
      { reference: cyclic },
      { kind: 'reference', resource: 'Folder', cardinality: 'one' },
      {
        app: {},
        references: {
          Folder: {
            id: { kind: 'string' },
            addressing: {
              lookup: 'byId',
              collection: 'folders',
              property: 'id',
            },
          },
        },
      }
    )
  ).toThrow(/located through a container/)
  const folderGet = manifest.commands['getFolder']
  // A required Window namespace cannot be supplied by repeated Folder ancestors.
  folderGet.parent = { resource: 'Window', parameter: 'windowId' }
  folderGet.parameters.unshift({
    name: 'windowId',
    type: 'integer',
    description: 'Window identity',
    required: true,
  })
  const refused = AppManifestSchema.safeParse(manifest)
  expect(refused.success).toBe(false)
  expect(
    refused.error?.issues.some(({ message }) => message.includes('different identity context'))
  ).toBe(true)
  // A recursive canonical reference namespace cannot be justified by a finite operation path.
  folderGet.parent = { resource: 'Folder', parameter: 'parentFolderId' }
  folderGet.parameters[0] = {
    name: 'parentFolderId',
    type: 'string',
    description: 'Parent identity',
    required: true,
  }
  expect(AppManifestSchema.safeParse(manifest).success).toBe(false)
})
