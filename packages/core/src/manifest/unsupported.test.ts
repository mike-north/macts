/**
 * Tests for the resource- and command-level helpers of `./unsupported.ts`:
 * which resources, hierarchy entries and commands the generated surfaces
 * expose.
 *
 * Expected values are derived by hand from the fixture: Speaker and Session
 * are usable, Connection is marked unsupported, and the hierarchy nests
 * `sessions` under `connections` and names one resource (`Ghost`) that the
 * manifest does not declare. Of the commands, `getSetting` is marked
 * unsupported and `listSettings` and `openURL` are not.
 *
 * @see ./schemas/resource.ts (ResourceUnsupportedSchema)
 */

import { describe, expect, it } from 'vitest'
import type { Command } from './schemas/command.js'
import type { HierarchyChild } from './schemas/hierarchy.js'
import type { Resource } from './schemas/resource.js'
import {
  isCommandUnsupported,
  isResourceUnsupported,
  isUnsupportedResourceKey,
  usableCommands,
  usableHierarchyChildren,
  usableResources,
} from './unsupported.js'

const plain = (name: string): Resource => ({
  name,
  plural: `${name}s`,
  description: name,
  properties: {},
})

const connection: Resource = {
  ...plain('Connection'),
  unsupported: {
    evidence: {
      source: 'dictionary',
      bundleId: 'com.apple.ScreenSharing',
      appVersion: '7.1',
      osVersion: '27.2',
      term: 'connection',
      finding: 'no-class',
    },
  },
}

const manifest = {
  resources: { Speaker: plain('Speaker'), Connection: connection, Session: plain('Session') },
}

const children: Record<string, HierarchyChild> = {
  speakers: { resource: 'Speaker', access: 'r' },
  connections: {
    resource: 'Connection',
    access: 'rw',
    children: { sessions: { resource: 'Session', access: 'r' } },
  },
  ghosts: { resource: 'Ghost', access: 'r' },
}

describe('resources marked unsupported', () => {
  it('tells a marked resource from an unmarked one', () => {
    expect(isResourceUnsupported(connection)).toBe(true)
    expect(isResourceUnsupported(plain('Speaker'))).toBe(false)
  })

  it('finds a marked resource by key, and no other', () => {
    expect(isUnsupportedResourceKey(manifest, 'Connection')).toBe(true)
    expect(isUnsupportedResourceKey(manifest, 'Speaker')).toBe(false)
    // An undeclared key is not marked, nor is a key found only on the prototype.
    expect(isUnsupportedResourceKey(manifest, 'Ghost')).toBe(false)
    expect(isUnsupportedResourceKey(manifest, 'constructor')).toBe(false)
  })

  it('lists the usable resources in declaration order', () => {
    expect(usableResources(manifest).map(([key]) => key)).toEqual(['Speaker', 'Session'])
    expect(usableResources({ resources: {} })).toEqual([])
  })

  it('drops a marked resource’s hierarchy entry, keeping the rest in order', () => {
    // An entry naming an undeclared resource is kept: nothing marks it.
    expect(usableHierarchyChildren(manifest, children).map(([key]) => key)).toEqual([
      'speakers',
      'ghosts',
    ])
  })

  it('keeps every entry when no resource is marked', () => {
    const unmarked = { resources: { ...manifest.resources, Connection: plain('Connection') } }
    expect(usableHierarchyChildren(unmarked, children).map(([key]) => key)).toEqual([
      'speakers',
      'connections',
      'ghosts',
    ])
  })
})

const command = (name: string): Command => ({
  name,
  description: name,
  scope: 'resource',
  resourceType: 'Setting',
  parameters: [],
})

const getSetting: Command = {
  ...command('get'),
  unsupported: {
    evidence: {
      source: 'live',
      observedAt: '2026-11-01T16:34:20.000Z',
      bundleId: 'com.apple.Automator',
      appVersion: '2.10',
      osVersion: '27.2',
      expression: 'the settings collection at the application',
      errorNumber: -1728,
    },
  },
}

describe('commands marked unsupported', () => {
  it('tells a marked command from an unmarked one', () => {
    expect(isCommandUnsupported(getSetting)).toBe(true)
    expect(isCommandUnsupported(command('list'))).toBe(false)
  })

  it('lists the usable commands in declaration order', () => {
    const commands = {
      listSettings: command('list'),
      getSetting,
      openURL: { ...command('openURL'), scope: 'application' as const },
    }
    expect(usableCommands({ commands }).map(([key]) => key)).toEqual(['listSettings', 'openURL'])
    expect(usableCommands({ commands: {} })).toEqual([])
  })
})
