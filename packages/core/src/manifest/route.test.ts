/**
 * Tests for canonical RPC route derivation.
 *
 * The route string (`app.resource.operation`) is the contract between the
 * generated client SDK and the server router. These tests pin the canonical
 * derivation — keyed by the command's manifest KEY, not `command.name` — that
 * both surfaces must share. See issue: client `events.create` vs server
 * `events.createEvent`.
 */

import { describe, it, expect } from 'vitest'
import type { AppManifest } from './schemas/index.js'
import type { Command } from './schemas/command.js'
import {
  normalizeAppRouteSegment,
  buildAppCommandRoute,
  buildResourceCommandRoute,
  resolveCommandRoutes,
  resolveManifestRoutes,
} from './route.js'

const manifest: AppManifest = {
  version: '1.0',
  app: { name: 'Calendar', bundleId: 'com.apple.iCal', tccEntitlements: ['calendar'] },
  resources: {
    Calendar: {
      name: 'Calendar',
      plural: 'Calendars',
      description: 'A calendar',
      properties: {},
      identifiers: [{ property: 'calendarIdentifier', primary: true }],
    },
    Event: {
      name: 'Event',
      plural: 'Events',
      description: 'An event',
      properties: {},
      identifiers: [{ property: 'uid', primary: true }],
    },
  },
  enums: {},
  hierarchy: { children: {} },
  commands: {
    // Calendar CRUD where key === name
    list: {
      name: 'list',
      description: 'List calendars',
      scope: 'resource',
      resourceType: 'Calendar',
      parameters: [],
    },
    // Event CRUD where key !== name (the drift the route key guards against)
    createEvent: {
      name: 'create',
      description: 'Create an event',
      scope: 'resource',
      resourceType: 'Event',
      parameters: [
        { name: 'calendarId', type: 'string', description: 'Calendar id', required: true },
      ],
    },
    // Application-scoped custom command
    reloadCalendars: {
      name: 'reloadCalendars',
      description: 'Reload',
      scope: 'application',
      parameters: [],
    },
  },
  suites: [],
  relationships: [],
}

describe('normalizeAppRouteSegment', () => {
  it('lowercases a single-word app name', () => {
    // spec: app segment is lowercased
    expect(normalizeAppRouteSegment('Calendar')).toBe('calendar')
  })

  it('hyphenates whitespace in multi-word app names', () => {
    // spec: collapse whitespace to single hyphens, then lowercase — so the
    // client (hyphenated) and server agree on multi-word apps.
    expect(normalizeAppRouteSegment('Google Chrome')).toBe('google-chrome')
    expect(normalizeAppRouteSegment('System  Events')).toBe('system-events')
  })
})

describe('buildAppCommandRoute', () => {
  it('keys an app command by its command key', () => {
    expect(buildAppCommandRoute('Calendar', 'reloadCalendars')).toBe('calendar.app.reloadCalendars')
  })
})

describe('buildResourceCommandRoute', () => {
  it('keys a resource command by app, plural resource, and command key', () => {
    expect(buildResourceCommandRoute('Calendar', 'Events', 'createEvent')).toBe(
      'calendar.events.createEvent'
    )
  })
})

describe('resolveCommandRoutes', () => {
  it('routes a manifest-named resource command by its key, NOT its name', () => {
    const command = manifest.commands['createEvent']
    if (!command) throw new Error('fixture missing createEvent')
    const routes = resolveCommandRoutes(manifest, 'createEvent', command)
    expect(routes).toHaveLength(1)
    // The bug: name is "create", but the route must use the key "createEvent".
    expect(routes[0]?.route).toBe('calendar.events.createEvent')
    expect(routes[0]?.route).not.toBe('calendar.events.create')
    expect(routes[0]?.commandKey).toBe('createEvent')
  })

  it('routes a CRUD command whose key equals its name', () => {
    const command = manifest.commands['list']
    if (!command) throw new Error('fixture missing list')
    const routes = resolveCommandRoutes(manifest, 'list', command)
    expect(routes[0]?.route).toBe('calendar.calendars.list')
  })

  it('routes an application command under the app segment', () => {
    const command = manifest.commands['reloadCalendars']
    if (!command) throw new Error('fixture missing reloadCalendars')
    const routes = resolveCommandRoutes(manifest, 'reloadCalendars', command)
    expect(routes[0]?.route).toBe('calendar.app.reloadCalendars')
    expect(routes[0]?.resourceType).toBeUndefined()
  })

  it('produces one route per targeted resource for a multi-resource command', () => {
    const command: Command = {
      name: 'refresh',
      description: 'Refresh',
      scope: 'resource',
      resourceType: ['Calendar', 'Event'],
      parameters: [],
    }
    const routes = resolveCommandRoutes(manifest, 'refresh', command)
    expect(routes.map((r) => r.route)).toEqual([
      'calendar.calendars.refresh',
      'calendar.events.refresh',
    ])
  })

  it('falls back to a synthesized plural when the resource is unknown', () => {
    const command: Command = {
      name: 'archive',
      description: 'Archive',
      scope: 'resource',
      resourceType: 'Widget',
      parameters: [],
    }
    const routes = resolveCommandRoutes(manifest, 'archive', command)
    // Unknown resource type → `${type}s` fallback, lowercased.
    expect(routes[0]?.route).toBe('calendar.widgets.archive')
    expect(routes[0]?.resource).toBeUndefined()
  })
})

describe('resolveManifestRoutes', () => {
  it('resolves every command, keyed by command key, with no name-keyed routes', () => {
    const routes = resolveManifestRoutes(manifest)
    const strings = routes.map((r) => r.route)
    expect(strings).toContain('calendar.calendars.list')
    expect(strings).toContain('calendar.events.createEvent')
    expect(strings).toContain('calendar.app.reloadCalendars')
    // The name-keyed form that broke the client must never appear.
    expect(strings).not.toContain('calendar.events.create')
  })
})
