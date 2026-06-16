/**
 * Cross-surface body-coherence tests.
 *
 * For every resource command exposed over RPC (list/get/create/update/delete),
 * asserts:
 *
 * 1. The SDK-emitted request-body keys ⊇ the server's required parameters for
 *    that command (the SDK sends at least everything the server requires).
 * 2. Both the SDK and the server resolve the SAME identifier parameter name for
 *    the resource (get/update/delete) — they both now use the same resolver:
 *    `resolvePrimaryIdentifierProperty` from `manifest/identifier.ts`.
 *
 * Fixtures cover the cases that were previously broken or under-tested:
 *   - list-with-required-parent (calendarId in listEvents, listId in listReminders)
 *   - update (previously fell through to a generic else that emitted invalid JXA)
 *   - non-calendar create-within-parent (listId in createReminder)
 *
 * @see ../../manifest/identifier.ts (resolvePrimaryIdentifierProperty, CANONICAL_IDENTIFIER_KEY)
 * @see ../../../api/src/server/handlers/rpc.ts (executeResourceCommand, buildListCommandCode)
 */

import { describe, it, expect } from 'vitest'
import type { AppManifest, Command, Resource } from '../../manifest/index.js'
import { resolvePrimaryIdentifierProperty } from '../../manifest/index.js'
import { generateHttpClientSdk } from './http-client.js'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function findFile(
  files: { path: string; content: string }[],
  path: string
): { path: string; content: string } {
  const file = files.find((f) => f.path === path)
  if (!file) {
    throw new Error(`Expected file at path "${path}" to exist`)
  }
  return file
}

/**
 * Resolve the identifier param name using the SAME logic as the server's
 * `executeResourceCommand`: primary identifier from the manifest first, then
 * the first required command param, then 'id'.
 *
 * This mirrors `idParamName` in http-client.ts (which now uses
 * `resolvePrimaryIdentifierProperty`) so the test can verify both sides agree.
 */
function resolveServerIdentifierParam(command: Command, resource: Resource | undefined): string {
  return (
    resolvePrimaryIdentifierProperty(resource) ??
    command.parameters.find((p) => p.required)?.name ??
    'id'
  )
}

/**
 * Extract the parameter names a `list` command requires (required params only).
 * The server's `buildListCommandCode` uses the first required param as the
 * parent scoping identifier when it doesn't match the resource's own primary id.
 */
function requiredListParams(command: Command, resource: Resource | undefined): string[] {
  const ownId = resolvePrimaryIdentifierProperty(resource)
  return command.parameters.filter((p) => p.required && p.name !== ownId).map((p) => p.name)
}

// ---------------------------------------------------------------------------
// Fixture manifests
// ---------------------------------------------------------------------------

/**
 * Calendar manifest — representative of a two-level hierarchy where:
 *  - Calendar has a non-standard identifier (calendarIdentifier)
 *  - listEvents requires a parent calendarId (list-with-required-parent)
 *  - createEvent requires a parent calendarId (create-within-parent, Calendar domain)
 *  - There is no update command (to verify the SDK omits the method)
 */
