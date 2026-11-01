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
  type ClientRuntime,
  type Integer,
  type OperationDescriptor,
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
  /** The calendar title */
  name: string
  /** The calendar title (synonym for name) */
  title: string
  /** The calendar color */
  color: Rgb
  /** A unique calendar key */
  readonly calendarIdentifier: string
  /** Whether the calendar can be modified */
  readonly writable: boolean
  /** The calendar description */
  description: string
}

/** A calendar event */
export interface Event {
  /** The event summary/title */
  summary: string
  /** The event notes */
  description: string
  /** The event location */
  location: string
  /** The event start date */
  startDate: Date
  /** The event end date */
  endDate: Date
  /** True if the event is an all-day event */
  alldayEvent: boolean
  /** The iCalendar (RFC 2445) string describing the event recurrence, if defined */
  recurrence: string
  /** The event status */
  status: EventStatus
  /** The event version */
  readonly sequence: Integer
  /** The event modification date */
  stampDate: Date
  /** The exception dates for recurring events */
  excludedDates: readonly Date[]
  /** A unique event key */
  readonly uid: string
  /** The URL associated with the event */
  url: string
}

/** An event attendee */
export interface Attendee {
  /** The first and last name of the attendee */
  readonly displayName: string
  /** Email address of the attendee */
  readonly email: string
  /** The invitation status for the attendee */
  readonly participationStatus: ParticipationStatus
}

/** A message/display alarm */
export interface DisplayAlarm {
  /**
   * The interval in minutes between the event and the alarm (positive for after, negative for
   * before)
   */
  triggerInterval: Integer
  /** An absolute alarm date */
  triggerDate: Date
}

/** A mail/email alarm */
export interface MailAlarm {
  /**
   * The interval in minutes between the event and the alarm (positive for after, negative for
   * before)
   */
  triggerInterval: Integer
  /** An absolute alarm date */
  triggerDate: Date
}

/** A sound alarm */
export interface SoundAlarm {
  /**
   * The interval in minutes between the event and the alarm (positive for after, negative for
   * before)
   */
  triggerInterval: Integer
  /** An absolute alarm date */
  triggerDate: Date
  /** The system sound name to be used for the alarm */
  soundName: string
  /** The (POSIX) path to the sound file to be used for the alarm */
  soundFile: string
}

/** An 'open file' alarm */
export interface OpenFileAlarm {
  /**
   * The interval in minutes between the event and the alarm (positive for after, negative for
   * before)
   */
  triggerInterval: Integer
  /** An absolute alarm date */
  triggerDate: Date
  /** The (POSIX) path to be opened by the alarm */
  filepath: string
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
  /** Calendar name */
  name?: string
  /** The calendar title (synonym for name) */
  title?: string
  /** Calendar color */
  color?: Rgb
  /** The calendar description */
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
  /** Event title */
  summary?: string
  /** Event notes */
  description?: string
  /** Event location */
  location?: string
  /** Event start date */
  startDate?: Date
  /** Event end date */
  endDate?: Date
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
   * before)
   */
  triggerInterval?: Integer
  /** An absolute alarm date */
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
   * before)
   */
  triggerInterval?: Integer
  /** An absolute alarm date */
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
   * before)
   */
  triggerInterval?: Integer
  /** An absolute alarm date */
  triggerDate?: Date
  /** The (POSIX) path to be opened by the alarm */
  filepath?: string
}

/** A calendar containing events */
export interface CalendarResourceClient {
  /** List calendars. */
  list(options?: CallOptions): Promise<readonly Calendar[]>
  /** Read the calendar identified by `id`. */
  get(id: string, options?: CallOptions): Promise<Calendar>
  /** Create a calendar. */
  create(input: CalendarCreateInput, options?: CallOptions): Promise<Calendar>
}

/** A calendar event */
export interface EventResourceClient {
  /** List events. */
  list(calendarId: string, options?: CallOptions): Promise<readonly Event[]>
  /** Read the event identified by `id` within `calendarId`. */
  get(calendarId: string, id: string, options?: CallOptions): Promise<Event>
  /** Create an event. */
  create(input: EventCreateInput, options?: CallOptions): Promise<Event>
  /** Update the event identified by `id` within `calendarId`. Omitted fields are left unchanged. */
  update(
    calendarId: string,
    id: string,
    input: EventUpdateInput,
    options?: CallOptions
  ): Promise<Event>
  /** Delete the event identified by `id` within `calendarId`. */
  delete(calendarId: string, id: string, options?: CallOptions): Promise<void>
  /** Show the event or to-do in the calendar window */
  show(options?: CallOptions): Promise<void>
}

