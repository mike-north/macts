/**
 * Tests for the permission-scope explainer.
 *
 * Expected values are derived directly from the test-manifest fixture — not
 * from program output. Each assertion references which manifest field or
 * permissions-section entry justifies the expected value.
 *
 * @see packages/core/src/permissions/explain.ts
 * @see manifests/calendar/app.yaml  (inspiration for the fixture structure)
 */

import { describe, it, expect } from 'vitest'
import type { AppManifest } from '../manifest/schemas/app.js'
import { explainScope, renderScopeExplanation } from './explain.js'

// ---------------------------------------------------------------------------
// Test manifest fixture
//
// A minimal but realistic manifest with two resources (events, calendars) and
// an app-scoped resource (app). Descriptions are drawn from authoritative
// manifest field names so no hard-coded prose is duplicated here.
// ---------------------------------------------------------------------------

const MANIFEST: AppManifest = {
  version: '1.0',
  app: {
    bundleId: 'com.example.testapp',
    name: 'testapp',
    displayName: 'Test App',
    tccEntitlements: [],
  },
  suites: [],
  resources: {
    Event: {
      name: 'Event',
      plural: 'Events',
      description: 'A calendar event',
      properties: {},
    },
    Calendar: {
      name: 'Calendar',
      plural: 'Calendars',
      description: 'A calendar',
      properties: {},
    },
  },
  enums: {},
  hierarchy: { children: {} },
  relationships: [],
  commands: {
    listEvents: {
      name: 'list',
      description: 'List all events',
      scope: 'resource',
      resourceType: 'Event',
      parameters: [],
      permission: 'testapp:events:list',
    },
    getEvent: {
      name: 'get',
      description: 'Get an event by ID',
      scope: 'resource',
      resourceType: 'Event',
      parameters: [],
      permission: 'testapp:events:get',
    },
    showEvent: {
      name: 'show',
      description: 'Show the event in the calendar window',
      scope: 'resource',
      resourceType: 'Event',
      parameters: [],
      permission: 'testapp:events:show',
    },
    createEvent: {
      name: 'create',
      description: 'Create a new event',
      scope: 'resource',
      resourceType: 'Event',
      parameters: [],
      permission: 'testapp:events:create',
    },
    deleteEvent: {
      name: 'delete',
      description: 'Delete an event',
      scope: 'resource',
      resourceType: 'Event',
      parameters: [],
      permission: 'testapp:events:delete',
    },
    listCalendars: {
      name: 'list',
      description: 'List all calendars',
      scope: 'resource',
      resourceType: 'Calendar',
      parameters: [],
      permission: 'testapp:calendars:list',
    },
    createCalendar: {
      name: 'create',
      description: 'Create a new calendar',
      scope: 'resource',
      resourceType: 'Calendar',
      parameters: [],
      permission: 'testapp:calendars:create',
    },
    switchView: {
      name: 'switchView',
      description: 'Switch the calendar view',
      scope: 'application',
      parameters: [],
      permission: 'testapp:app:switchView',
    },
  },
  permissions: {
    events: {
      read: ['testapp:events:list', 'testapp:events:get', 'testapp:events:show'],
      create: ['testapp:events:create'],
      delete: ['testapp:events:delete'],
    },
    calendars: {
      read: ['testapp:calendars:list'],
      create: ['testapp:calendars:create'],
    },
    app: {
      read: ['testapp:app:switchView'],
    },
  },
}

// ---------------------------------------------------------------------------
// Helper: find a resource explanation by name
// ---------------------------------------------------------------------------

function findResource(explanation: ReturnType<typeof explainScope>, resource: string) {
  const r = explanation.resources.find((res) => res.resource === resource)
  if (!r) throw new Error(`Resource "${resource}" not found in explanation`)
  return r
}

// ---------------------------------------------------------------------------
// explainScope — basic grant/not-grant
// ---------------------------------------------------------------------------