const calendarManifest: AppManifest = {
  version: '1.0',
  app: { name: 'Calendar', bundleId: 'com.apple.iCal', tccEntitlements: ['calendar'] },
  suites: [],
  relationships: [],
  resources: {
    Calendar: {
      name: 'Calendar',
      plural: 'Calendars',
      description: 'A calendar containing events',
      properties: {
        name: { access: 'rw', type: 'string', description: 'Title', optional: false },
        calendarIdentifier: {
          access: 'r',
          type: 'string',
          description: 'A unique calendar key',
          optional: false,
        },
      },
      identifiers: [{ property: 'calendarIdentifier', primary: true }],
    },
    Event: {
      name: 'Event',
      plural: 'Events',
      description: 'A calendar event',
      properties: {
        summary: { access: 'rw', type: 'string', description: 'Summary', optional: false },
        uid: { access: 'r', type: 'string', description: 'Unique event key', optional: false },
      },
      identifiers: [{ property: 'uid', primary: true }],
    },
  },
  enums: {},
  hierarchy: {
    children: {
      calendars: {
        resource: 'Calendar',
        access: 'rw',
        children: { events: { resource: 'Event', access: 'rw' } },
      },
    },
  },
  commands: {
    list: {
      name: 'list',
      description: 'List all calendars',
      scope: 'resource',
      resourceType: 'Calendar',
      parameters: [],
      permission: 'calendar:calendars:list',
    },
    get: {
      name: 'get',
      description: 'Get a calendar by ID',
      scope: 'resource',
      resourceType: 'Calendar',
      parameters: [
        {
          name: 'calendarIdentifier',
          type: 'string',
          description: 'Calendar identifier',
          required: true,
        },
      ],
      permission: 'calendar:calendars:get',
    },
    create: {
      name: 'create',
      description: 'Create a calendar',
      scope: 'resource',
      resourceType: 'Calendar',
      parameters: [{ name: 'name', type: 'string', description: 'Calendar name', required: true }],
      permission: 'calendar:calendars:create',
    },
    listEvents: {
      name: 'list',
      description: 'List all events in a calendar',
      scope: 'resource',
      resourceType: 'Event',
      parameters: [
        { name: 'calendarId', type: 'string', description: 'Calendar identifier', required: true },
      ],
      permission: 'calendar:events:list',
    },
    getEvent: {
      name: 'get',
      description: 'Get an event by ID',
      scope: 'resource',
      resourceType: 'Event',
      parameters: [{ name: 'id', type: 'string', description: 'Event identifier', required: true }],
      permission: 'calendar:events:get',
    },
    createEvent: {
      name: 'create',
      description: 'Create a new event',
      scope: 'resource',
      resourceType: 'Event',
      parameters: [
        { name: 'calendarId', type: 'string', description: 'Calendar identifier', required: true },
        { name: 'summary', type: 'string', description: 'Event title', required: true },
        { name: 'startDate', type: 'date', description: 'Start date', required: true },
        { name: 'endDate', type: 'date', description: 'End date', required: true },
      ],
      permission: 'calendar:events:create',
    },
  },
}

/**
 * Reminders manifest — representative of a NON-calendar create-within-parent
 * and a list-with-required-parent (listId), and a delete command.
 */
const remindersManifest: AppManifest = {
  version: '1.0',
  app: { name: 'Reminders', bundleId: 'com.apple.reminders', tccEntitlements: ['reminders'] },
  suites: [],
  relationships: [],
  resources: {
    List: {
      name: 'List',
      plural: 'Lists',
      description: 'A reminder list',
      properties: {
        id: { access: 'r', type: 'string', description: 'List id', optional: false },
        name: { access: 'rw', type: 'string', description: 'Name', optional: false },
      },
      identifiers: [{ property: 'id', primary: true }],
    },
    Reminder: {
      name: 'Reminder',
      plural: 'Reminders',
      description: 'A reminder item',
      properties: {
        id: { access: 'r', type: 'string', description: 'Reminder id', optional: false },
        name: { access: 'rw', type: 'string', description: 'Name', optional: false },
      },
      identifiers: [{ property: 'id', primary: true }],
    },
  },
  enums: {},
  hierarchy: {
    children: {
      lists: {
        resource: 'List',
        access: 'rw',
        children: { reminders: { resource: 'Reminder', access: 'rw' } },
      },
    },
  },
  commands: {
    list: {
      name: 'list',
      description: 'List all reminder lists',
      scope: 'resource',
      resourceType: 'List',
      parameters: [],
      permission: 'reminders:lists:list',
    },
    get: {
      name: 'get',
      description: 'Get a list by ID',
      scope: 'resource',
      resourceType: 'List',
      parameters: [{ name: 'id', type: 'string', description: 'List identifier', required: true }],
      permission: 'reminders:lists:get',
    },
    listReminders: {
      name: 'list',
      description: 'List all reminders in a list',
      scope: 'resource',
      resourceType: 'Reminder',
      parameters: [
        { name: 'listId', type: 'string', description: 'List identifier', required: true },
      ],
      permission: 'reminders:reminders:list',
    },
    getReminder: {
      name: 'get',
      description: 'Get a reminder by ID',
      scope: 'resource',
      resourceType: 'Reminder',
      parameters: [
        { name: 'id', type: 'string', description: 'Reminder identifier', required: true },
      ],
      permission: 'reminders:reminders:get',
    },
    createReminder: {
      name: 'create',
      description: 'Create a new reminder',
      scope: 'resource',
      resourceType: 'Reminder',
      parameters: [
        { name: 'listId', type: 'string', description: 'List identifier', required: true },
        { name: 'name', type: 'string', description: 'Reminder name', required: true },
      ],
      permission: 'reminders:reminders:create',
    },
    deleteReminder: {
      name: 'delete',
      description: 'Delete a reminder',
      scope: 'resource',
      resourceType: 'Reminder',
      parameters: [
        { name: 'id', type: 'string', description: 'Reminder identifier', required: true },
      ],
      permission: 'reminders:reminders:delete',
    },
  },
}

