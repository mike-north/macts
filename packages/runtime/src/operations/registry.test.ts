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
 * registration (D2, fail closed). A resource-scoped command other than a
 * list or create (a get, update or delete, or a command such as `show`) with
 * no identifier parameter (no required parameter other than its parent's),
 * or an application-scoped delete with none, selects no item and
 * is refused at registration (D5), from the manifest or from a contract. The
 * refusal names the app and the command and says what to declare. A
 * resource whose primary identifier declares no targeting and is not the
 * class's dictionary id, code ID, is refused too (D10), naming the app, the
 * resource and the property. Every shipped manifest still registers, and
 * none declares such a command or resource.
 */

import { readdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { z } from 'zod'
import {
  knownItemSelectionGap,
  loadManifest,
  resolveManifestRoutes,
  type AppManifest,
} from '@macts/core'
import { panesManifest } from '@macts/core/testing'
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
      // Explicit: neither property is declared with the dictionary id's
      // code, so the default targeting would be refused.
      identifiers: [{ property: 'calendarIdentifier', primary: true, targeting: 'byId' }],
    },
    Event: {
      name: 'Event',
      plural: 'Events',
      description: 'An event',
      properties: {},
      identifiers: [{ property: 'uid', primary: true, targeting: 'byId' }],
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
      parameters: [{ name: 'id', type: 'string', description: 'Identifier', required: true }],
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
    // It acts on one item, so it declares the item's identifier.
    show: {
      name: 'show',
      description: 'Show an item',
      scope: 'resource',
      parameters: [{ name: 'id', type: 'string', description: 'Identifier', required: true }],
    },
    reloadCalendars: {
      name: 'reloadCalendars',
      description: 'Reload all calendars',
      scope: 'application',
      parameters: [],
    },
  },
}

