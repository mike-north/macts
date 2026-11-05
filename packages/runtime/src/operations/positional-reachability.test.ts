/** Positional routes must describe addresses the executor can construct from supplied data. */
import { describe, expect, it } from 'vitest'
import type { AppContract } from '@macts/contracts'
import { panesManifest } from '@macts/core/testing'
import {
  AppManifestSchema,
  generateConsolidatedPackages,
  buildNativeBody,
  type AppManifest,
} from '@macts/core'
import { operationsFromContract, operationsFromManifest } from './registry.js'

/** Check raw-object consumers independently of schema parsing. */
function expectAdmission(manifest: AppManifest, admitted: boolean): void {
  const parsed = AppManifestSchema.safeParse(manifest)
  expect(parsed.success, parsed.success ? undefined : JSON.stringify(parsed.error.issues)).toBe(
    admitted
  )
  expect(generateConsolidatedPackages(manifest, { appName: 'panes' }).errors.length === 0).toBe(
    admitted
  )
  const contract: AppContract<unknown> = {
    app: 'panes',
    operations: {},
    resources: {},
    loadManifest: () => Promise.resolve(manifest),
    bind: () => ({}),
  }
  for (const register of [
    () => operationsFromManifest(manifest),
    () => operationsFromContract(contract, manifest),
  ]) {
    if (admitted) expect(register).not.toThrow()
    else expect(register).toThrow(/parent|hierarchy|identifier/i)
  }
}

/** Isolate one CRUD route, retaining get as the positional identity authority. */
function fixture(operation: 'list' | 'get' | 'create' | 'update' | 'delete') {
  const manifest = panesManifest()
  const window = manifest.resources['Window']!
  manifest.resources['Group'] = { ...window, name: 'Group', plural: 'Groups' }
  manifest.commands['getGroup'] = { ...manifest.commands['getWindow']!, resourceType: 'Group' }
  manifest.hierarchy.children['groups'] = { resource: 'Group', access: 'r', description: 'Groups' }
  delete manifest.commands['listTabs']
  const key = operation === 'get' ? 'getTab' : `${operation}Subject`
  manifest.commands[key] = {
    ...manifest.commands['getTab']!,
    name: operation,
    ...(operation === 'list' || operation === 'create'
      ? {
          parameters: [
            { name: 'windowId', type: 'integer', required: true, description: 'Parent identity' },
          ],
        }
      : {}),
  }
  return { manifest, key }
}

const operations = ['list', 'get', 'create', 'update', 'delete'] as const

describe.each(operations)('%s parent reachability', (operation) => {
  it.each([
    'nested-only',
    'nested-get',
    'both-nested-get',
    'no-get',
    'unsupported-get',
    'unsupported-parent',
    'no-id',
    'root',
    'missing-parameter',
    'optional-parameter',
  ] as const)('refuses %s parent context', (shape) => {
    const { manifest, key } = fixture(operation)
    const windows = manifest.hierarchy.children['windows']!
    if (shape === 'nested-only' || shape === 'both-nested-get') {
      manifest.hierarchy.children['groups']!.children = { windows }
      if (shape === 'nested-only') delete manifest.hierarchy.children['windows']
    }
    if (shape === 'nested-get' || shape === 'both-nested-get') {
      manifest.commands['getWindow']!.parent = { resource: 'Group', parameter: 'groupId' }
      manifest.commands['getWindow']!.parameters.unshift({
        name: 'groupId',
        type: 'integer',
        required: true,
        description: 'Ancestor',
      })
    }
    if (shape === 'no-get') delete manifest.commands['getWindow']
    if (shape === 'unsupported-get') manifest.commands['getWindow']!.unsupported = { evidence }
    if (shape === 'unsupported-parent') manifest.resources['Window']!.unsupported = { evidence }
    if (shape === 'no-id') delete manifest.resources['Window']!.identifiers
    if (shape === 'root')
      manifest.resources['Window']!.roots = {
        front: {
          property: 'frontWindow',
          evidence: {
            source: 'dictionary',
            bundleId: 'com.example.panes',
            appVersion: '1.0',
            osVersion: '27.2',
            term: 'front window',
          },
        },
      }
    if (shape === 'missing-parameter')
      manifest.commands[key]!.parameters = manifest.commands[key]!.parameters.filter(
        (p) => p.name !== 'windowId'
      )
    if (shape === 'optional-parameter') manifest.commands[key]!.parameters[0]!.required = false
    if (shape !== 'root')
      expect(buildNativeBody(manifest, { command: key, resource: 'Tab' })).toContain(
        'app["windows"]'
      )
    expectAdmission(manifest, false)
  })

  it('refuses a contradictory child edge even for isolated item routes', () => {
    const { manifest, key } = fixture(operation)
    const tabs = manifest.hierarchy.children['windows']!.children!['tabs']!
    delete manifest.hierarchy.children['windows']!.children
    manifest.hierarchy.children['groups']!.children = { tabs }
    expect(buildNativeBody(manifest, { command: key, resource: 'Tab' })).toContain('parent["tabs"]')
    expectAdmission(manifest, false)
  })

  it.each(['top', 'both', 'unplaced'] as const)('admits qualified %s parent', (placement) => {
    const { manifest, key } = fixture(operation)
    if (placement === 'both')
      manifest.hierarchy.children['groups']!.children = {
        windows: manifest.hierarchy.children['windows']!,
      }
    if (placement === 'unplaced') manifest.hierarchy.children = {}
    expect(buildNativeBody(manifest, { command: key, resource: 'Tab' })).toContain('app["windows"]')
    expectAdmission(manifest, true)
  })
})

