/**
 * The Calendar contract: the transport-neutral description of every
 * Calendar operation.
 *
 * It declares the types callers work with (records, create and update inputs,
 * enums, and the `CalendarClient` interface) and one descriptor per operation:
 * its identity, the permission it requires, and the value types of its input
 * and result. Its resource table tells references how to identify and resolve
 * the objects they point to.
 *
 * The contract performs no I/O. A client is created from it by a client
 * factory from `@macts/sdk`, local or remote, which supplies the runtime that
 * `bind` turns into a `CalendarClient`; application code changes locality by
 * changing the factory, not the contract.
 *
 * Generated from the Calendar manifest; do not edit.
 *
 * @packageDocumentation
 */

import {
  ValueTypes,
  type AppContract,
  type CallOptions,
  type ClientBrand,
  type ClientRuntime,
  type Integer,
  type OperationDescriptor,
  type Page,
  type ResourceDescriptor,
  type Rgb,
  type ValueType,
} from '@macts/contracts'

const t = ValueTypes

/** Status of an attendee's response to an invitation */
export type ParticipationStatus = 'unknown' | 'accepted' | 'declined' | 'tentative'

/** Status of a calendar event */
export type EventStatus = 'cancelled' | 'confirmed' | 'none' | 'tentative'

/** Priority level for calendar items */
export type CalendarPriority = '0' | '9' | '5' | '1'

/** Calendar view type */
export type ViewType = 'dayView' | 'weekView' | 'monthView'

/** A calendar containing events */
export interface Calendar {
  /**
   * The calendar title.
   * Never null: the primary identifier.
   */
  name: string
  /**
   * The calendar title (synonym for name).
   * Nullable. No evidence that the app always sets it.
   */
  title: string | null
  /**
   * The calendar color.
   * Nullable. No evidence that the app always sets it.
   */
  color: Rgb | null
  /**
   * Whether the calendar can be modified.
   * Nullable. No evidence that the app always sets it.
   */
  readonly writable: boolean | null
  /**
   * The calendar description.
   * Nullable. No evidence that the app always sets it.
   */
  description: string | null
}

/** A calendar event */
export interface Event {
  /**
   * The event summary/title.
   * Never null: observed in all 44 items (Calendar 27.0, macOS 27.2, 2026-11-01).
   */
  summary: string
  /**
   * The event notes.
   * Nullable. Observed missing in 31 of 44 items (Calendar 27.0, macOS 27.2, 2026-11-01).
   */
  description: string | null
  /**
   * The event location.
   * Nullable. Observed missing in 35 of 44 items (Calendar 27.0, macOS 27.2, 2026-11-01).
   */
  location: string | null
  /**
   * The event start date.
   * Never null: observed in all 44 items (Calendar 27.0, macOS 27.2, 2026-11-01).
   */
  startDate: Date
  /**
   * The event end date.
   * Never null: observed in all 44 items (Calendar 27.0, macOS 27.2, 2026-11-01).
   */
  endDate: Date
  /**
   * True if the event is an all-day event.
   * Never null: observed in all 44 items (Calendar 27.0, macOS 27.2, 2026-11-01).
   */
  alldayEvent: boolean
  /**
   * The iCalendar (RFC 2445) string describing the event recurrence, if defined.
   * Nullable. Observed missing in 27 of 44 items (Calendar 27.0, macOS 27.2, 2026-11-01).
   */
  recurrence: string | null
  /**
   * The event status.
   * Never null: observed in all 44 items (Calendar 27.0, macOS 27.2, 2026-11-01).
   */
  status: EventStatus
  /**
   * The event version.
   * Never null: observed in all 44 items (Calendar 27.0, macOS 27.2, 2026-11-01).
   */
  readonly sequence: Integer
  /**
   * The event modification date.
   * Nullable. Observed missing in 4 of 44 items (Calendar 27.0, macOS 27.2, 2026-11-01).
   */
  stampDate: Date | null
  /**
   * The exception dates for recurring events.
   * Never null: observed in all 44 items (Calendar 27.0, macOS 27.2, 2026-11-01).
   */
  excludedDates: readonly Date[]
  /**
   * A unique event key.
   * Never null: the primary identifier.
   */
  readonly uid: string
  /**
   * The URL associated with the event.
   * Nullable. Observed missing in 32 of 44 items (Calendar 27.0, macOS 27.2, 2026-11-01).
   */
  url: string | null
}