/** An `unsupported` marker for a fixture command: a command so marked has no route. */
const UNSUPPORTED = {
  evidence: {
    source: 'live',
    observedAt: '2026-01-15T10:30:00.000Z',
    bundleId: 'com.apple.iCal',
    appVersion: '15.0',
    osVersion: '27.2',
    expression: 'the events collection at the application',
    errorNumber: -1728,
  },
} as const

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

  it.each<['get' | 'update', AppManifest['commands'][string]['parameters']]>([
    ['get', []],
    ['get', [{ name: 'verbose', type: 'boolean', description: 'All fields', required: false }]],
    ['update', [{ name: 'summary', type: 'string', description: 'Title', required: false }]],
  ])(
    'refuses the %s shape with no identifier parameter, naming the app, command and parameter',
    (shape, parameters) => {
      const broken: AppManifest = {
        ...CALENDAR,
        commands: {
          [`${shape}Event`]: {
            name: shape,
            description: `${shape} an event`,
            scope: 'resource',
            resourceType: 'Event',
            parameters,
          },
        },
      }
      const refusal = (): unknown => operationsFromManifest(broken)
      expect(refusal).toThrow(OperationRegistrationError)
      expect(refusal).toThrow(`App "Calendar"`)
      expect(refusal).toThrow(`"${shape}Event"`)
      expect(refusal).toThrow('identifier parameter')
      expect(refusal).toThrow(
        `Declare the item's identifier as a required parameter of "${shape}Event"`
      )
    }
  )

  it('refuses a get whose only required parameter is its parent', () => {
    const broken: AppManifest = {
      ...CALENDAR,
      commands: {
        getEvent: {
          name: 'get',
          description: 'Get an event',
          scope: 'resource',
          resourceType: 'Event',
          parent: { resource: 'Calendar', parameter: 'calendarId' },
          parameters: [
            { name: 'calendarId', type: 'string', description: 'Calendar', required: true },
          ],
        },
      },
    }
    expect(() => operationsFromManifest(broken)).toThrow(
      /App "Calendar".*"getEvent".*identifier parameter/s
    )
  })

  it('registers a get or update whose identifier parameter is declared, under a parent or not', () => {
    const manifest: AppManifest = {
      ...CALENDAR,
      commands: {
        getCalendar: {
          name: 'get',
          description: 'Get a calendar',
          scope: 'resource',
          resourceType: 'Calendar',
          parameters: [{ name: 'id', type: 'string', description: 'Identifier', required: true }],
        },
        updateEvent: {
          name: 'update',
          description: 'Update an event',
          scope: 'resource',
          resourceType: 'Event',
          parent: { resource: 'Calendar', parameter: 'calendarId' },
          parameters: [
            { name: 'calendarId', type: 'string', description: 'Calendar', required: true },
            { name: 'uid', type: 'string', description: 'Event', required: true },
          ],
        },
      },
    }
    expect(operationsFromManifest(manifest).map((op) => op.descriptor.id)).toEqual([
      'calendar.calendars.getCalendar',
      'calendar.events.updateEvent',
    ])
  })

  it.each<
    [
      string,
      AppManifest['commands'][string]['parameters'],
      AppManifest['commands'][string]['parent'],
    ]
  >([
    ['no parameters', [], undefined],
    [
      'only an optional parameter',
      [{ name: 'force', type: 'boolean', description: 'Skip checks', required: false }],
      undefined,
    ],
    [
      'only its parent parameter',
      [{ name: 'calendarId', type: 'string', description: 'Calendar', required: true }],
      { resource: 'Calendar', parameter: 'calendarId' },
    ],
  ])('refuses a delete with %s, saying no item can be selected', (_label, parameters, parent) => {
    const broken: AppManifest = {
      ...CALENDAR,
      commands: {
        removeEvent: {
          name: 'delete',
          description: 'Delete an event',
          scope: 'resource',
          resourceType: 'Event',
          ...(parent === undefined ? {} : { parent }),
          parameters,
        },
      },
    }
    let message = ''
    try {
      operationsFromManifest(broken)
    } catch (error) {
      expect(error).toBeInstanceOf(OperationRegistrationError)
      message = error instanceof Error ? error.message : ''
    }
    expect(message).toContain('App "Calendar"')
    expect(message).toContain('delete command "removeEvent" declares no identifier parameter')
    expect(message).toContain('no item can be selected')
    expect(message).toContain(
      `Declare the item's identifier as a required parameter of "removeEvent"`
    )
    // No identifier name is supplied on the command's behalf.
    expect(message).not.toContain('"id"')
  })

  // Regression (#287): a resource command that declares no identifier
  // registered an operation that sent the app no item (Mail's `send`, Word's
  // `save`). It is refused by the same rule as a get, naming the command and
  // saying the app receives the item as the command's direct parameter.
  it('refuses a resource command with no identifier parameter, naming the app and command', () => {
    const broken: AppManifest = {
      ...CALENDAR,
      commands: {
        ...CALENDAR.commands,
        showEvent: {
          name: 'show',
          description: 'Show an event',
          scope: 'resource',
          resourceType: 'Event',
          parameters: [],
        },
      },
    }
    const refusal = (): unknown => operationsFromManifest(broken)
    expect(refusal).toThrow(OperationRegistrationError)
    expect(refusal).toThrow(
      'App "Calendar" cannot be registered from its manifest: its resource-scoped command "showEvent" declares no identifier parameter.'
    )
    expect(refusal).toThrow("which the app receives as the command's direct parameter")
  })

  // Guards the application-scoped delete with no parameters (the shape of the
  // dictionary-level delete in Finder, Google Chrome, iTerm, Mail, Music and
  // TV): it names no item, so the manifest is refused by the same rule as a
  // resource-scoped delete, and registers nothing.
  it('refuses an application-scoped delete with no parameters, naming the app and command', () => {
    const broken: AppManifest = {
      ...CALENDAR,
      commands: {
        ...CALENDAR.commands,
        delete: {
          name: 'delete',
          description: 'Delete an object',
          scope: 'application',
          parameters: [],
        },
      },
    }
    const refusal = (): unknown => operationsFromManifest(broken)
    expect(refusal).toThrow(OperationRegistrationError)
    expect(refusal).toThrow(
      'App "Calendar" cannot be registered from its manifest: its application-scoped delete command "delete" declares no identifier parameter.'
    )
    expect(refusal).toThrow(
      `Scope "delete" to the resource whose items it deletes and declare the item's identifier as a required parameter.`
    )
  })

  // Guards that the rule at application scope covers delete only: an
  // application-scoped update selects no item (Finder's refreshes the display
  // of items), so it still registers.
  it('registers an application-scoped update that declares no identifier', () => {
    const manifest: AppManifest = {
      ...CALENDAR,
      commands: {
        update: {
          name: 'update',
          description: 'Refresh the display of items',
          scope: 'application',
          parameters: [
            { name: 'necessity', type: 'boolean', description: 'Always', required: false },
          ],
        },
      },
    }
    expect(operationsFromManifest(manifest).map((op) => op.descriptor.id)).toEqual([
      'calendar.app.update',
    ])
  })

  it('registers a delete with an identifier parameter', () => {
    expect(operations.map((op) => op.descriptor.id)).toContain('calendar.events.deleteEvent')
  })

  it('does not refuse a get marked unsupported, which exposes no operation', () => {
    const manifest: AppManifest = {
      ...CALENDAR,
      commands: {
        getEvent: {
          name: 'get',
          description: 'Get an event',
          scope: 'resource',
          resourceType: 'Event',
          parameters: [],
          unsupported: UNSUPPORTED,
        },
      },
    }
    expect(operationsFromManifest(manifest)).toEqual([])
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

  // Guards that registration never offers a lookup by an id specifier that
  // cannot find the item: an untargeted identifier that is not the class's
  // dictionary id, code ID, is refused (phases/13 D10), naming the app, the
  // resource and the property.
  it('refuses an untargeted identifier that is not the dictionary id', () => {
    const refusal = (): unknown => operationsFromManifest(UNTARGETED_EVENT_NAME)
    expect(refusal).toThrow(OperationRegistrationError)
    expect(refusal).toThrow(
      'App "Calendar" cannot be registered from its manifest: its resource "Event" is identified by "summary" (code "wr11"), which is not the class\'s dictionary id, code ID, and declares no targeting.'
    )
  })

  // Guards that the dictionary id keeps the default under any name, as
  // Calendar's event `uid` does.
  it('registers an untargeted identifier on a code ID property', () => {
    const manifest = withEvent({
      properties: {
        uid: { access: 'r', type: 'string', description: 'Its id', optional: false, code: 'ID  ' },
      },
      identifiers: [{ property: 'uid', primary: true }],
    })
    expect(operationsFromManifest(manifest).map((op) => op.descriptor.id)).toContain(
      'calendar.events.deleteEvent'
    )
  })
})