describe('explainScope', () => {
  describe('basic grant and does-not-grant for a partial scope', () => {
    // Scope: only `testapp:events:list` and `testapp:events:create`
    const scope = ['testapp:events:list', 'testapp:events:create']
    const explanation = explainScope(scope, MANIFEST)

    it('carries the app name from the manifest', () => {
      // manifest.app.name = "testapp"
      expect(explanation.app).toBe('testapp')
    })

    it('grantsNothing is false when scope covers at least one permission', () => {
      expect(explanation.grantsNothing).toBe(false)
    })

    it('grants list (description from manifest listEvents command)', () => {
      const events = findResource(explanation, 'events')
      const listOp = events.granted.find((op) => op.operation === 'list')
      expect(listOp).toBeDefined()
      // Description sourced from MANIFEST.commands.listEvents.description
      expect(listOp?.description).toBe('List all events')
    })

    it('grants create (description from manifest createEvent command)', () => {
      const events = findResource(explanation, 'events')
      const createOp = events.granted.find((op) => op.operation === 'create')
      expect(createOp).toBeDefined()
      expect(createOp?.description).toBe('Create a new event')
    })

    it('does NOT grant get (available in manifest permissions.events.read)', () => {
      const events = findResource(explanation, 'events')
      const getOp = events.notGranted.find((op) => op.operation === 'get')
      expect(getOp).toBeDefined()
    })

    it('does NOT grant show (available in manifest permissions.events.read)', () => {
      const events = findResource(explanation, 'events')
      const showOp = events.notGranted.find((op) => op.operation === 'show')
      expect(showOp).toBeDefined()
    })

    it('does NOT grant delete (available in manifest permissions.events.delete)', () => {
      const events = findResource(explanation, 'events')
      const deleteOp = events.notGranted.find((op) => op.operation === 'delete')
      expect(deleteOp).toBeDefined()
    })

    it('calendars resource: all operations are not-granted', () => {
      const calendars = findResource(explanation, 'calendars')
      expect(calendars.granted).toHaveLength(0)
      expect(calendars.notGranted.length).toBeGreaterThan(0)
    })
  })

  // ---------------------------------------------------------------------------
  // Wildcard expansion: resource:operation wildcard (events:*)
  // ---------------------------------------------------------------------------

  describe('wildcard expansion — resource wildcard (events:*)', () => {
    // testapp:events:* should expand to all operations in permissions.events
    const scope = ['testapp:events:*']
    const explanation = explainScope(scope, MANIFEST)

    it('grants all event operations when scope is events:*', () => {
      const events = findResource(explanation, 'events')
      // permissions.events has: list, get, show (read), create, delete
      const grantedOps = events.granted.map((op) => op.operation).sort()
      expect(grantedOps).toEqual(['create', 'delete', 'get', 'list', 'show'])
    })

    it('does not grant anything in calendars when scope is only events:*', () => {
      const calendars = findResource(explanation, 'calendars')
      expect(calendars.granted).toHaveLength(0)
    })

    it('notGranted for events is empty when events:* is granted', () => {
      const events = findResource(explanation, 'events')
      expect(events.notGranted).toHaveLength(0)
    })

    it('does not include calendar permissions in the granted set', () => {
      const events = findResource(explanation, 'events')
      const hasCalendarPerm = events.granted.some((op) =>
        op.permission.startsWith('testapp:calendars:')
      )
      expect(hasCalendarPerm).toBe(false)
    })
  })

  // ---------------------------------------------------------------------------
  // Wildcard expansion: full app wildcard (*:*)
  // ---------------------------------------------------------------------------

  describe('wildcard expansion — full app wildcard (*:*)', () => {
    const scope = ['testapp:*:*']
    const explanation = explainScope(scope, MANIFEST)

    it('grants all events operations', () => {
      const events = findResource(explanation, 'events')
      const grantedOps = events.granted.map((op) => op.operation).sort()
      expect(grantedOps).toEqual(['create', 'delete', 'get', 'list', 'show'])
      expect(events.notGranted).toHaveLength(0)
    })

    it('grants all calendars operations', () => {
      const calendars = findResource(explanation, 'calendars')
      const grantedOps = calendars.granted.map((op) => op.operation).sort()
      expect(grantedOps).toEqual(['create', 'list'])
      expect(calendars.notGranted).toHaveLength(0)
    })

    it('grants app-scoped operations', () => {
      const app = findResource(explanation, 'app')
      expect(app.granted.map((op) => op.operation)).toContain('switchView')
      expect(app.notGranted).toHaveLength(0)
    })

    it('grantsNothing is false for full wildcard', () => {
      expect(explanation.grantsNothing).toBe(false)
    })
  })

  // ---------------------------------------------------------------------------
  // Coarse-operation expansion (read alias)
  // ---------------------------------------------------------------------------

  describe('coarse-operation expansion — events:read', () => {
    // permissions.events.read = [list, get, show]
    const scope = ['testapp:events:read']
    const explanation = explainScope(scope, MANIFEST)

    it('expands read to list + get + show', () => {
      const events = findResource(explanation, 'events')
      const grantedOps = events.granted.map((op) => op.operation).sort()
      // read alias covers list, get, show per the manifest permissions section
      expect(grantedOps).toEqual(['get', 'list', 'show'])
    })

    it('does not grant create (not in read alias)', () => {
      const events = findResource(explanation, 'events')
      expect(events.notGranted.some((op) => op.operation === 'create')).toBe(true)
    })

    it('does not grant delete (not in read alias)', () => {
      const events = findResource(explanation, 'events')
      expect(events.notGranted.some((op) => op.operation === 'delete')).toBe(true)
    })
  })

  // ---------------------------------------------------------------------------
  // Multiple apps in scope — only matching app is considered
  // ---------------------------------------------------------------------------

  describe('scope referencing multiple apps — only matching app filtered in', () => {
    const scope = [
      'testapp:events:list',
      'otherapp:files:read', // different app — must be ignored
    ]
    const explanation = explainScope(scope, MANIFEST)

    it('only grants permissions belonging to testapp', () => {
      const events = findResource(explanation, 'events')
      const grantedPerms = events.granted.map((op) => op.permission)
      for (const perm of grantedPerms) {
        expect(perm.startsWith('testapp:')).toBe(true)
      }
    })

    it('does not grant otherapp permissions on this manifest', () => {
      // otherapp:files:read is not in the testapp manifest — grantsNothing
      // for otherapp events would be uncovered by testapp's explanation
      const events = findResource(explanation, 'events')
      const hasOtherApp = events.granted.some((op) => op.permission.startsWith('otherapp:'))
      expect(hasOtherApp).toBe(false)
    })
  })

  // ---------------------------------------------------------------------------
  // Edge: empty scope
  // ---------------------------------------------------------------------------

  describe('edge case — empty scope', () => {
    const explanation = explainScope([], MANIFEST)

    it('grantsNothing is true for an empty scope', () => {
      expect(explanation.grantsNothing).toBe(true)
    })

    it('all permissions are not-granted across all resources', () => {
      for (const resource of explanation.resources) {
        expect(resource.granted).toHaveLength(0)
      }
    })
  })

  // ---------------------------------------------------------------------------
  // Edge: manifest has no permissions section
  // ---------------------------------------------------------------------------

  describe('edge case — manifest without permissions section', () => {
    const manifestWithoutPermissions: AppManifest = {
      ...MANIFEST,
      permissions: undefined,
      commands: {},
    }
    const explanation = explainScope(['testapp:events:list'], manifestWithoutPermissions)

    it('produces an empty resources list when no permissions section', () => {
      expect(explanation.resources).toHaveLength(0)
    })

    it('grantsNothing is true when permissions section is absent', () => {
      expect(explanation.grantsNothing).toBe(true)
    })
  })

  // ---------------------------------------------------------------------------
  // Edge: scope references unknown resource
  // ---------------------------------------------------------------------------

  describe('edge case — scope referencing unknown resource in this manifest', () => {
    // testapp:unknown-resource:list is not in any permissions mapping
    // expandPermissions will throw PermissionExpansionError for unknown resources;
    // for this test we use a pattern for a *different* app so it is silently filtered.
    const scope = ['differentapp:events:list']
    const explanation = explainScope(scope, MANIFEST)

    it('grantsNothing because the scope is for a different app', () => {
      expect(explanation.grantsNothing).toBe(true)
    })
  })

  // ---------------------------------------------------------------------------
  // Structured result: permission strings are correct
  // ---------------------------------------------------------------------------

  describe('structured result — permission strings are full app:resource:operation', () => {
    const scope = ['testapp:events:create']
    const explanation = explainScope(scope, MANIFEST)

    it('granted operation carries the full permission string', () => {
      const events = findResource(explanation, 'events')
      const createOp = events.granted.find((op) => op.operation === 'create')
      // Permission string must be the full triple, not just the operation
      expect(createOp?.permission).toBe('testapp:events:create')
    })

    it('not-granted operations carry full permission strings', () => {
      const events = findResource(explanation, 'events')
      for (const op of events.notGranted) {
        expect(op.permission).toMatch(/^testapp:events:/)
      }
    })
  })

  // ---------------------------------------------------------------------------
  // Resources are sorted alphabetically for deterministic output
  // ---------------------------------------------------------------------------

  describe('deterministic resource ordering', () => {
    const explanation = explainScope(['testapp:events:list'], MANIFEST)

    it('resources are sorted by name', () => {
      const names = explanation.resources.map((r) => r.resource)
      expect(names).toEqual([...names].sort())
    })
  })

  // ---------------------------------------------------------------------------
  // Regression: case-insensitive app matching
  //
  // The app segment of a scope pattern must match the manifest's app name
  // case-insensitively. Previously a mixed-case app segment (`Testapp:...`) was
  // silently dropped by a case-sensitive equality check, wrongly yielding
  // grantsNothing: true.
  // ---------------------------------------------------------------------------

  describe('regression — case-insensitive app segment matching', () => {
    // manifest.app.name = "testapp"; scope uses mixed-case "Testapp".
    const scope = ['Testapp:events:list']
    const explanation = explainScope(scope, MANIFEST)

    it('does not drop a mixed-case app segment (grantsNothing is false)', () => {
      expect(explanation.grantsNothing).toBe(false)
    })

    it('explains the mixed-case scope as granting the list operation', () => {
      const events = findResource(explanation, 'events')
      const listOp = events.granted.find((op) => op.operation === 'list')
      expect(listOp).toBeDefined()
      // Description still sourced from MANIFEST.commands.listEvents.description
      expect(listOp?.description).toBe('List all events')
    })

    it('matches an upper-case app segment too (CALENDAR-style shouting)', () => {
      const upper = explainScope(['TESTAPP:events:create'], MANIFEST)
      const events = findResource(upper, 'events')
      expect(events.granted.some((op) => op.operation === 'create')).toBe(true)
      expect(upper.grantsNothing).toBe(false)
    })
  })
})