/** An event attendee */
export interface Attendee {
  /**
   * The first and last name of the attendee.
   * Nullable. Observed missing in 32 of 41 items (Calendar 27.0, macOS 27.2, 2026-11-01).
   */
  readonly displayName: string | null
  /**
   * Email address of the attendee.
   * Never null: observed in all 41 items (Calendar 27.0, macOS 27.2, 2026-11-01).
   */
  readonly email: string
  /**
   * The invitation status for the attendee.
   * Never null: observed in all 41 items (Calendar 27.0, macOS 27.2, 2026-11-01).
   */
  readonly participationStatus: ParticipationStatus
}

/** A message/display alarm */
export interface DisplayAlarm {
  /**
   * The interval in minutes between the event and the alarm (positive for after, negative for
   * before).
   * Nullable: An alarm has either a trigger interval (relative to the event start) or an absolute
   * trigger date. The 52 sampled alarms were all relative; an absolute alarm has no interval
   * (Calendar 27.0).
   */
  triggerInterval: Integer | null
  /**
   * An absolute alarm date.
   * Nullable. Observed missing in 40 of 40 items (Calendar 27.0, macOS 27.2, 2026-11-01).
   */
  triggerDate: Date | null
}

/** A mail/email alarm */
export interface MailAlarm {
  /**
   * The interval in minutes between the event and the alarm (positive for after, negative for
   * before).
   * Nullable. No evidence that the app always sets it.
   */
  triggerInterval: Integer | null
  /**
   * An absolute alarm date.
   * Nullable. No evidence that the app always sets it.
   */
  triggerDate: Date | null
}

/** A sound alarm */
export interface SoundAlarm {
  /**
   * The interval in minutes between the event and the alarm (positive for after, negative for
   * before).
   * Nullable. No evidence that the app always sets it.
   */
  triggerInterval: Integer | null
  /**
   * An absolute alarm date.
   * Nullable. Observed missing in 9 of 9 items (Calendar 27.0, macOS 27.2, 2026-11-01).
   */
  triggerDate: Date | null
  /**
   * The system sound name to be used for the alarm.
   * Nullable. No evidence that the app always sets it.
   */
  soundName: string | null
  /**
   * The (POSIX) path to the sound file to be used for the alarm.
   * Nullable. No evidence that the app always sets it.
   */
  soundFile: string | null
}

/** An 'open file' alarm */
export interface OpenFileAlarm {
  /**
   * The interval in minutes between the event and the alarm (positive for after, negative for
   * before).
   * Nullable. No evidence that the app always sets it.
   */
  triggerInterval: Integer | null
  /**
   * An absolute alarm date.
   * Nullable. No evidence that the app always sets it.
   */
  triggerDate: Date | null
  /**
   * The (POSIX) path to be opened by the alarm.
   * Nullable. No evidence that the app always sets it.
   */
  filepath: string | null
}

/** Input for creating a Calendar. */
export interface CalendarCreateInput {
  /** Calendar name */
  name: string
  /** The calendar title (synonym for name) */
  title?: string
  /** Calendar color */
  color?: Rgb
  /** The calendar description */
  description?: string
}

/** Input for updating a Calendar. Omitted fields are left unchanged. */
export interface CalendarUpdateInput {
  /**
   * Calendar name.
   * Cannot be reset: null is rejected.
   */
  name?: string
  /**
   * The calendar title (synonym for name).
   * Cannot be reset: null is rejected.
   */
  title?: string
  /**
   * Calendar color.
   * Cannot be reset: null is rejected.
   */
  color?: Rgb
  /**
   * The calendar description.
   * Cannot be reset: null is rejected.
   */
  description?: string
}

/** Input for creating an Event. */
export interface EventCreateInput {
  /** Event title */
  summary: string
  /** Event notes */
  description?: string
  /** Event location */
  location?: string
  /** Event start date */
  startDate: Date
  /** Event end date */
  endDate: Date
  /** Whether this is an all-day event */
  alldayEvent?: boolean
  /** The iCalendar (RFC 2445) recurrence string */
  recurrence?: string
  /** Event status */
  status?: EventStatus
  /** Event modification date */
  stampDate?: Date
  /** Exception dates for recurring events */
  excludedDates?: readonly Date[]
  /** URL associated with the event */
  url?: string
  /** Calendar identifier for the event */
  calendarId: string
}