/** {@link CALENDAR} with its Event resource's `properties` and `identifiers` replaced. */
function withEvent(event: Pick<AppManifest['resources'][string], 'properties' | 'identifiers'>) {
  const base = CALENDAR.resources['Event']
  if (base === undefined) throw new Error('fixture has an Event resource')
  return { ...CALENDAR, resources: { ...CALENDAR.resources, Event: { ...base, ...event } } }
}

/** {@link CALENDAR} with events identified by their summary and no targeting. */
const UNTARGETED_EVENT_NAME: AppManifest = withEvent({
  properties: {
    summary: { access: 'r', type: 'string', description: 'Title', optional: false, code: 'wr11' },
  },
  identifiers: [{ property: 'summary', primary: true }],
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

/**
 * The Panes manifest, whose tabs are positional, with a tab get that selects
 * its tab by text: past the schema, as a caller may register a manifest
 * object, but against the `positional` marker's rule (phases/13 D10).
 */
function panesWithTextPosition(): AppManifest {
  const manifest = panesManifest()
  const position = manifest.commands['getTab']?.parameters[1]
  if (position === undefined) throw new Error('the Panes fixture has no tab position')
  position.type = 'string'
  return manifest
}

/** What the `positional` marker's rule says of {@link panesWithTextPosition}. */
const TEXT_POSITION_PROBLEM =
  'The get command "getTab" selects an item of the positional resource "Tab" by its zero-based position, so its item parameter "index" must be of type integer.'

describe('registration of a manifest whose positional marker does not hold', () => {
  // Guards that registration refuses what generation and the schema refuse.
  it('refuses it from the manifest alone', () => {
    expect(() => operationsFromManifest(panesWithTextPosition())).toThrow(
      new OperationRegistrationError(
        `App "Panes" cannot be registered from its manifest: ${TEXT_POSITION_PROBLEM}`
      )
    )
  })

  it('refuses it from a contract, whichever operations the contract covers', () => {
    expect(() =>
      operationsFromContract(contractWith([], 'panes'), panesWithTextPosition())
    ).toThrow(
      new OperationRegistrationError(
        `App "Panes" cannot be registered from its contract, because its manifest is refused: ${TEXT_POSITION_PROBLEM}`
      )
    )
  })

  it('registers the manifest when the marker holds', () => {
    expect(operationsFromManifest(panesManifest()).map(({ descriptor }) => descriptor.id)).toEqual([
      'panes.windows.listWindows',
      'panes.windows.getWindow',
      'panes.tabs.listTabs',
      'panes.tabs.getTab',
      'panes.app.frontTab',
    ])
  })
})

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

  // Guards that a contract cannot register what the manifest rule refuses:
  // registration from a contract and from the manifest alone accept the same
  // manifests, and the refusal says it was the contract registration.
  it('refuses a contract whose operation targets a get with no identifier parameter', () => {
    const manifest: AppManifest = {
      ...CALENDAR,
      commands: {
        ...CALENDAR.commands,
        getEvent: {
          name: 'get',
          description: 'Get an event',
          scope: 'resource',
          resourceType: 'Event',
          parameters: [],
        },
      },
    }
    const get = descriptor({
      id: 'calendar.events.getEvent',
      permission: 'calendar:events:getEvent',
      target: { command: 'getEvent', resource: 'Event' },
    })
    const refusal = (): unknown => operationsFromContract(contractWith([get]), manifest)
    expect(refusal).toThrow(OperationRegistrationError)
    expect(refusal).toThrow(
      'App "Calendar" cannot be registered from its contract, because its manifest is refused: its get command "getEvent" declares no identifier parameter.'
    )
  })

  // Regression (#287): the contract registration refuses a resource command
  // with no identifier, as registration from the manifest alone does.
  it('refuses a contract whose operation targets a resource command with no identifier parameter', () => {
    const manifest: AppManifest = {
      ...CALENDAR,
      commands: {
        ...CALENDAR.commands,
        showEvent: {
          name: 'show',
          description: 'Show an event',
          scope: 'resource',
          resourceType: 'Event',
          parameters: [],
        },
      },
    }
    const show = descriptor({
      id: 'calendar.events.showEvent',
      permission: 'calendar:events:showEvent',
      target: { command: 'showEvent', resource: 'Event' },
    })
    const refusal = (): unknown => operationsFromContract(contractWith([show]), manifest)
    expect(refusal).toThrow(OperationRegistrationError)
    expect(refusal).toThrow(
      'App "Calendar" cannot be registered from its contract, because its manifest is refused: its resource-scoped command "showEvent" declares no identifier parameter.'
    )
  })

  // Guards that the check covers the manifest, not only the contract's
  // operations: a contract that leaves out the application-scoped delete is
  // still refused for a manifest that declares it, as registering the
  // manifest alone is.
  it('refuses a contract for a manifest with an application-scoped delete it does not cover', () => {
    const manifest: AppManifest = {
      ...CALENDAR,
      commands: {
        ...CALENDAR.commands,
        delete: { name: 'delete', description: 'Delete', scope: 'application', parameters: [] },
      },
    }
    expect(() => operationsFromContract(contractWith([descriptor()]), manifest)).toThrow(
      /App "Calendar".*application-scoped delete command "delete" declares no identifier parameter/
    )
  })

  // Guards that a contract cannot register a resource the manifest rule
  // refuses for its untargeted identifier, whichever operations it covers.
  it('refuses a contract for a manifest with an untargeted identifier that is not the dictionary id', () => {
    const refusal = (): unknown =>
      operationsFromContract(contractWith([descriptor()]), UNTARGETED_EVENT_NAME)
    expect(refusal).toThrow(OperationRegistrationError)
    expect(refusal).toThrow(
      'App "Calendar" cannot be registered from its contract, because its manifest is refused: its resource "Event" is identified by "summary" (code "wr11"), which is not the class\'s dictionary id, code ID, and declares no targeting.'
    )
  })
})

