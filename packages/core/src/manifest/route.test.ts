/**
 * Tests for canonical RPC route derivation.
 *
 * The route string (`app.resource.operation`) is the contract between the
 * generated client SDK and the server router. These tests pin the canonical
 * derivation — keyed by the command's manifest KEY (or its `routeName`), not
 * `command.name` — that both surfaces must share. See issue: client `events.create` vs server
 * `events.createEvent`.
 */

import { describe, it, expect } from 'vitest'
import type { AppManifest } from './schemas/index.js'
import type { Command } from './schemas/command.js'
import { AppManifestSchema } from './schemas/index.js'
import {
  normalizeAppRouteSegment,
  buildAppCommandRoute,
  buildResourceCommandRoute,
  commandRouteSegment,
  findDuplicateRoutes,
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

/**
 * Permission derivation. The expected strings follow the server's rule: the
 * command's explicit `permission`, else `{app segment}:{scope}:{command key}`,
 * where the scope is `app` for application commands and the resource route
 * segment (lowercased plural, or `{type}s` for an unknown resource) otherwise.
 */
describe('ManifestRoute.permission', () => {
  function routesFor(app: string, commandKey: string, command: Command) {
    const fixture: AppManifest = { ...manifest, app: { ...manifest.app, name: app } }
    return resolveCommandRoutes(fixture, commandKey, command)
  }

  it('derives app:app:commandKey for an application command', () => {
    const command = manifest.commands['reloadCalendars']
    if (!command) throw new Error('fixture missing reloadCalendars')
    expect(resolveCommandRoutes(manifest, 'reloadCalendars', command)[0]?.permission).toBe(
      'calendar:app:reloadCalendars'
    )
  })

  it('derives the scope from the resource route segment and keys by command key, not name', () => {
    const command = manifest.commands['createEvent']
    if (!command) throw new Error('fixture missing createEvent')
    expect(resolveCommandRoutes(manifest, 'createEvent', command)[0]?.permission).toBe(
      'calendar:events:createEvent'
    )
  })

  it('uses the hyphenated app segment for multi-word apps', () => {
    const command: Command = {
      name: 'reload',
      description: 'Reload',
      scope: 'application',
      parameters: [],
    }
    expect(routesFor('Google Chrome', 'reload', command)[0]?.permission).toBe(
      'google-chrome:app:reload'
    )
  })

  it('derives one permission per targeted resource for a multi-resource command', () => {
    const command: Command = {
      name: 'refresh',
      description: 'Refresh',
      scope: 'resource',
      resourceType: ['Calendar', 'Event'],
      parameters: [],
    }
    expect(resolveCommandRoutes(manifest, 'refresh', command).map((r) => r.permission)).toEqual([
      'calendar:calendars:refresh',
      'calendar:events:refresh',
    ])
  })

  it('falls back to the synthesized plural segment when the resource is unknown', () => {
    const command: Command = {
      name: 'archive',
      description: 'Archive',
      scope: 'resource',
      resourceType: 'Widget',
      parameters: [],
    }
    expect(resolveCommandRoutes(manifest, 'archive', command)[0]?.permission).toBe(
      'calendar:widgets:archive'
    )
  })

  it("prefers the command's explicit permission on every route", () => {
    const command: Command = {
      name: 'list',
      description: 'List',
      scope: 'resource',
      resourceType: ['Calendar', 'Event'],
      parameters: [],
      permission: 'calendar:everything:read',
    }
    expect(resolveCommandRoutes(manifest, 'listAll', command).map((r) => r.permission)).toEqual([
      'calendar:everything:read',
      'calendar:everything:read',
    ])
  })

  it('carries the permission through resolveManifestRoutes', () => {
    const byRoute = new Map(resolveManifestRoutes(manifest).map((r) => [r.route, r.permission]))
    expect(byRoute.get('calendar.calendars.list')).toBe('calendar:calendars:list')
    expect(byRoute.get('calendar.app.reloadCalendars')).toBe('calendar:app:reloadCalendars')
  })
})

/**
 * The `routeName` override: a command's segment in its public route and
 * default permission, defaulting to its key. Two commands that share a CRUD
 * verb but differ in signature (an Event `get` keyed by a different
 * identifier than the shared `get`) can each publish `get`.
 */
describe('routeName', () => {
  const getEvent: Command = {
    name: 'get',
    routeName: 'get',
    description: 'Get an event by uid',
    scope: 'resource',
    resourceType: 'Event',
    parameters: [{ name: 'uid', type: 'string', description: 'Event uid', required: true }],
  }

  it('is the route segment and permission segment, while commandKey stays the manifest key', () => {
    expect(resolveCommandRoutes(manifest, 'getEvent', getEvent)).toEqual([
      {
        route: 'calendar.events.get',
        commandKey: 'getEvent',
        command: getEvent,
        resource: manifest.resources['Event'],
        resourceType: 'Event',
        permission: 'calendar:events:get',
      },
    ])
  })

  it('names an application command route too', () => {
    const command: Command = {
      name: 'reloadCalendars',
      routeName: 'reload',
      description: 'Reload',
      scope: 'application',
      parameters: [],
    }
    const [route] = resolveCommandRoutes(manifest, 'reloadCalendars', command)
    expect(route).toMatchObject({
      route: 'calendar.app.reload',
      commandKey: 'reloadCalendars',
      permission: 'calendar:app:reload',
    })
  })

  it('leaves the route and permission keyed by command key when absent', () => {
    const command = manifest.commands['createEvent']
    if (!command) throw new Error('fixture missing createEvent')
    expect(commandRouteSegment('createEvent', command)).toBe('createEvent')
    expect(resolveCommandRoutes(manifest, 'createEvent', command)[0]).toMatchObject({
      route: 'calendar.events.createEvent',
      permission: 'calendar:events:createEvent',
    })
  })

  it("does not override the command's explicit permission", () => {
    const command: Command = { ...getEvent, permission: 'calendar:events:read' }
    expect(resolveCommandRoutes(manifest, 'getEvent', command)[0]?.permission).toBe(
      'calendar:events:read'
    )
  })

  it('rejects an empty routeName, or one containing "." or ":"', () => {
    for (const routeName of ['', 'events.get', 'events:get']) {
      const parsed = AppManifestSchema.safeParse({
        ...manifest,
        commands: { getEvent: { ...getEvent, routeName } },
      })
      expect(parsed.success).toBe(false)
    }
  })
})

describe('duplicate routes', () => {
  // The shared Event get plus a second command that publishes the same route.
  const duplicated: AppManifest = {
    ...manifest,
    commands: {
      ...manifest.commands,
      get: {
        name: 'get',
        description: 'Get a calendar or event',
        scope: 'resource',
        resourceType: ['Calendar', 'Event'],
        parameters: [{ name: 'name', type: 'string', description: 'Name', required: true }],
      },
      getEvent: {
        name: 'get',
        routeName: 'get',
        description: 'Get an event by uid',
        scope: 'resource',
        resourceType: 'Event',
        parameters: [{ name: 'uid', type: 'string', description: 'Event uid', required: true }],
      },
    },
  }

  it('finds each route two commands resolve to, with their keys', () => {
    expect(findDuplicateRoutes(duplicated)).toEqual([
      { route: 'calendar.events.get', commandKeys: ['get', 'getEvent'] },
    ])
    expect(findDuplicateRoutes(manifest)).toEqual([])
  })

  it('is a manifest error, naming the commands and the route', () => {
    const parsed = AppManifestSchema.safeParse(duplicated)
    expect(parsed.success).toBe(false)
    expect(parsed.error?.issues).toEqual([
      expect.objectContaining({
        path: ['commands', 'getEvent'],
        message:
          'Commands "get", "getEvent" all resolve to the route "calendar.events.get"; give each a distinct key or routeName.',
      }),
    ])
  })

  it('accepts the same routeName on different resources', () => {
    const narrowed: AppManifest = {
      ...duplicated,
      commands: {
        ...duplicated.commands,
        get: { ...(duplicated.commands['get'] ?? never()), resourceType: 'Calendar' },
      },
    }
    expect(AppManifestSchema.safeParse(narrowed).success).toBe(true)
  })
})

function never(): never {
  throw new Error('unreachable')
}