/** Input for updating an Event. Omitted fields are left unchanged. */
export interface EventUpdateInput {
  /**
   * Event title.
   * Cannot be reset: null is rejected.
   */
  summary?: string
  /**
   * Event notes.
   * Cannot be reset: null is rejected.
   */
  description?: string
  /**
   * Event location.
   * Cannot be reset: null is rejected.
   */
  location?: string
  /**
   * Event start date.
   * Cannot be reset: null is rejected.
   */
  startDate?: Date
  /**
   * Event end date.
   * Cannot be reset: null is rejected.
   */
  endDate?: Date
  /**
   * Whether this is an all-day event.
   * Cannot be reset: null is rejected.
   */
  alldayEvent?: boolean
  /**
   * The iCalendar (RFC 2445) recurrence string.
   * Cannot be reset: null is rejected.
   */
  recurrence?: string
  /**
   * Event status.
   * Cannot be reset: null is rejected.
   */
  status?: EventStatus
  /**
   * Event modification date.
   * Cannot be reset: null is rejected.
   */
  stampDate?: Date
  /**
   * Exception dates for recurring events.
   * Cannot be reset: null is rejected.
   */
  excludedDates?: readonly Date[]
  /**
   * URL associated with the event.
   * Cannot be reset: null is rejected.
   */
  url?: string
}

/** Input for creating an Attendee. */
export type AttendeeCreateInput = Record<string, never>

/** Input for updating an Attendee. Omitted fields are left unchanged. */
export type AttendeeUpdateInput = Record<string, never>

/** Input for creating a DisplayAlarm. */
export interface DisplayAlarmCreateInput {
  /**
   * The interval in minutes between the event and the alarm (positive for after, negative for
   * before)
   */
  triggerInterval?: Integer
  /** An absolute alarm date */
  triggerDate?: Date
}

/** Input for updating a DisplayAlarm. Omitted fields are left unchanged. */
export interface DisplayAlarmUpdateInput {
  /**
   * The interval in minutes between the event and the alarm (positive for after, negative for
   * before).
   * Cannot be reset: null is rejected.
   */
  triggerInterval?: Integer
  /**
   * An absolute alarm date.
   * Cannot be reset: null is rejected.
   */
  triggerDate?: Date
}

/** Input for creating a MailAlarm. */
export interface MailAlarmCreateInput {
  /**
   * The interval in minutes between the event and the alarm (positive for after, negative for
   * before)
   */
  triggerInterval?: Integer
  /** An absolute alarm date */
  triggerDate?: Date
}

/** Input for updating a MailAlarm. Omitted fields are left unchanged. */
export interface MailAlarmUpdateInput {
  /**
   * The interval in minutes between the event and the alarm (positive for after, negative for
   * before).
   * Cannot be reset: null is rejected.
   */
  triggerInterval?: Integer
  /**
   * An absolute alarm date.
   * Cannot be reset: null is rejected.
   */
  triggerDate?: Date
}

/** Input for creating a SoundAlarm. */
export interface SoundAlarmCreateInput {
  /**
   * The interval in minutes between the event and the alarm (positive for after, negative for
   * before)
   */
  triggerInterval?: Integer
  /** An absolute alarm date */
  triggerDate?: Date
  /** The system sound name to be used for the alarm */
  soundName?: string
  /** The (POSIX) path to the sound file to be used for the alarm */
  soundFile?: string
}

/** Input for updating a SoundAlarm. Omitted fields are left unchanged. */
export interface SoundAlarmUpdateInput {
  /**
   * The interval in minutes between the event and the alarm (positive for after, negative for
   * before).
   * Cannot be reset: null is rejected.
   */
  triggerInterval?: Integer
  /**
   * An absolute alarm date.
   * Cannot be reset: null is rejected.
   */
  triggerDate?: Date
  /**
   * The system sound name to be used for the alarm.
   * Cannot be reset: null is rejected.
   */
  soundName?: string
  /**
   * The (POSIX) path to the sound file to be used for the alarm.
   * Cannot be reset: null is rejected.
   */
  soundFile?: string
}

/** Input for creating an OpenFileAlarm. */
export interface OpenFileAlarmCreateInput {
  /**
   * The interval in minutes between the event and the alarm (positive for after, negative for
   * before)
   */
  triggerInterval?: Integer
  /** An absolute alarm date */
  triggerDate?: Date
  /** The (POSIX) path to be opened by the alarm */
  filepath?: string
}

/** Input for updating an OpenFileAlarm. Omitted fields are left unchanged. */
export interface OpenFileAlarmUpdateInput {
  /**
   * The interval in minutes between the event and the alarm (positive for after, negative for
   * before).
   * Cannot be reset: null is rejected.
   */
  triggerInterval?: Integer
  /**
   * An absolute alarm date.
   * Cannot be reset: null is rejected.
   */
  triggerDate?: Date
  /**
   * The (POSIX) path to be opened by the alarm.
   * Cannot be reset: null is rejected.
   */
  filepath?: string
}