// ---------------------------------------------------------------------------
// renderScopeExplanation — plain-text renderer
// ---------------------------------------------------------------------------

describe('renderScopeExplanation', () => {
  it('renders a "none" message for an empty scope', () => {
    const explanation = explainScope([], MANIFEST)
    const text = renderScopeExplanation(explanation)
    expect(text).toContain('none')
  })

  it('includes the app name in the output header', () => {
    const explanation = explainScope(['testapp:events:list'], MANIFEST)
    const text = renderScopeExplanation(explanation)
    // App name comes from manifest.app.name
    expect(text).toContain('testapp')
  })

  it('includes granted operations with descriptions', () => {
    const explanation = explainScope(['testapp:events:list'], MANIFEST)
    const text = renderScopeExplanation(explanation)
    // "list" operation should appear with its description from the manifest command
    expect(text).toContain('list')
    expect(text).toContain('List all events')
  })

  it('includes not-granted operations', () => {
    const explanation = explainScope(['testapp:events:list'], MANIFEST)
    const text = renderScopeExplanation(explanation)
    // "create" is not granted, must appear in the cannot section
    expect(text).toContain('create')
    // The word "Cannot" or similar must appear
    expect(text).toMatch(/[Cc]annot/)
  })

  it('mentions Can/Cannot for events when partial scope', () => {
    const explanation = explainScope(['testapp:events:list', 'testapp:events:create'], MANIFEST)
    const text = renderScopeExplanation(explanation)
    expect(text).toContain('Can:')
    expect(text).toContain('Cannot:')
  })

  it('full wildcard renders no Cannot lines for covered resources', () => {
    const explanation = explainScope(['testapp:*:*'], MANIFEST)
    const text = renderScopeExplanation(explanation)
    // All resources fully covered — no Cannot sections expected
    expect(text).not.toContain('Cannot:')
  })
})