/** A range read marker for a fixture resource whose range reads passed. */
const RANGE_READ_PASSED = {
  supported: true,
  read: 'range',
  evidence: {
    source: 'probe',
    observedAt: '2026-01-15T10:30:00.000Z',
    bundleId: 'com.apple.iCal',
    appVersion: '1.0',
    osVersion: '27.2',
    cost: {
      observedAt: '2026-01-15T10:30:00.000Z',
      pageMs: 400,
      columnMs: 900,
      items: 120,
      runs: 5,
      pageSize: 25,
    },
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
      { property: 'calendarIdentifier', primary: true, targeting: 'byId', ...UNIQUE },
      null
    )

    expect(() => operationsFromContract(contractWith([pagedList]), manifest)).toThrow(
      /takes the paging inputs, but the manifest says it does not page/
    )
    expect(operationsFromContract(contractWith([wholeList]), manifest)).toHaveLength(1)
  })

  it('refuses a list without the paging inputs when the manifest says it pages', () => {
    const manifest = calendarWith({
      property: 'calendarIdentifier',
      primary: true,
      targeting: 'byId',
      ...UNIQUE,
    })

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

/** Every manifest the repository ships, loaded and validated. */
async function shippedManifests(): Promise<AppManifest[]> {
  const manifestsDir = fileURLToPath(new URL('../../../../manifests/', import.meta.url))
  const entries = await readdir(manifestsDir, { withFileTypes: true })
  return Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => loadManifest(`${manifestsDir}${entry.name}/app.yaml`))
  )
}