/** A calendar containing events */
export interface CalendarResourceClient {
  /** List calendars, as one page holding all of them. */
  list(options?: CallOptions): Promise<Page<Calendar>>
  /**
   * Read the calendar identified by `id`.
   *
   * @param id - Calendar identifier. Does not accept null.
   */
  get(id: string, options?: CallOptions): Promise<Calendar>
  /** Create a calendar. */
  create(input: CalendarCreateInput, options?: CallOptions): Promise<Calendar>
}

/** A calendar event */
export interface EventResourceClient {
  /**
   * List events, as one page holding all of them.
   *
   * @param calendarId - Calendar identifier. Does not accept null.
   */
  list(calendarId: string, options?: CallOptions): Promise<Page<Event>>
  /**
   * Read the event identified by `id` within `calendarId`.
   *
   * @param calendarId - Calendar identifier (the calendar containing the event). Does not accept
   * null.
   * @param id - Event identifier (uid). Does not accept null.
   */
  get(calendarId: string, id: string, options?: CallOptions): Promise<Event>
  /** Create an event. */
  create(input: EventCreateInput, options?: CallOptions): Promise<Event>
  /**
   * Update the event identified by `id` within `calendarId`. Omitted fields are left unchanged.
   *
   * @param calendarId - Calendar identifier (the calendar containing the event). Does not accept
   * null.
   * @param id - Event identifier (uid). Does not accept null.
   */
  update(
    calendarId: string,
    id: string,
    input: EventUpdateInput,
    options?: CallOptions
  ): Promise<Event>
  /**
   * Delete the event identified by `id` within `calendarId`.
   *
   * @param calendarId - Calendar identifier (the calendar containing the event). Does not accept
   * null.
   * @param id - Event identifier (uid). Does not accept null.
   */
  delete(calendarId: string, id: string, options?: CallOptions): Promise<void>
  /** Show the event or to-do in the calendar window */
  show(options?: CallOptions): Promise<void>
}

/**
 * The Calendar client: one namespace per resource that has operations, plus the app's own commands.
 * A client factory creates one from {@link calendarContract}. Its type carries the contract's
 * resource table, {@link CalendarResources}, so references can be bound to it by resource; the
 * brand has no runtime member.
 */
export interface CalendarClient extends ClientBrand<CalendarResources> {
  /** A calendar containing events */
  readonly calendars: CalendarResourceClient
  /** A calendar event */
  readonly events: EventResourceClient
  /** Tell the application to reload all calendar files contents */
  reloadCalendars(options?: CallOptions): Promise<void>
  /**
   * Show calendar on the given view
   *
   * @param to - The calendar view to be displayed. Does not accept null.
   */
  switchView(to: ViewType, options?: CallOptions): Promise<void>
  /**
   * Show calendar on the given date
   *
   * @param at - The date to be displayed. Does not accept null.
   */
  viewCalendar(at: Date, options?: CallOptions): Promise<void>
}

/** The members of {@link EventStatus}, for its value type. */
const eventStatusMembers = ['cancelled', 'confirmed', 'none', 'tentative'] as const

/** The members of {@link ViewType}, for its value type. */
const viewTypeMembers = ['dayView', 'weekView', 'monthView'] as const

const calendarRecordType: ValueType<Calendar> = t.record(
  {
    name: t.string({ description: 'The calendar title' }),
    title: t.nullable(t.string(), { description: 'The calendar title (synonym for name)' }),
    color: t.nullable(t.rgb(), { description: 'The calendar color' }),
    writable: t.nullable(t.boolean(), { description: 'Whether the calendar can be modified' }),
    description: t.nullable(t.string(), { description: 'The calendar description' }),
  },
  { description: 'A calendar containing events' }
)

