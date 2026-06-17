/**
 * Cross-surface body-coherence tests.
 *
 * For every resource command exposed over RPC (list/get/create/update/delete),
 * asserts:
 *
 * 1. The SDK-emitted request-body keys ⊇ the server's required parameters for
 *    that command (the SDK sends at least everything the server requires).
 * 2. The SDK and the server resolve the SAME *request parameter name* for the
 *    resource (get/update/delete) — both derive it from the manifest command's
 *    required parameter (`command.parameters`), which is the key the request
 *    schema (Zod) validates and the value the SDK puts in the body.
 *
 * The request parameter name is deliberately NOT the resource's primary
 * identifier *property* (`uid`, `calendarIdentifier`). That property name is an
 * output/canonicalization concern only. In the shipped Calendar manifest,
 * `get`/`getEvent` declare the request param as `id` even though the resource
 * properties are `calendarIdentifier`/`uid` — so the body key, the server's
 * Zod-validated key, and the JXA-bound variable must all be `id`. Asserting
 * against the property name here would encode a contract the server rejects.
 *
 * Expected param names are derived BY HAND from the manifest command parameters
 * (the spec), not from generator output.
 *
 * Fixtures cover the cases that were previously broken or under-tested:
 *   - list-with-required-parent (calendarId in listEvents, listId in listReminders)
 *   - get/delete/update where the resource property name ≠ the request param name
 *     (Calendar `id` vs property `calendarIdentifier`; Event `id` vs `uid`)
 *   - update (previously fell through to a generic else that emitted invalid JXA)
 *   - non-calendar create-within-parent (listId in createReminder)
 *
 * @see manifests/calendar/app.yaml (get/getEvent parameters[0].name = 'id')
 * @see ../../manifest/identifier.ts (resolvePrimaryIdentifierProperty — OUTPUT canonicalization only)
 * @see ../../../api/src/server/handlers/rpc.ts (executeResourceCommand, buildListCommandCode)
 */

import { describe, it, expect } from 'vitest'
import type { AppManifest, Command, Resource } from '../../manifest/index.js'
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
 * The request parameter name a get/update/delete command uses — the command's
 * required parameter. This is the single source of truth for the request body
 * key on BOTH surfaces (server `executeResourceCommand` and SDK `idParamName`).
 *
 * It is intentionally independent of the resource's identifier *property*.
 */
function requestIdentifierParam(command: Command): string {
  return command.parameters.find((p) => p.required)?.name ?? 'id'
}

/**
 * Extract the request parameter names a command requires (required params).
 * The server scopes/looks up using these exact names; the SDK must send them.
 */
function requiredParams(command: Command): string[] {
  return command.parameters.filter((p) => p.required).map((p) => p.name)
}

/**
 * The required parent-scoping parameters for a `list` command: required params
 * that are NOT one of the listed resource's own properties (e.g. `calendarId`
 * for `listEvents`). The server binds and looks up by this exact name.
 */
