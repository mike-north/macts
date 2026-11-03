/**
 * Tests for the operation registry: manifest-derived operations, contract
 * registration against the manifest, and id uniqueness.
 *
 * Expected ids, permissions, and targets are written by hand from the
 * derivation the RPC router uses (phases/13 D2): the id is the route
 * `app.<resource plural>.<segment>` (or `app.app.<segment>`), the permission
 * is the command's declared permission or `app:<resource plural>:<segment>`
 * (or `app:app:<segment>`), where the segment is the command's `routeName`,
 * else its key, and the target names the manifest command key and resource
 * key. A contract
 * descriptor whose permission disagrees with the manifest is refused at
 * registration (D2, fail closed).
 */

import { readdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import { loadManifest, resolveManifestRoutes, type AppManifest } from '@macts/core'
import {
  PASSTHROUGH_PLAN,
  ValueTypes as t,
  type AnyOperationDescriptor,
  type AppContract,
  type ValueType,
} from '@macts/contracts'
import {
  OperationRegistrationError,
  OperationRegistry,
  operationsFromContract,
  operationsFromManifest,
} from './registry.js'

const CALENDAR: AppManifest = {
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
  suites: [],
  relationships: [],
  commands: {
    list: {
      name: 'list',
      description: 'List calendars',
      scope: 'resource',
      resourceType: 'Calendar',
      parameters: [],
    },
    createEvent: {
      name: 'create',
      description: 'Create an event',
      scope: 'resource',
      resourceType: 'Event',
      parameters: [{ name: 'summary', type: 'string', description: 'Title', required: true }],
    },
    deleteEvent: {
      name: 'delete',
      description: 'Delete an event',
      scope: 'resource',
      resourceType: 'Event',
      parameters: [],
      permission: 'calendar:events:delete',
      permissionHistory: [
        {
          version: '0.2.0',
          permission: 'calendar:events:remove',
          changed: '2026-01-15',
          reason: 'Aligned with the delete verb',
        },
      ],
    },
    // No resourceType: applies to every resource, one operation per resource.
    show: {
      name: 'show',
      description: 'Show an item',
      scope: 'resource',
      parameters: [],
    },
    reloadCalendars: {
      name: 'reloadCalendars',
      description: 'Reload all calendars',
      scope: 'application',
      parameters: [],
    },
  },
}

/** A second app whose name normalizes to the same route segment as {@link CALENDAR}. */
const CALENDAR_IMPOSTOR: AppManifest = {
  ...CALENDAR,
  app: { ...CALENDAR.app, name: 'CALENDAR', bundleId: 'com.example.calendar' },
}

describe('operationsFromManifest', () => {
  const operations = operationsFromManifest(CALENDAR)

  it('derives one operation per route with the router ids, permissions, and targets', () => {
    expect(
      operations.map(({ descriptor }) => ({
        id: descriptor.id,
        permission: descriptor.permission,
        target: descriptor.target,
      }))
    ).toEqual([
      {
        id: 'calendar.calendars.list',
        permission: 'calendar:calendars:list',
        target: { command: 'list', resource: 'Calendar' },
      },
      {
        id: 'calendar.events.createEvent',
        permission: 'calendar:events:createEvent',
        target: { command: 'createEvent', resource: 'Event' },
      },
      {
        id: 'calendar.events.deleteEvent',
        permission: 'calendar:events:delete', // declared permission wins
        target: { command: 'deleteEvent', resource: 'Event' },
      },
      {
        id: 'calendar.calendars.show',
        permission: 'calendar:calendars:show',
        target: { command: 'show', resource: 'Calendar' },
      },
      {
        id: 'calendar.events.show',
        permission: 'calendar:events:show',
        target: { command: 'show', resource: 'Event' },
      },
      {
        id: 'calendar.app.reloadCalendars',
        permission: 'calendar:app:reloadCalendars',
        target: { command: 'reloadCalendars' }, // application commands name no resource
      },
    ])
  })

  it('publishes a routeName command under its route name, targeting its own key', async () => {
    // The real Notes manifest: the attachment get has the key getAttachment
    // (its signature differs from the shared get) and routeName get, with no
    // declared permission.
    const notes = await loadManifest(
      fileURLToPath(new URL('../../../../manifests/notes/app.yaml', import.meta.url))
    )
    const get = operationsFromManifest(notes).find(
      ({ descriptor }) => descriptor.id === 'notes.attachments.get'
    )
    expect(get?.descriptor.permission).toBe('notes:attachments:get')
    expect(get?.descriptor.target).toEqual({ command: 'getAttachment', resource: 'Attachment' })
    expect(operationsFromManifest(notes).map(({ descriptor }) => descriptor.id)).not.toContain(
      'notes.attachments.getAttachment'
    )
  })

  it('classifies risk from the command and carries permission history', () => {
    const byId = new Map(operations.map((op) => [op.descriptor.id, op]))
    expect(byId.get('calendar.calendars.list')?.risk).toBe('read')
    expect(byId.get('calendar.events.createEvent')?.risk).toBe('write')
    expect(byId.get('calendar.events.deleteEvent')?.risk).toBe('delete')
    expect(byId.get('calendar.app.reloadCalendars')?.risk).toBe('system-change')
    expect(byId.get('calendar.events.deleteEvent')?.permissionHistory).toEqual(
      CALENDAR.commands['deleteEvent']?.permissionHistory
    )
    expect(byId.get('calendar.calendars.list')).not.toHaveProperty('permissionHistory')
  })

  it('uses the command description and passthrough value types with the request contract', () => {
    const create = operations.find((op) => op.descriptor.id === 'calendar.events.createEvent')
    expect(create?.descriptor.description).toBe('Create an event')
    expect(create?.descriptor.input.plan).toBe(PASSTHROUGH_PLAN)
    expect(create?.descriptor.output.plan).toBe(PASSTHROUGH_PLAN)
    expect(create?.descriptor.input.wire.safeParse({ summary: 'Standup' }).success).toBe(true)
    expect(create?.descriptor.input.wire.safeParse({}).success).toBe(false)
    expect(create?.manifest).toBe(CALENDAR)
  })

  it('refuses a declared permission that is not app:resource:operation', () => {
    const broken: AppManifest = {
      ...CALENDAR,
      commands: {
        list: {
          name: 'list',
          description: 'List calendars',
          scope: 'resource',
          resourceType: 'Calendar',
          parameters: [],
          permission: 'list-calendars',
        },
      },
    }
    expect(() => operationsFromManifest(broken)).toThrow(OperationRegistrationError)
  })
})

/** A hand-written value type standing in for a generated one. */
const RECORD_VALUE: ValueType<unknown> = {
  plan: { kind: 'record', fields: {} },
  sdk: z.record(z.string(), z.string()),
  wire: z.record(z.string(), z.string()),
  encode: (value) => ({ ok: true, value: String(value) }),
  decode: (wire) => ({ ok: true, value: wire }),
}

/** A descriptor as a generated contract would carry it. */
function descriptor(overrides: Partial<AnyOperationDescriptor> = {}): AnyOperationDescriptor {
  return {
    id: 'calendar.calendars.list',
    permission: 'calendar:calendars:list',
    target: { command: 'list', resource: 'Calendar' },
    description: 'List calendars',
    input: RECORD_VALUE,
    output: RECORD_VALUE,
    ...overrides,
  }
}

/** A generated-contract fixture holding `descriptors`, filed by their ids. */
function contractWith(
  descriptors: readonly AnyOperationDescriptor[],
  app = 'calendar'
): AppContract<unknown> {
  return {
    app,
    operations: Object.fromEntries(descriptors.map((d) => [d.id, d])),
    resources: {},
    loadManifest: () => Promise.resolve(CALENDAR),
    bind: () => ({}),
  }
}

describe('operationsFromContract', () => {
  it('registers descriptors whose permission and target match the manifest', () => {
    const list = descriptor()
    const remove = descriptor({
      id: 'calendar.events.deleteEvent',
      permission: 'calendar:events:delete',
      target: { command: 'deleteEvent', resource: 'Event' },
    })

    const operations = operationsFromContract(contractWith([list, remove]), CALENDAR)

    expect(operations).toHaveLength(2)
    expect(operations[0]?.descriptor).toBe(list)
    expect(operations[0]?.risk).toBe('read')
    expect(operations[1]?.descriptor).toBe(remove)
    expect(operations[1]?.risk).toBe('delete')
    expect(operations[1]?.permissionHistory).toEqual(
      CALENDAR.commands['deleteEvent']?.permissionHistory
    )
  })

  it('refuses a descriptor whose permission differs from the manifest (cannot widen authority)', () => {
    // A tampered package claiming a read permission for a destructive operation.
    const tampered = descriptor({
      id: 'calendar.events.deleteEvent',
      permission: 'calendar:events:list',
      target: { command: 'deleteEvent', resource: 'Event' },
    })
    expect(() => operationsFromContract(contractWith([tampered]), CALENDAR)).toThrow(
      /declares permission "calendar:events:list", but the manifest requires "calendar:events:delete"/
    )
  })

  it('refuses a descriptor whose target differs from the manifest route', () => {
    // Keeps the list permission but points at the delete command.
    const retargeted = descriptor({ target: { command: 'deleteEvent', resource: 'Event' } })
    expect(() => operationsFromContract(contractWith([retargeted]), CALENDAR)).toThrow(
      OperationRegistrationError
    )
  })

  it('refuses an operation the manifest does not expose', () => {
    const unknown = descriptor({ id: 'calendar.events.purgeEverything' })
    expect(() => operationsFromContract(contractWith([unknown]), CALENDAR)).toThrow(
      /does not exist in the calendar manifest/
    )
  })

  it('refuses a descriptor filed under a key other than its id', () => {
    const contract: AppContract<unknown> = {
      ...contractWith([]),
      operations: { 'calendar.calendars.show': descriptor() },
    }
    expect(() => operationsFromContract(contract, CALENDAR)).toThrow(OperationRegistrationError)
  })

  it('refuses a contract for a different app', () => {
    expect(() => operationsFromContract(contractWith([descriptor()], 'notes'), CALENDAR)).toThrow(
      OperationRegistrationError
    )
  })
})

/** A range read marker for a fixture resource whose range reads passed. */
const RANGE_READ_PASSED = {
  supported: true,
  evidence: {
    source: 'probe',
    observedAt: '2026-01-15T10:30:00.000Z',
    bundleId: 'com.apple.iCal',
    appVersion: '1.0',
    osVersion: '27.2',
  },
} as const

describe('operationsFromContract: paging agrees with the manifest', () => {
  /**
   * CALENDAR with the calendar identifier entry replaced by `identifier`, and
   * the calendar's range read marker set to `rangeRead`: by default one that
   * passed, and none for `null`.
   */
  function calendarWith(
    identifier: NonNullable<AppManifest['resources'][string]['identifiers']>[number],
    rangeRead: AppManifest['resources'][string]['rangeRead'] | null = RANGE_READ_PASSED
  ): AppManifest {
    const calendar = CALENDAR.resources['Calendar']
    if (calendar === undefined) throw new Error('fixture lost its Calendar')
    return {
      ...CALENDAR,
      resources: {
        ...CALENDAR.resources,
        Calendar: {
          ...calendar,
          identifiers: [identifier],
          ...(rangeRead === null ? {} : { rangeRead }),
        },
      },
    }
  }

  const UNIQUE = {
    unique: true,
    evidence: { unique: { source: 'curated', note: 'Calendar ids never repeat' } },
  } as const
  const pagedList = descriptor({
    input: t.record({ ...t.pageInputs() }),
    output: t.page(t.record({})),
  })
  const wholeList = descriptor({ input: t.record({}), output: t.page(t.record({})) })

  it('registers a paged list whose identifier is claimed unique, even targeted by property', () => {
    const manifest = calendarWith({
      property: 'name',
      primary: true,
      targeting: 'byProperty',
      ...UNIQUE,
    })

    expect(operationsFromContract(contractWith([pagedList]), manifest)).toHaveLength(1)
  })

  it('registers an unpaged list whose identifier makes no uniqueness claim', () => {
    expect(operationsFromContract(contractWith([wholeList]), CALENDAR)).toHaveLength(1)
  })

  it('refuses a list that takes the paging inputs when its identifier is not claimed unique', () => {
    expect(() => operationsFromContract(contractWith([pagedList]), CALENDAR)).toThrow(
      'Contract operation "calendar.calendars.list" takes the paging inputs, but the manifest says it does not page: its resource\'s primary identifier is not claimed unique, or its range reads are not known to work. Regenerate the contract.'
    )
  })

  it('refuses a list that takes the paging inputs when its unique identifier has no range read recorded', () => {
    const manifest = calendarWith(
      { property: 'calendarIdentifier', primary: true, ...UNIQUE },
      null
    )

    expect(() => operationsFromContract(contractWith([pagedList]), manifest)).toThrow(
      /takes the paging inputs, but the manifest says it does not page/
    )
    expect(operationsFromContract(contractWith([wholeList]), manifest)).toHaveLength(1)
  })

  it('refuses a list without the paging inputs when the manifest says it pages', () => {
    const manifest = calendarWith({ property: 'calendarIdentifier', primary: true, ...UNIQUE })

    expect(() => operationsFromContract(contractWith([wholeList]), manifest)).toThrow(
      'Contract operation "calendar.calendars.list" does not take the paging inputs, but the manifest says its list pages. Regenerate the contract.'
    )
  })
})

describe('OperationRegistry', () => {
  it('lists and looks up registered operations', () => {
    const registry = new OperationRegistry()
    registry.add(operationsFromManifest(CALENDAR))
    expect(registry.list()).toHaveLength(6)
    expect(registry.get('calendar.app.reloadCalendars')?.descriptor.target).toEqual({
      command: 'reloadCalendars',
    })
    expect(registry.get('calendar.app.missing')).toBeUndefined()
  })

  it('refuses an operation id registered by another app, and adds nothing from the refused batch', () => {
    const registry = new OperationRegistry()
    registry.add(operationsFromManifest(CALENDAR))
    const before = registry.list()

    expect(() => {
      registry.add(operationsFromManifest(CALENDAR_IMPOSTOR))
    }).toThrow(/Operation "calendar\.calendars\.list" is already registered/)
    expect(registry.list()).toEqual(before)
    expect(registry.get('calendar.calendars.list')?.manifest).toBe(CALENDAR)
  })

  it('refuses a batch that repeats an id', () => {
    const registry = new OperationRegistry()
    const [first] = operationsFromManifest(CALENDAR)
    if (first === undefined) throw new Error('fixture has operations')
    expect(() => {
      registry.add([first, first])
    }).toThrow(OperationRegistrationError)
    expect(registry.list()).toEqual([])
  })
})

describe('repository manifests', () => {
  it('every shipped manifest registers into one registry without conflicts', async () => {
    const manifestsDir = fileURLToPath(new URL('../../../../manifests/', import.meta.url))
    const entries = await readdir(manifestsDir, { withFileTypes: true })
    const manifests = await Promise.all(
      entries
        .filter((entry) => entry.isDirectory())
        .map((entry) => loadManifest(`${manifestsDir}${entry.name}/app.yaml`))
    )
    expect(manifests.length).toBeGreaterThan(0)

    const registry = new OperationRegistry()
    for (const manifest of manifests) {
      registry.add(operationsFromManifest(manifest))
    }

    const routeCount = manifests.reduce((n, m) => n + resolveManifestRoutes(m).length, 0)
    expect(registry.list()).toHaveLength(routeCount)
  })
})