/**
 * The Calendar client: one namespace per resource that has operations, plus the app's own commands.
 * A client factory creates one from {@link calendarContract}.
 */
export interface CalendarClient {
  /** A calendar containing events */
  readonly calendars: CalendarResourceClient
  /** A calendar event */
  readonly events: EventResourceClient
  /** Tell the application to reload all calendar files contents */
  reloadCalendars(options?: CallOptions): Promise<void>
  /** Show calendar on the given view */
  switchView(to: ViewType, options?: CallOptions): Promise<void>
  /** Show calendar on the given date */
  viewCalendar(at: Date, options?: CallOptions): Promise<void>
}

/** The members of {@link ParticipationStatus}, for its value type. */
const participationStatusMembers = ['unknown', 'accepted', 'declined', 'tentative'] as const

/** The members of {@link EventStatus}, for its value type. */
const eventStatusMembers = ['cancelled', 'confirmed', 'none', 'tentative'] as const

/** The members of {@link ViewType}, for its value type. */
const viewTypeMembers = ['dayView', 'weekView', 'monthView'] as const

const calendarRecordType: ValueType<Calendar> = t.record(
  {
    name: t.string({ description: 'The calendar title' }),
    title: t.string({ description: 'The calendar title (synonym for name)' }),
    color: t.rgb({ description: 'The calendar color' }),
    calendarIdentifier: t.string({ description: 'A unique calendar key' }),
    writable: t.boolean({ description: 'Whether the calendar can be modified' }),
    description: t.string({ description: 'The calendar description' }),
  },
  { description: 'A calendar containing events' }
)

const eventRecordType: ValueType<Event> = t.record(
  {
    summary: t.string({ description: 'The event summary/title' }),
    description: t.string({ description: 'The event notes' }),
    location: t.string({ description: 'The event location' }),
    startDate: t.date({ description: 'The event start date' }),
    endDate: t.date({ description: 'The event end date' }),
    alldayEvent: t.boolean({ description: 'True if the event is an all-day event' }),
    recurrence: t.string({
      description: 'The iCalendar (RFC 2445) string describing the event recurrence, if defined',
    }),
    status: t.enumeration(eventStatusMembers, { description: 'The event status' }),
    sequence: t.integer({ description: 'The event version' }),
    stampDate: t.date({ description: 'The event modification date' }),
    excludedDates: t.array(t.date(), { description: 'The exception dates for recurring events' }),
    uid: t.string({ description: 'A unique event key' }),
    url: t.string({ description: 'The URL associated with the event' }),
  },
  { description: 'A calendar event' }
)

const attendeeRecordType: ValueType<Attendee> = t.record(
  {
    displayName: t.string({ description: 'The first and last name of the attendee' }),
    email: t.string({ description: 'Email address of the attendee' }),
    participationStatus: t.enumeration(participationStatusMembers, {
      description: 'The invitation status for the attendee',
    }),
  },
  { description: 'An event attendee' }
)

const displayAlarmRecordType: ValueType<DisplayAlarm> = t.record(
  {
    triggerInterval: t.integer({
      description:
        'The interval in minutes between the event and the alarm (positive for after, negative for before)',
    }),
    triggerDate: t.date({ description: 'An absolute alarm date' }),
  },
  { description: 'A message/display alarm' }
)

const mailAlarmRecordType: ValueType<MailAlarm> = t.record(
  {
    triggerInterval: t.integer({
      description:
        'The interval in minutes between the event and the alarm (positive for after, negative for before)',
    }),
    triggerDate: t.date({ description: 'An absolute alarm date' }),
  },
  { description: 'A mail/email alarm' }
)

const soundAlarmRecordType: ValueType<SoundAlarm> = t.record(
  {
    triggerInterval: t.integer({
      description:
        'The interval in minutes between the event and the alarm (positive for after, negative for before)',
    }),
    triggerDate: t.date({ description: 'An absolute alarm date' }),
    soundName: t.string({ description: 'The system sound name to be used for the alarm' }),
    soundFile: t.string({
      description: 'The (POSIX) path to the sound file to be used for the alarm',
    }),
  },
  { description: 'A sound alarm' }
)

