/**
 * Machine-readable capability metadata for Calendar.
 *
 * Generated from the app manifest. Each entry describes one capability —
 * its stable name, app dependency, required permission (`app:resource:operation`),
 * and risk classification (read | write | delete | send | execute | system-change).
 *
 * @packageDocumentation
 */

/**
 * Risk classification for a capability.
 */
export type CapabilityRisk = 'read' | 'write' | 'delete' | 'send' | 'execute' | 'system-change'

/**
 * Machine-readable description of a single capability.
 */
export interface CapabilityMetadata {
  /** Stable dotted capability name (`<app>.<resource>.<operation>`). */
  readonly name: string
  /** App this capability belongs to. */
  readonly app: string
  /** Bundle identifier of the app dependency. */
  readonly appBundleId: string
  /** Resource the operation targets (`app` for app-scoped capabilities). */
  readonly resource: string
  /** Operation name. */
  readonly operation: string
  /** Human-readable description. */
  readonly description: string
  /** Required permission in `app:resource:operation` form, or null if none. */
  readonly permission: string | null
  /** Deterministic risk classification. */
  readonly risk: CapabilityRisk
  /** JSON Schema for the capability's input. */
  readonly inputSchema: Record<string, unknown>
}

/**
 * Every capability exposed by Calendar, with risk metadata.
 */
export const capabilities: readonly CapabilityMetadata[] = [
  {
    name: 'calendar.app.reloadCalendars',
    app: 'calendar',
    appBundleId: 'com.apple.iCal',
    resource: 'app',
    operation: 'reloadCalendars',
    description: 'Tell the application to reload all calendar files contents',
    permission: 'calendar:calendars:reload',
    risk: 'system-change',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'calendar.app.switchView',
    app: 'calendar',
    appBundleId: 'com.apple.iCal',
    resource: 'app',
    operation: 'switchView',
    description: 'Show calendar on the given view',
    permission: 'calendar:app:switchView',
    risk: 'system-change',
    inputSchema: {
      type: 'object',
      properties: {
        to: {
          description: 'The calendar view to be displayed',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['to'],
    },
  },
  {
    name: 'calendar.app.viewCalendar',
    app: 'calendar',
    appBundleId: 'com.apple.iCal',
    resource: 'app',
    operation: 'viewCalendar',
    description: 'Show calendar on the given date',
    permission: 'calendar:app:viewCalendar',
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {
        at: {
          description: 'The date to be displayed',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['at'],
    },
  },
  {
    name: 'calendar.calendars.create',
    app: 'calendar',
    appBundleId: 'com.apple.iCal',
    resource: 'calendars',
    operation: 'create',
    description: 'Create a new calendar',
    permission: 'calendar:calendars:create',
    risk: 'write',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          description: 'Calendar name',
          type: 'string',
        },
        color: {
          description: 'Calendar color',
          type: 'object',
        },
        title: {
          description: 'The calendar title (synonym for name)',
          type: 'string',
        },
        description: {
          description: 'The calendar description',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['name', 'title', 'description'],
    },
  },
  {
    name: 'calendar.calendars.get',
    app: 'calendar',
    appBundleId: 'com.apple.iCal',
    resource: 'calendars',
    operation: 'get',
    description: 'Get a calendar by ID',
    permission: 'calendar:calendars:get',
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          description: 'Calendar identifier',
          type: 'string',
        },
        name: {
          description: 'The calendar title',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['id'],
    },
  },
  {
    name: 'calendar.calendars.list',
    app: 'calendar',
    appBundleId: 'com.apple.iCal',
    resource: 'calendars',
    operation: 'list',
    description: 'List all calendars',
    permission: 'calendar:calendars:list',
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
  {
    name: 'calendar.events.create',
    app: 'calendar',
    appBundleId: 'com.apple.iCal',
    resource: 'events',
    operation: 'create',
    description: 'Create a new event',
    permission: 'calendar:events:create',
    risk: 'write',
    inputSchema: {
      type: 'object',
      properties: {
        calendarId: {
          description: 'Calendar identifier for the event',
          type: 'string',
        },
        summary: {
          description: 'Event title',
          type: 'string',
        },
        startDate: {
          description: 'Event start date',
          type: 'string',
        },
        endDate: {
          description: 'Event end date',
          type: 'string',
        },
        location: {
          description: 'Event location',
          type: 'string',
        },
        description: {
          description: 'Event notes',
          type: 'string',
        },
        alldayEvent: {
          description: 'Whether this is an all-day event',
          type: 'boolean',
        },
        recurrence: {
          description:
            'The iCalendar (RFC 2445) string describing the event recurrence, if defined',
          type: 'string',
        },
        status: {
          description: 'The event status',
          type: 'string',
        },
        stampDate: {
          description: 'The event modification date',
          type: 'string',
        },
        excludedDates: {
          description: 'The exception dates for recurring events',
          type: 'array',
          items: {
            type: 'string',
          },
        },
        url: {
          description: 'The URL associated with the event',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: [
        'calendarId',
        'summary',
        'startDate',
        'endDate',
        'recurrence',
        'status',
        'stampDate',
        'excludedDates',
        'url',
      ],
    },
  },
  {
    name: 'calendar.events.get',
    app: 'calendar',
    appBundleId: 'com.apple.iCal',
    resource: 'events',
    operation: 'get',
    description: 'Get an event by ID',
    permission: 'calendar:events:get',
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          description: 'Event identifier',
          type: 'string',
        },
        uid: {
          description: 'A unique event key',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['id'],
    },
  },
  {
    name: 'calendar.events.list',
    app: 'calendar',
    appBundleId: 'com.apple.iCal',
    resource: 'events',
    operation: 'list',
    description: 'List all events in a calendar',
    permission: 'calendar:events:list',
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {
        calendarId: {
          description: 'Calendar identifier',
          type: 'string',
        },
      },
      additionalProperties: false,
      required: ['calendarId'],
    },
  },
  {
    name: 'calendar.events.show',
    app: 'calendar',
    appBundleId: 'com.apple.iCal',
    resource: 'events',
    operation: 'show',
    description: 'Show the event or to-do in the calendar window',
    permission: 'calendar:events:show',
    risk: 'read',
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
  },
]