const eventRecordType: ValueType<Event> = t.record(
  {
    summary: t.string({ description: 'The event summary/title' }),
    description: t.nullable(t.string(), { description: 'The event notes' }),
    location: t.nullable(t.string(), { description: 'The event location' }),
    startDate: t.date({ description: 'The event start date' }),
    endDate: t.date({ description: 'The event end date' }),
    alldayEvent: t.boolean({ description: 'True if the event is an all-day event' }),
    recurrence: t.nullable(t.string(), {
      description: 'The iCalendar (RFC 2445) string describing the event recurrence, if defined',
    }),
    status: t.enumeration(eventStatusMembers, { description: 'The event status' }),
    sequence: t.integer({ description: 'The event version' }),
    stampDate: t.nullable(t.date(), { description: 'The event modification date' }),
    excludedDates: t.array(t.date(), { description: 'The exception dates for recurring events' }),
    uid: t.string({ description: 'A unique event key' }),
    url: t.nullable(t.string(), { description: 'The URL associated with the event' }),
  },
  { description: 'A calendar event' }
)

const calendarCreateInputType: ValueType<CalendarCreateInput> = t.record({
  name: t.string({ description: 'Calendar name' }),
  title: t.optional(t.string({ description: 'The calendar title (synonym for name)' })),
  color: t.optional(t.rgb({ description: 'Calendar color' })),
  description: t.optional(t.string({ description: 'The calendar description' })),
})

const eventCreateInputType: ValueType<EventCreateInput> = t.record({
  summary: t.string({ description: 'Event title' }),
  description: t.optional(t.string({ description: 'Event notes' })),
  location: t.optional(t.string({ description: 'Event location' })),
  startDate: t.date({ description: 'Event start date' }),
  endDate: t.date({ description: 'Event end date' }),
  alldayEvent: t.optional(t.boolean({ description: 'Whether this is an all-day event' })),
  recurrence: t.optional(t.string({ description: 'The iCalendar (RFC 2445) recurrence string' })),
  status: t.optional(t.enumeration(eventStatusMembers, { description: 'Event status' })),
  stampDate: t.optional(t.date({ description: 'Event modification date' })),
  excludedDates: t.optional(
    t.array(t.date(), { description: 'Exception dates for recurring events' })
  ),
  url: t.optional(t.string({ description: 'URL associated with the event' })),
  calendarId: t.string({ description: 'Calendar identifier for the event' }),
})

/**
 * The type of the resource table of {@link calendarContract}: every resource a
 * reference can name, keyed by manifest resource key, with its record type,
 * its identifier type (when it has one), the operations that resolve
 * references to it, and, for each of those operations that finds the
 * resource only within another resource, that parent. A client created from
 * the contract carries it, so `bindReference` admits only references the
 * contract can resolve.
 */
export type CalendarResources = Readonly<{
  Calendar: ResourceDescriptor<Calendar, string> & {
    readonly id: ValueType<string>
    readonly get: 'calendar.calendars.get'
    readonly list: 'calendar.calendars.list'
  }
  Event: ResourceDescriptor<Event, string> & {
    readonly id: ValueType<string>
    readonly get: 'calendar.events.get'
    readonly list: 'calendar.events.list'
    readonly parents: { readonly get: 'Calendar'; readonly list: 'Calendar' }
  }
}>

/**
 * The resource table: the implementation of {@link CalendarResources}, which
 * declares it, so the two are one table. It lists each resource that records
 * a `get` or a `list`. A resource with neither is left out, because no
 * reference to it can be resolved at any position or in any form (phases/13
 * D7, "Resolvable targets"). This table is also the registry that reference
 * value types read, lazily.
 */
const resources = {
  Calendar: {
    name: 'Calendar',
    record: calendarRecordType,
    id: t.string({ description: 'The calendar title' }),
    get: 'calendar.calendars.get',
    list: 'calendar.calendars.list',
  },
  Event: {
    name: 'Event',
    record: eventRecordType,
    id: t.string({ description: 'A unique event key' }),
    get: 'calendar.events.get',
    list: 'calendar.events.list',
    parents: { get: 'Calendar', list: 'Calendar' },
  },
} satisfies CalendarResources

const calendarListOperation: OperationDescriptor<Record<string, never>, Page<Calendar>> = {
  id: 'calendar.calendars.list',
  permission: 'calendar:calendars:list',
  target: { command: 'list', resource: 'Calendar' },
  description: 'List all calendars',
  input: t.record({}),
  output: t.page(calendarRecordType),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const calendarGetOperation: OperationDescriptor<{ readonly id: string }, Calendar> = {
  id: 'calendar.calendars.get',
  permission: 'calendar:calendars:get',
  target: { command: 'get', resource: 'Calendar' },
  description: 'Get a calendar by ID',
  input: t.record({
    id: t.string({ description: 'Calendar identifier' }),
  }),
  output: calendarRecordType,
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: { id: { type: 'string', description: 'Calendar identifier' } },
    required: ['id'],
    additionalProperties: false,
  },
}