const openFileAlarmRecordType: ValueType<OpenFileAlarm> = t.record(
  {
    triggerInterval: t.integer({
      description:
        'The interval in minutes between the event and the alarm (positive for after, negative for before)',
    }),
    triggerDate: t.date({ description: 'An absolute alarm date' }),
    filepath: t.string({ description: 'The (POSIX) path to be opened by the alarm' }),
  },
  { description: "An 'open file' alarm" }
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
 * Every resource, keyed by manifest resource key: its record, its identifier
 * (when it has one), and the operations that resolve references to it. This
 * table is also the registry that reference value types read, lazily.
 */
const resources: AppContract<CalendarClient>['resources'] = {
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
    get: 'calendar.events.getEvent',
    list: 'calendar.events.listEvents',
  },
  Attendee: {
    name: 'Attendee',
    record: attendeeRecordType,
  },
  DisplayAlarm: {
    name: 'DisplayAlarm',
    record: displayAlarmRecordType,
  },
  MailAlarm: {
    name: 'MailAlarm',
    record: mailAlarmRecordType,
  },
  SoundAlarm: {
    name: 'SoundAlarm',
    record: soundAlarmRecordType,
  },
  OpenFileAlarm: {
    name: 'OpenFileAlarm',
    record: openFileAlarmRecordType,
  },
}

const calendarListOperation: OperationDescriptor<Record<string, never>, readonly Calendar[]> = {
  id: 'calendar.calendars.list',
  permission: 'calendar:calendars:list',
  target: { command: 'list', resource: 'Calendar' },
  description: 'List all calendars',
  input: t.record({}),
  output: t.array(calendarRecordType),
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
}

const calendarCreateOperation: OperationDescriptor<CalendarCreateInput, Calendar> = {
  id: 'calendar.calendars.create',
  permission: 'calendar:calendars:create',
  target: { command: 'create', resource: 'Calendar' },
  description: 'Create a new calendar',
  input: calendarCreateInputType,
  output: calendarRecordType,
}

const eventListEventsOperation: OperationDescriptor<
  { readonly calendarId: string },
  readonly Event[]
> = {
  id: 'calendar.events.listEvents',
  permission: 'calendar:events:list',
  target: { command: 'listEvents', resource: 'Event' },
  description: 'List all events in a calendar',
  input: t.record({
    calendarId: t.string({ description: 'Calendar identifier' }),
  }),
  output: t.array(eventRecordType),
}

const eventGetEventOperation: OperationDescriptor<
  { readonly calendarId: string; readonly id: string },
  Event
> = {
  id: 'calendar.events.getEvent',
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
}

const eventCreateEventOperation: OperationDescriptor<EventCreateInput, Event> = {
  id: 'calendar.events.createEvent',
  permission: 'calendar:events:create',
  target: { command: 'createEvent', resource: 'Event' },
  description: 'Create a new event',
  input: eventCreateInputType,
  output: eventRecordType,
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
  id: 'calendar.events.updateEvent',
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
}

const eventDeleteEventOperation: OperationDescriptor<
  { readonly calendarId: string; readonly id: string },
  undefined
> = {
  id: 'calendar.events.deleteEvent',
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
}

const appReloadCalendarsOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'calendar.app.reloadCalendars',
  permission: 'calendar:calendars:reload',
  target: { command: 'reloadCalendars' },
  description: 'Tell the application to reload all calendar files contents',
  input: t.record({}),
  output: t.none(),
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
}

const eventShowOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'calendar.events.show',
  permission: 'calendar:events:show',
  target: { command: 'show', resource: 'Event' },
  description: 'Show the event or to-do in the calendar window',
  input: t.record({}),
  output: t.none(),
}

/** Every operation, keyed by its identity. */
const operations: AppContract<CalendarClient>['operations'] = {
  'calendar.calendars.list': calendarListOperation,
  'calendar.calendars.get': calendarGetOperation,
  'calendar.calendars.create': calendarCreateOperation,
  'calendar.events.listEvents': eventListEventsOperation,
  'calendar.events.getEvent': eventGetEventOperation,
  'calendar.events.createEvent': eventCreateEventOperation,
  'calendar.events.updateEvent': eventUpdateEventOperation,
  'calendar.events.deleteEvent': eventDeleteEventOperation,
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
export const calendarContract: AppContract<CalendarClient> = {
  app: 'calendar',
  operations,
  resources,
  loadManifest: async () => (await import('./manifest.js')).manifest,
  bind,
}