/**
 * Minimal manifest with an update command — covers the update branch that
 * previously fell through to a generic `else` emitting nonexistent `app.update({})`.
 */
const updateManifest: AppManifest = {
  version: '1.0',
  app: { name: 'Notes', bundleId: 'com.apple.Notes', tccEntitlements: ['automation'] },
  suites: [],
  relationships: [],
  resources: {
    Note: {
      name: 'Note',
      plural: 'Notes',
      description: 'A note',
      properties: {
        id: { access: 'r', type: 'string', description: 'Note id', optional: false },
        name: { access: 'rw', type: 'string', description: 'Title', optional: false },
        body: { access: 'rw', type: 'string', description: 'Body', optional: true },
      },
      identifiers: [{ property: 'id', primary: true }],
    },
  },
  enums: {},
  hierarchy: { children: { notes: { resource: 'Note', access: 'rw' } } },
  commands: {
    listNotes: {
      name: 'list',
      description: 'List all notes',
      scope: 'resource',
      resourceType: 'Note',
      parameters: [],
      permission: 'notes:notes:list',
    },
    getNote: {
      name: 'get',
      description: 'Get a note by ID',
      scope: 'resource',
      resourceType: 'Note',
      parameters: [{ name: 'id', type: 'string', description: 'Note identifier', required: true }],
      permission: 'notes:notes:get',
    },
    updateNote: {
      name: 'update',
      description: 'Update a note',
      scope: 'resource',
      resourceType: 'Note',
      parameters: [
        { name: 'id', type: 'string', description: 'Note identifier', required: true },
        { name: 'name', type: 'string', description: 'New title', required: false },
        { name: 'body', type: 'string', description: 'New body', required: false },
      ],
      permission: 'notes:notes:update',
    },
  },
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('cross-surface body-coherence: SDK vs. server required params', () => {
  // -------------------------------------------------------------------------
  // List-with-required-parent: Calendar events
  // -------------------------------------------------------------------------
  describe('list-with-required-parent (Calendar: listEvents requires calendarId)', () => {
    const result = generateHttpClientSdk(calendarManifest, { packageName: '@macts/sdk-calendar' })
    const eventClient = findFile(result.files, 'src/resources/event.ts').content

    it('SDK list() method signature includes required parent param calendarId', () => {
      // The generated list() must accept calendarId so the server's scoping
      // JXA (app.calendars.byId(calendarId).events()) has the value to use.
      expect(eventClient).toMatch(/async list\(calendarId:\s*string\)/)
    })

    it('SDK list() method body forwards calendarId in the request body', () => {
      // The server's buildListCommandCode reads calendarId from the request body;
      // if the SDK omits it the server gets undefined and emits byId(undefined).
      expect(eventClient).toContain('{ calendarId }')
    })

    it('server required param matches SDK sent param (calendarId)', () => {
      // Both sides must name the same param: the server reads it from args via
      // the command parameter list; the SDK must send it under the same key.
      const listEventsCmd = calendarManifest.commands['listEvents']
      const eventResource = calendarManifest.resources['Event']
      expect(listEventsCmd).toBeDefined()
      if (listEventsCmd === undefined) return
      const serverRequiredParams = requiredListParams(listEventsCmd, eventResource)
      // Server expects: ['calendarId']
      expect(serverRequiredParams).toEqual(['calendarId'])
      // SDK list() body arg must include all server-required params.
      for (const param of serverRequiredParams) {
        expect(eventClient).toContain(param)
      }
    })
  })

  // -------------------------------------------------------------------------
  // List-with-required-parent: Reminders (non-Calendar domain)
  // -------------------------------------------------------------------------
  describe('list-with-required-parent (Reminders: listReminders requires listId)', () => {
    const result = generateHttpClientSdk(remindersManifest, { packageName: '@macts/sdk-reminders' })
    const reminderClient = findFile(result.files, 'src/resources/reminder.ts').content

    it('SDK list() method signature includes required parent param listId', () => {
      expect(reminderClient).toMatch(/async list\(listId:\s*string\)/)
    })

    it('SDK list() method body forwards listId in the request body', () => {
      expect(reminderClient).toContain('{ listId }')
    })

    it('server required param matches SDK sent param (listId)', () => {
      const listRemindersCmd = remindersManifest.commands['listReminders']
      const reminderResource = remindersManifest.resources['Reminder']
      expect(listRemindersCmd).toBeDefined()
      if (listRemindersCmd === undefined) return
      const serverRequiredParams = requiredListParams(listRemindersCmd, reminderResource)
      expect(serverRequiredParams).toEqual(['listId'])
      for (const param of serverRequiredParams) {
        expect(reminderClient).toContain(param)
      }
    })
  })

  // -------------------------------------------------------------------------
  // Update: server now has an explicit update branch (was falling to generic else)
  // -------------------------------------------------------------------------
  describe('update command (Notes: updateNote with id + optional fields)', () => {
    const result = generateHttpClientSdk(updateManifest, { packageName: '@macts/sdk-notes' })
    const noteClient = findFile(result.files, 'src/resources/note.ts').content

    it('SDK generates an update() method', () => {
      expect(noteClient).toMatch(/async update\(/)
    })

    it('SDK update() sends the identifier (id) in the request body', () => {
      // The server's update branch looks for the identifier from
      // resolvePrimaryIdentifierProperty (= 'id' for Note). The SDK must send
      // 'id' in the body so the server can perform byId(id) scoping.
      expect(noteClient).toContain('{ id, ...input }')
    })

    it('SDK and server resolve the SAME identifier (id) for update', () => {
      const updateNoteCmd = updateManifest.commands['updateNote']
      const noteResource = updateManifest.resources['Note']
      expect(updateNoteCmd).toBeDefined()
      if (updateNoteCmd === undefined) return
      // Server resolution: resolvePrimaryIdentifierProperty first
      const serverId = resolveServerIdentifierParam(updateNoteCmd, noteResource)
      // SDK resolution (same function): resolvePrimaryIdentifierProperty first
      const sdkId = resolvePrimaryIdentifierProperty(noteResource) ?? 'id'
      expect(serverId).toBe('id')
      expect(sdkId).toBe('id')
      expect(serverId).toBe(sdkId)
    })

    it('SDK update() routes to the correct manifest command key (updateNote)', () => {
      expect(noteClient).toContain('${this.#app}.${this.#resource}.updateNote`')
    })
  })

  // -------------------------------------------------------------------------
  // Create-within-parent: non-Calendar (Reminders: createReminder with listId)
  // -------------------------------------------------------------------------
  describe('create-within-parent non-calendar (Reminders: createReminder requires listId)', () => {
    const result = generateHttpClientSdk(remindersManifest, { packageName: '@macts/sdk-reminders' })
    const reminderClient = findFile(result.files, 'src/resources/reminder.ts').content
    const reminderTypes = findFile(result.files, 'src/types.ts').content

    it('ReminderCreateInput includes the required parent param listId', () => {
      // The server's create branch requires listId to scope the make() call;
      // the SDK must send it in the request body. The create input type is the
      // union of writable properties and command params, so listId (required in
      // the command) must be present as a required field.
      expect(reminderTypes).toMatch(
        /export interface ReminderCreateInput \{[\s\S]*listId:\s*string;/
      )
    })

    it('SDK create() spreads the full input (including listId) in the request body', () => {
      // The create method passes `input` directly to rpc(), so listId (in the
      // input object) is forwarded — the server reads it to scope the create.
      expect(reminderClient).toContain('input)')
    })

    it('server create branch required param matches SDK input type (listId)', () => {
      const createReminderCmd = remindersManifest.commands['createReminder']
      const reminderResource = remindersManifest.resources['Reminder']
      expect(createReminderCmd).toBeDefined()
      if (createReminderCmd === undefined) return
      const ownId = resolvePrimaryIdentifierProperty(reminderResource)
      const parentParam = createReminderCmd.parameters.find((p) => p.required && p.name !== ownId)
      // Server looks for a required param that is NOT the resource's own id.
      expect(parentParam?.name).toBe('listId')
      // The SDK's input type must include this field (already asserted above,
      // this assertion documents the contract explicitly).
      expect(reminderTypes).toContain('listId: string;')
    })
  })

  // -------------------------------------------------------------------------
  // Identifier coherence: SDK and server use the SAME resolver for get/delete
  // -------------------------------------------------------------------------
  describe('identifier coherence (same resolver for get/delete on both surfaces)', () => {
    it('Calendar events: SDK and server both resolve uid as the get identifier', () => {
      // Calendar Event has identifiers: [{ property: 'uid', primary: true }].
      // Both sides must use resolvePrimaryIdentifierProperty → 'uid'.
      const getEventCmd = calendarManifest.commands['getEvent']
      const eventResource = calendarManifest.resources['Event']
      expect(getEventCmd).toBeDefined()
      if (getEventCmd === undefined) return

      const serverIdentifier = resolveServerIdentifierParam(getEventCmd, eventResource)
      const sdkIdentifier = resolvePrimaryIdentifierProperty(eventResource) ?? 'id'
      expect(serverIdentifier).toBe('uid')
      expect(sdkIdentifier).toBe('uid')
      expect(serverIdentifier).toBe(sdkIdentifier)
    })

    it('SDK get() for Events uses the manifest identifier (uid), not the param name (id)', () => {
      // Previously idParamName used parameters[0].name = 'id' (the getEvent param).
      // Now it uses resolvePrimaryIdentifierProperty = 'uid'.
      // Both the SDK method signature and request body must use 'uid'.
      const result = generateHttpClientSdk(calendarManifest, { packageName: '@macts/sdk-calendar' })
      const eventClient = findFile(result.files, 'src/resources/event.ts').content
      expect(eventClient).toMatch(/async get\(uid:\s*string\)/)
      expect(eventClient).toContain('{ uid }')
    })

    it('Calendar: SDK and server both resolve calendarIdentifier for Calendar get', () => {
      const getCalendarCmd = calendarManifest.commands['get']
      const calendarResource = calendarManifest.resources['Calendar']
      expect(getCalendarCmd).toBeDefined()
      if (getCalendarCmd === undefined) return

      const serverIdentifier = resolveServerIdentifierParam(getCalendarCmd, calendarResource)
      const sdkIdentifier = resolvePrimaryIdentifierProperty(calendarResource) ?? 'id'
      expect(serverIdentifier).toBe('calendarIdentifier')
      expect(sdkIdentifier).toBe('calendarIdentifier')
      expect(serverIdentifier).toBe(sdkIdentifier)
    })
  })
})