const evidence = {
  source: 'live' as const,
  observedAt: '2026-11-01T06:05:32.244Z',
  bundleId: 'com.example.panes',
  appVersion: '1.0',
  osVersion: '27.2',
  expression: 'the collection',
  errorNumber: -1728,
}
describe('effective parent routes', () => {
  it.each(['scalar', 'array', 'mixed', 'omitted', 'application', 'all-omitted'] as const)(
    '%s target expansion controls executability',
    (shape) => {
      const manifest = panesManifest()
      manifest.resources['Pane'] = {
        ...manifest.resources['Window']!,
        name: 'Pane',
        plural: 'Panes',
        unsupported: { evidence },
      }
      manifest.commands['subject'] = {
        name: 'subject',
        description: 'Subject',
        scope: shape === 'application' ? 'application' : 'resource',
        parent: { resource: 'Tab', parameter: 'tabId' },
        parameters: [{ name: 'tabId', type: 'integer', required: true, description: 'Parent' }],
        ...(shape === 'omitted' || shape === 'all-omitted'
          ? {}
          : {
              resourceType:
                shape === 'array' ? ['Pane'] : shape === 'mixed' ? ['Pane', 'Window'] : 'Pane',
            }),
      }
      if (shape === 'all-omitted') {
        for (const resource of Object.values(manifest.resources))
          resource.unsupported = { evidence }
        delete manifest.commands['subject']!.parent
        for (const key of Object.keys(manifest.commands))
          if (key !== 'subject') delete manifest.commands[key]
      }
      const admitted = shape === 'scalar' || shape === 'array' || shape === 'all-omitted'
      expectAdmission(manifest, admitted)
      if (admitted)
        expect(
          operationsFromManifest(manifest).some((o) => o.descriptor.id.endsWith('.subject'))
        ).toBe(false)
    }
  )
})

/** Each collection holder must qualify independently; get defines item identity only. */
describe.each(['list', 'create'] as const)('%s multiple holders', (operation) => {
  it.each([false, true])('uses the independently chosen holder when nested-only=%s', (nested) => {
    const { manifest, key } = fixture(operation)
    manifest.hierarchy.children['groups']!.children = {
      tabs: manifest.hierarchy.children['windows']!.children!['tabs']!,
    }
    manifest.commands[key]!.parent = { resource: 'Group', parameter: 'windowId' }
    if (nested) {
      manifest.hierarchy.children['windows']!.children!['groups'] =
        manifest.hierarchy.children['groups']!
      delete manifest.hierarchy.children['groups']
    }
    expect(buildNativeBody(manifest, { command: key, resource: 'Tab' })).toContain('app["groups"]')
    expectAdmission(manifest, !nested)
  })
})
