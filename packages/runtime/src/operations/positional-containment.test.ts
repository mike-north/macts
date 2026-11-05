/** Both registration paths enforce the positional containment contract. */
import { describe, expect, it } from 'vitest'
import { panesManifest } from '@macts/core/testing'
import type { AppContract } from '@macts/contracts'
import { operationsFromContract, operationsFromManifest } from './registry.js'

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

describe.each(['list', 'create'] as const)('%s containment registration', (operation) => {
  it.each(cases)('%s placement with %s parent: admitted=%s', (placement, holder, admitted) => {
    const manifest = containmentManifest(placement, holder, operation)
    const contract: AppContract<unknown> = {
      app: 'panes',
      operations: {},
      resources: {},
      loadManifest: () => Promise.resolve(manifest),
      bind: () => ({}),
    }
    if (admitted) {
      expect(() => operationsFromManifest(manifest)).not.toThrow()
      expect(() => operationsFromContract(contract, manifest)).not.toThrow()
    } else {
      expect(() => operationsFromManifest(manifest)).toThrow(/hierarchy|parent/i)
      expect(() => operationsFromContract(contract, manifest)).toThrow(/hierarchy|parent/i)
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
    const contract: AppContract<unknown> = {
      app: 'panes',
      operations: {},
      resources: {},
      loadManifest: () => Promise.resolve(manifest),
      bind: () => ({}),
    }
    if (admitted) {
      expect(
        operationsFromManifest(manifest).some(({ descriptor }) => descriptor.id.includes('closed'))
      ).toBe(false)
      expect(operationsFromContract(contract, manifest)).toEqual([])
    } else {
      expect(() => operationsFromManifest(manifest)).toThrow(/positional resource/)
      expect(() => operationsFromContract(contract, manifest)).toThrow(/positional resource/)
    }
  })
})