describe('repository manifests', () => {
  it('every shipped manifest registers into one registry without conflicts', async () => {
    const manifests = await shippedManifests()
    expect(manifests.length).toBeGreaterThan(0)

    const registry = new OperationRegistry()
    for (const manifest of manifests) {
      registry.add(operationsFromManifest(manifest))
    }

    const routeCount = manifests.reduce((n, m) => n + resolveManifestRoutes(m).length, 0)
    expect(registry.list()).toHaveLength(routeCount)
  })

  // Guards the shipped manifests directly, by the rule as phases/13 D5 states
  // it rather than through the registry's own check: every routed
  // resource-scoped command other than a list or create (a get, update or
  // delete, or a command the app sends the item as its direct parameter),
  // and every routed delete at application scope, declares a required
  // parameter other than its parent's. A manifest that regressed would fail
  // here with the offending app and command named, before any surface was
  // generated from it. Regression (#287): 48 resource commands, Mail's `send`
  // and Word's `save` among them, declared none.
  it('no shipped manifest offers a command that cannot select its item', async () => {
    const offenders: string[] = []
    for (const manifest of await shippedManifests()) {
      for (const { commandKey, command } of resolveManifestRoutes(manifest)) {
        const itemCommand =
          command.name === 'delete' ||
          (command.scope === 'resource' && command.name !== 'list' && command.name !== 'create')
        // A known gap stays offered until its command can select its item;
        // its own ratchet in @macts/core pins the list.
        if (!itemCommand || knownItemSelectionGap(manifest, commandKey) !== undefined) continue
        const parent = command.parent?.parameter
        if (command.parameters.some((p) => p.required && p.name !== parent)) continue
        offenders.push(`${manifest.app.name}: ${commandKey}`)
      }
    }
    expect([...new Set(offenders)]).toEqual([])
  })

  // Guards the shipped manifests directly, by the rule as phases/13 D10
  // states it rather than through the registry's own check: every usable
  // resource whose primary identifier (as resolved, inherited ones included)
  // declares no targeting is identified by the class's dictionary id, the
  // property with code ID. A manifest that regressed fails here naming the
  // app, the resource and the property.
  it('no shipped manifest leaves an identifier other than the dictionary id untargeted', async () => {
    const offenders: string[] = []
    for (const manifest of await shippedManifests()) {
      for (const [key, resource] of Object.entries(manifest.resources)) {
        if (resource.unsupported !== undefined) continue
        const entries = resource.identifiers ?? []
        const primary = entries.find((entry) => entry.primary) ?? entries[0]
        if (primary === undefined || primary.targeting !== undefined) continue
        if (resource.properties[primary.property]?.code === 'ID  ') continue
        offenders.push(`${manifest.app.name}: ${key}.${primary.property}`)
      }
    }
    expect(offenders).toEqual([])
  })
})