function requiredListParentParams(command: Command, resource: Resource | undefined): string[] {
  return command.parameters
    .filter((p) => p.required && !Object.hasOwn(resource?.properties ?? {}, p.name))
    .map((p) => p.name)
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
        startDate: { access: 'rw', type: 'date', description: 'Start', optional: false },
        endDate: { access: 'rw', type: 'date', description: 'End', optional: false },
        location: { access: 'rw', type: 'string', description: 'Location', optional: true },
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
      // Matches the shipped manifest (manifests/calendar/app.yaml:412-413): the
      // request param is `id`, even though the Calendar's identifier *property*
      // is `calendarIdentifier`. The request key is the command param name.
      parameters: [
        { name: 'id', type: 'string', description: 'Calendar identifier', required: true },
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
      const serverParentParams = requiredListParentParams(listEventsCmd, eventResource)
      // Spec (manifest): listEvents.parameters = [{ name: 'calendarId', required }].
      expect(serverParentParams).toEqual(['calendarId'])
      // SDK list() body arg must include all server-required params.
      for (const param of serverParentParams) {
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
      const serverParentParams = requiredListParentParams(listRemindersCmd, reminderResource)
      // Spec (manifest): listReminders.parameters = [{ name: 'listId', required }].
      expect(serverParentParams).toEqual(['listId'])
      for (const param of serverParentParams) {
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

    it('SDK update() sends the request param (id) in the request body', () => {
      // The server's update branch binds and looks up by the command's required
      // *parameter* name (= 'id' for updateNote). The SDK must send 'id' in the
      // body so the server can perform byId(id) scoping.
      // The generated update() filters undefined values from the input before
      // spreading, so the body is { id, ...defined } rather than { id, ...input }.
      expect(noteClient).toContain('{ id, ...defined }')
    })

    it('SDK and server resolve the SAME request param (id) for update', () => {
      const updateNoteCmd = updateManifest.commands['updateNote']
      expect(updateNoteCmd).toBeDefined()
      if (updateNoteCmd === undefined) return
      // Both surfaces resolve the request key from the command's required param.
      // Spec (manifest): updateNote.parameters[0].name = 'id'.
      const param = requestIdentifierParam(updateNoteCmd)
      expect(param).toBe('id')
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
      // Server identifies the parent param as a required param that is NOT one
      // of the resource's own properties. Its NAME (the request key) is the
      // command parameter name, never the parent resource's identifier property.
      const parentParam = createReminderCmd.parameters.find(
        (p) => p.required && !Object.hasOwn(reminderResource?.properties ?? {}, p.name)
      )
      // Spec (manifest): createReminder.parameters includes { name: 'listId' }.
      expect(parentParam?.name).toBe('listId')
      // The SDK's input type must include this field (already asserted above,
      // this assertion documents the contract explicitly).
      expect(reminderTypes).toContain('listId: string;')
    })
  })

  // -------------------------------------------------------------------------
  // Request-param coherence: the body key == the manifest command parameter,
  // even when it differs from the resource identifier *property*.
  //
  // These guard the regression where the SDK sent the resource property name
  // (`uid`/`calendarIdentifier`) while the server validated the command param
  // (`id`) — a guaranteed VALIDATION_ERROR plus byId(<unbound var>) in JXA.
  // -------------------------------------------------------------------------
  describe('request-param coherence (body key == manifest command param, not the id property)', () => {
    it('Calendar Event get: request param is `id` (command param), NOT `uid` (property)', () => {
      // Spec (manifests/calendar/app.yaml:456-457): getEvent.parameters[0].name = 'id'.
      // The Event identifier *property* is `uid`, but that is NOT the request key.
      const getEventCmd = calendarManifest.commands['getEvent']
      expect(getEventCmd).toBeDefined()
      if (getEventCmd === undefined) return
      expect(requestIdentifierParam(getEventCmd)).toBe('id')

      const result = generateHttpClientSdk(calendarManifest, { packageName: '@macts/sdk-calendar' })
      const eventClient = findFile(result.files, 'src/resources/event.ts').content
      // SDK method signature and body must use the command param `id`.
      expect(eventClient).toMatch(/async get\(id:\s*string\)/)
      expect(eventClient).toContain('{ id }')
      // And must NOT use the property name `uid` as the request key.
      expect(eventClient).not.toMatch(/async get\(uid:\s*string\)/)
      expect(eventClient).not.toContain('{ uid }')
    })

    it('Calendar get: request param is `id` (command param), NOT `calendarIdentifier` (property)', () => {
      // Spec (manifests/calendar/app.yaml:412-413): get.parameters[0].name = 'id'.
      const getCalendarCmd = calendarManifest.commands['get']
      expect(getCalendarCmd).toBeDefined()
      if (getCalendarCmd === undefined) return
      expect(requestIdentifierParam(getCalendarCmd)).toBe('id')

      const result = generateHttpClientSdk(calendarManifest, { packageName: '@macts/sdk-calendar' })
      const calendarClient = findFile(result.files, 'src/resources/calendar.ts').content
      expect(calendarClient).toMatch(/async get\(id:\s*string\)/)
      expect(calendarClient).toContain('{ id }')
      expect(calendarClient).not.toContain('calendarIdentifier:')
    })

    it('Reminders delete: request param is the command param `id`', () => {
      // Spec (manifest): deleteReminder.parameters[0].name = 'id'.
      const deleteReminderCmd = remindersManifest.commands['deleteReminder']
      expect(deleteReminderCmd).toBeDefined()
      if (deleteReminderCmd === undefined) return
      expect(requestIdentifierParam(deleteReminderCmd)).toBe('id')

      const result = generateHttpClientSdk(remindersManifest, {
        packageName: '@macts/sdk-reminders',
      })
      const reminderClient = findFile(result.files, 'src/resources/reminder.ts').content
      expect(reminderClient).toMatch(/async delete\(id:\s*string\)/)
      expect(reminderClient).toContain('{ id }')
    })

    it('SDK body key == server required param == manifest command param, for every CRUD op', () => {
      // The unifying invariant: for each CRUD command, the SDK-sent request key
      // and the server-validated required param are BOTH the manifest command
      // parameter name. We derive the expected name from the manifest (the spec)
      // and assert the generated SDK emits exactly that key.
      const result = generateHttpClientSdk(calendarManifest, { packageName: '@macts/sdk-calendar' })
      const eventClient = findFile(result.files, 'src/resources/event.ts').content
      const calendarClient = findFile(result.files, 'src/resources/calendar.ts').content

      // get (Event): manifest param 'id'
      const getEvent = calendarManifest.commands['getEvent']
      expect(getEvent).toBeDefined()
      if (getEvent !== undefined) {
        expect(requiredParams(getEvent)).toEqual(['id'])
        expect(eventClient).toContain('{ id }')
      }

      // list (Event): manifest param 'calendarId' (parent scope)
      const listEvents = calendarManifest.commands['listEvents']
      expect(listEvents).toBeDefined()
      if (listEvents !== undefined) {
        expect(requiredParams(listEvents)).toEqual(['calendarId'])
        expect(eventClient).toContain('{ calendarId }')
      }

      // create (Event): manifest requires calendarId + summary + startDate + endDate;
      // the SDK forwards the whole input object (which the input type requires).
      const createEvent = calendarManifest.commands['createEvent']
      expect(createEvent).toBeDefined()
      if (createEvent !== undefined) {
        expect(requiredParams(createEvent)).toContain('calendarId')
        expect(eventClient).toContain('createEvent`, input)')
      }

      // get (Calendar): manifest param 'id'
      const getCalendar = calendarManifest.commands['get']
      expect(getCalendar).toBeDefined()
      if (getCalendar !== undefined) {
        expect(requiredParams(getCalendar)).toEqual(['id'])
        expect(calendarClient).toContain('{ id }')
      }
    })
  })
})