const calendarCreateOperation: OperationDescriptor<CalendarCreateInput, Calendar> = {
  id: 'calendar.calendars.create',
  permission: 'calendar:calendars:create',
  target: { command: 'create', resource: 'Calendar' },
  description: 'Create a new calendar',
  input: calendarCreateInputType,
  output: calendarRecordType,
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Calendar name' },
      title: { type: 'string', description: 'The calendar title (synonym for name)' },
      color: {
        type: 'object',
        properties: {
          r: {
            type: 'object',
            properties: { integer: { type: 'string', pattern: '^(0|-?[1-9][0-9]*)$' } },
            required: ['integer'],
            additionalProperties: false,
          },
          g: {
            type: 'object',
            properties: { integer: { type: 'string', pattern: '^(0|-?[1-9][0-9]*)$' } },
            required: ['integer'],
            additionalProperties: false,
          },
          b: {
            type: 'object',
            properties: { integer: { type: 'string', pattern: '^(0|-?[1-9][0-9]*)$' } },
            required: ['integer'],
            additionalProperties: false,
          },
        },
        required: ['r', 'g', 'b'],
        additionalProperties: false,
        description: 'Calendar color',
      },
      description: { type: 'string', description: 'The calendar description' },
    },
    required: ['name'],
    additionalProperties: false,
  },
}

const eventListEventsOperation: OperationDescriptor<
  { readonly calendarId: string },
  Page<Event>
> = {
  id: 'calendar.events.list',
  permission: 'calendar:events:list',
  target: { command: 'listEvents', resource: 'Event' },
  description: 'List all events in a calendar',
  input: t.record({
    calendarId: t.string({ description: 'Calendar identifier' }),
  }),
  output: t.page(eventRecordType),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: { calendarId: { type: 'string', description: 'Calendar identifier' } },
    required: ['calendarId'],
    additionalProperties: false,
  },
}

const eventGetEventOperation: OperationDescriptor<
  { readonly calendarId: string; readonly id: string },
  Event
> = {
  id: 'calendar.events.get',
  permission: 'calendar:events:get',
  target: { command: 'getEvent', resource: 'Event' },
  description: 'Get an event by ID',
  input: t.record({
    calendarId: t.string({
      description: 'Calendar identifier (the calendar containing the event)',
    }),
    id: t.string({ description: 'Event identifier (uid)' }),
  }),
  output: eventRecordType,
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      calendarId: {
        type: 'string',
        description: 'Calendar identifier (the calendar containing the event)',
      },
      id: { type: 'string', description: 'Event identifier (uid)' },
    },
    required: ['calendarId', 'id'],
    additionalProperties: false,
  },
}

const eventCreateEventOperation: OperationDescriptor<EventCreateInput, Event> = {
  id: 'calendar.events.create',
  permission: 'calendar:events:create',
  target: { command: 'createEvent', resource: 'Event' },
  description: 'Create a new event',
  input: eventCreateInputType,
  output: eventRecordType,
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      summary: { type: 'string', description: 'Event title' },
      description: { type: 'string', description: 'Event notes' },
      location: { type: 'string', description: 'Event location' },
      startDate: {
        type: 'object',
        properties: {
          date: {
            type: 'string',
            pattern: '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}(Z|[+-]\\d{2}:\\d{2})$',
          },
        },
        required: ['date'],
        additionalProperties: false,
        description: 'Event start date',
      },
      endDate: {
        type: 'object',
        properties: {
          date: {
            type: 'string',
            pattern: '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}(Z|[+-]\\d{2}:\\d{2})$',
          },
        },
        required: ['date'],
        additionalProperties: false,
        description: 'Event end date',
      },
      alldayEvent: { type: 'boolean', description: 'Whether this is an all-day event' },
      recurrence: { type: 'string', description: 'The iCalendar (RFC 2445) recurrence string' },
      status: {
        type: 'string',
        enum: ['cancelled', 'confirmed', 'none', 'tentative'],
        description: 'Event status',
      },
      stampDate: {
        type: 'object',
        properties: {
          date: {
            type: 'string',
            pattern: '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}(Z|[+-]\\d{2}:\\d{2})$',
          },
        },
        required: ['date'],
        additionalProperties: false,
        description: 'Event modification date',
      },
      excludedDates: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            date: {
              type: 'string',
              pattern: '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}(Z|[+-]\\d{2}:\\d{2})$',
            },
          },
          required: ['date'],
          additionalProperties: false,
        },
        description: 'Exception dates for recurring events',
      },
      url: { type: 'string', description: 'URL associated with the event' },
      calendarId: { type: 'string', description: 'Calendar identifier for the event' },
    },
    required: ['summary', 'startDate', 'endDate', 'calendarId'],
    additionalProperties: false,
  },
}

const eventUpdateEventOperation: OperationDescriptor<
  {
    readonly calendarId: string
    readonly id: string
    readonly summary?: string | undefined
    readonly description?: string | undefined
    readonly location?: string | undefined
    readonly startDate?: Date | undefined
    readonly endDate?: Date | undefined
    readonly alldayEvent?: boolean | undefined
    readonly recurrence?: string | undefined
    readonly status?: EventStatus | undefined
    readonly stampDate?: Date | undefined
    readonly excludedDates?: readonly Date[] | undefined
    readonly url?: string | undefined
  },
  Event
> = {
  id: 'calendar.events.update',
  permission: 'calendar:events:update',
  target: { command: 'updateEvent', resource: 'Event' },
  description: 'Update an existing event',
  input: t.record({
    calendarId: t.string({
      description: 'Calendar identifier (the calendar containing the event)',
    }),
    id: t.string({ description: 'Event identifier (uid)' }),
    summary: t.optional(t.string({ description: 'Event title' })),
    description: t.optional(t.string({ description: 'Event notes' })),
    location: t.optional(t.string({ description: 'Event location' })),
    startDate: t.optional(t.date({ description: 'Event start date' })),
    endDate: t.optional(t.date({ description: 'Event end date' })),
    alldayEvent: t.optional(t.boolean({ description: 'Whether this is an all-day event' })),
    recurrence: t.optional(t.string({ description: 'The iCalendar (RFC 2445) recurrence string' })),
    status: t.optional(t.enumeration(eventStatusMembers, { description: 'Event status' })),
    stampDate: t.optional(t.date({ description: 'Event modification date' })),
    excludedDates: t.optional(
      t.array(t.date(), { description: 'Exception dates for recurring events' })
    ),
    url: t.optional(t.string({ description: 'URL associated with the event' })),
  }),
  output: eventRecordType,
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      calendarId: {
        type: 'string',
        description: 'Calendar identifier (the calendar containing the event)',
      },
      id: { type: 'string', description: 'Event identifier (uid)' },
      summary: { type: 'string', description: 'Event title' },
      description: { type: 'string', description: 'Event notes' },
      location: { type: 'string', description: 'Event location' },
      startDate: {
        type: 'object',
        properties: {
          date: {
            type: 'string',
            pattern: '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}(Z|[+-]\\d{2}:\\d{2})$',
          },
        },
        required: ['date'],
        additionalProperties: false,
        description: 'Event start date',
      },
      endDate: {
        type: 'object',
        properties: {
          date: {
            type: 'string',
            pattern: '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}(Z|[+-]\\d{2}:\\d{2})$',
          },
        },
        required: ['date'],
        additionalProperties: false,
        description: 'Event end date',
      },
      alldayEvent: { type: 'boolean', description: 'Whether this is an all-day event' },
      recurrence: { type: 'string', description: 'The iCalendar (RFC 2445) recurrence string' },
      status: {
        type: 'string',
        enum: ['cancelled', 'confirmed', 'none', 'tentative'],
        description: 'Event status',
      },
      stampDate: {
        type: 'object',
        properties: {
          date: {
            type: 'string',
            pattern: '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}(Z|[+-]\\d{2}:\\d{2})$',
          },
        },
        required: ['date'],
        additionalProperties: false,
        description: 'Event modification date',
      },
      excludedDates: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            date: {
              type: 'string',
              pattern: '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}(Z|[+-]\\d{2}:\\d{2})$',
            },
          },
          required: ['date'],
          additionalProperties: false,
        },
        description: 'Exception dates for recurring events',
      },
      url: { type: 'string', description: 'URL associated with the event' },
    },
    required: ['calendarId', 'id'],
    additionalProperties: false,
  },
}

const eventDeleteEventOperation: OperationDescriptor<
  { readonly calendarId: string; readonly id: string },
  undefined
> = {
  id: 'calendar.events.delete',
  permission: 'calendar:events:delete',
  target: { command: 'deleteEvent', resource: 'Event' },
  description: 'Delete an event by ID',
  input: t.record({
    calendarId: t.string({
      description: 'Calendar identifier (the calendar containing the event)',
    }),
    id: t.string({ description: 'Event identifier (uid)' }),
  }),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      calendarId: {
        type: 'string',
        description: 'Calendar identifier (the calendar containing the event)',
      },
      id: { type: 'string', description: 'Event identifier (uid)' },
    },
    required: ['calendarId', 'id'],
    additionalProperties: false,
  },
}

const appReloadCalendarsOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'calendar.app.reloadCalendars',
  permission: 'calendar:calendars:reload',
  target: { command: 'reloadCalendars' },
  description: 'Tell the application to reload all calendar files contents',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const appSwitchViewOperation: OperationDescriptor<{ readonly to: ViewType }, undefined> = {
  id: 'calendar.app.switchView',
  permission: 'calendar:app:switchView',
  target: { command: 'switchView' },
  description: 'Show calendar on the given view',
  input: t.record({
    to: t.enumeration(viewTypeMembers, { description: 'The calendar view to be displayed' }),
  }),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      to: {
        type: 'string',
        enum: ['dayView', 'weekView', 'monthView'],
        description: 'The calendar view to be displayed',
      },
    },
    required: ['to'],
    additionalProperties: false,
  },
}

const appViewCalendarOperation: OperationDescriptor<{ readonly at: Date }, undefined> = {
  id: 'calendar.app.viewCalendar',
  permission: 'calendar:app:viewCalendar',
  target: { command: 'viewCalendar' },
  description: 'Show calendar on the given date',
  input: t.record({
    at: t.date({ description: 'The date to be displayed' }),
  }),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      at: {
        type: 'object',
        properties: {
          date: {
            type: 'string',
            pattern: '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}(Z|[+-]\\d{2}:\\d{2})$',
          },
        },
        required: ['date'],
        additionalProperties: false,
        description: 'The date to be displayed',
      },
    },
    required: ['at'],
    additionalProperties: false,
  },
}

const eventShowOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'calendar.events.show',
  permission: 'calendar:events:show',
  target: { command: 'show', resource: 'Event' },
  description: 'Show the event or to-do in the calendar window',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

/** Every operation, keyed by its identity. */
const operations: AppContract<CalendarClient>['operations'] = {
  'calendar.calendars.list': calendarListOperation,
  'calendar.calendars.get': calendarGetOperation,
  'calendar.calendars.create': calendarCreateOperation,
  'calendar.events.list': eventListEventsOperation,
  'calendar.events.get': eventGetEventOperation,
  'calendar.events.create': eventCreateEventOperation,
  'calendar.events.update': eventUpdateEventOperation,
  'calendar.events.delete': eventDeleteEventOperation,
  'calendar.app.reloadCalendars': appReloadCalendarsOperation,
  'calendar.app.switchView': appSwitchViewOperation,
  'calendar.app.viewCalendar': appViewCalendarOperation,
  'calendar.events.show': eventShowOperation,
}

/** Build the client on top of a factory-supplied runtime. */
function bind(runtime: ClientRuntime): CalendarClient {
  return {
    calendars: {
      list: (options) => runtime.invoke(calendarListOperation, {}, options),
      get: (id, options) => runtime.invoke(calendarGetOperation, { id }, options),
      create: (input, options) => runtime.invoke(calendarCreateOperation, input, options),
    },
    events: {
      list: (calendarId, options) =>
        runtime.invoke(eventListEventsOperation, { calendarId }, options),
      get: (calendarId, id, options) =>
        runtime.invoke(eventGetEventOperation, { calendarId, id }, options),
      create: (input, options) => runtime.invoke(eventCreateEventOperation, input, options),
      update: (calendarId, id, input, options) =>
        runtime.invoke(eventUpdateEventOperation, { ...input, calendarId, id }, options),
      delete: (calendarId, id, options) =>
        runtime.invoke(eventDeleteEventOperation, { calendarId, id }, options),
      show: (options) => runtime.invoke(eventShowOperation, {}, options),
    },
    reloadCalendars: (options) => runtime.invoke(appReloadCalendarsOperation, {}, options),
    switchView: (to, options) => runtime.invoke(appSwitchViewOperation, { to }, options),
    viewCalendar: (at, options) => runtime.invoke(appViewCalendarOperation, { at }, options),
  }
}

/**
 * The Calendar contract. Pass it to a client factory to obtain a
 * {@link CalendarClient}.
 */
export const calendarContract: AppContract<CalendarClient, CalendarResources> = {
  app: 'calendar',
  operations,
  resources,
  loadManifest: async () => (await import('./manifest.js')).manifest,
  bind,
}
