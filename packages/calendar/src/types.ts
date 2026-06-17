/**
 * Type definitions for the SDK.
 * Auto-generated - do not edit.
 */

import { z } from 'zod'

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
  /** Canonical identifier (mirrors `name`); populated by list, pass to get/delete and to write operations that reference this resource. */
  id?: string
  /** The calendar title */
  name: string
  /** The calendar title (synonym for name) */
  title: string
  /** The calendar color */
  color: { r: number; g: number; b: number }
  /** A unique calendar key */
  calendarIdentifier: string
  /** Whether the calendar can be modified */
  writable: boolean
  /** The calendar description */
  description: string
}

/** Input for creating a Calendar */
export interface CalendarCreateInput {
  /** Calendar name */
  name: string
  /** The calendar title (synonym for name) */
  title?: string
  /** Calendar color */
  color?: { r: number; g: number; b: number }
  /** The calendar description */
  description?: string
}

/** Input for updating a Calendar */
export type CalendarUpdateInput = Partial<CalendarCreateInput>

/** A calendar event */
export interface Event {
  /** Canonical identifier (mirrors `uid`); populated by list, pass to get/delete and to write operations that reference this resource. */
  id?: string
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
  sequence: number
  /** The event modification date */
  stampDate: Date
  /** The exception dates for recurring events */
  excludedDates: Date[]
  /** A unique event key */
  uid: string
  /** The URL associated with the event */
  url: string
}

/** Input for creating a Event */
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
  /** The iCalendar (RFC 2445) string describing the event recurrence, if defined */
  recurrence?: string
  /** The event status */
  status?: EventStatus
  /** The event modification date */
  stampDate?: Date
  /** The exception dates for recurring events */
  excludedDates?: Date[]
  /** The URL associated with the event */
  url?: string
  /** Calendar identifier for the event */
  calendarId: string
}

/** Input for updating a Event */
export type EventUpdateInput = Partial<EventCreateInput>

/** An event attendee */
export interface Attendee {
  /** The first and last name of the attendee */
  displayName: string
  /** Email address of the attendee */
  email: string
  /** The invitation status for the attendee */
  participationStatus: ParticipationStatus
}

/** Input for creating a Attendee */
export type AttendeeCreateInput = Record<string, never>

/** Input for updating a Attendee */
export type AttendeeUpdateInput = Partial<AttendeeCreateInput>

/** A message/display alarm */
export interface DisplayAlarm {
  /** The interval in minutes between the event and the alarm (positive for after, negative for before) */
  triggerInterval: number
  /** An absolute alarm date */
  triggerDate: Date
}

/** Input for creating a DisplayAlarm */
export interface DisplayAlarmCreateInput {
  /** The interval in minutes between the event and the alarm (positive for after, negative for before) */
  triggerInterval?: number
  /** An absolute alarm date */
  triggerDate?: Date
}

/** Input for updating a DisplayAlarm */
export type DisplayAlarmUpdateInput = Partial<DisplayAlarmCreateInput>

/** A mail/email alarm */
export interface MailAlarm {
  /** The interval in minutes between the event and the alarm (positive for after, negative for before) */
  triggerInterval: number
  /** An absolute alarm date */
  triggerDate: Date
}

/** Input for creating a MailAlarm */
export interface MailAlarmCreateInput {
  /** The interval in minutes between the event and the alarm (positive for after, negative for before) */
  triggerInterval?: number
  /** An absolute alarm date */
  triggerDate?: Date
}

/** Input for updating a MailAlarm */
export type MailAlarmUpdateInput = Partial<MailAlarmCreateInput>

/** A sound alarm */
export interface SoundAlarm {
  /** The interval in minutes between the event and the alarm (positive for after, negative for before) */
  triggerInterval: number
  /** An absolute alarm date */
  triggerDate: Date
  /** The system sound name to be used for the alarm */
  soundName: string
  /** The (POSIX) path to the sound file to be used for the alarm */
  soundFile: string
}

/** Input for creating a SoundAlarm */
export interface SoundAlarmCreateInput {
  /** The interval in minutes between the event and the alarm (positive for after, negative for before) */
  triggerInterval?: number
  /** An absolute alarm date */
  triggerDate?: Date
  /** The system sound name to be used for the alarm */
  soundName?: string
  /** The (POSIX) path to the sound file to be used for the alarm */
  soundFile?: string
}

/** Input for updating a SoundAlarm */
export type SoundAlarmUpdateInput = Partial<SoundAlarmCreateInput>

/** An 'open file' alarm */
export interface OpenFileAlarm {
  /** The interval in minutes between the event and the alarm (positive for after, negative for before) */
  triggerInterval: number
  /** An absolute alarm date */
  triggerDate: Date
  /** The (POSIX) path to be opened by the alarm */
  filepath: string
}

/** Input for creating a OpenFileAlarm */
export interface OpenFileAlarmCreateInput {
  /** The interval in minutes between the event and the alarm (positive for after, negative for before) */
  triggerInterval?: number
  /** An absolute alarm date */
  triggerDate?: Date
  /** The (POSIX) path to be opened by the alarm */
  filepath?: string
}

/** Input for updating a OpenFileAlarm */
export type OpenFileAlarmUpdateInput = Partial<OpenFileAlarmCreateInput>

// Zod schemas for runtime validation

export const CalendarSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  title: z.string(),
  color: z.object({ red: z.number(), green: z.number(), blue: z.number() }),
  calendarIdentifier: z.string(),
  writable: z.boolean(),
  description: z.string(),
})

export const EventSchema = z.object({
  id: z.string().optional(),
  summary: z.string(),
  description: z.string(),
  location: z.string(),
  startDate: z.string(),
  endDate: z.string(),
  alldayEvent: z.boolean(),
  recurrence: z.string(),
  status: z.string(),
  sequence: z.number(),
  stampDate: z.string(),
  excludedDates: z.array(z.string()),
  uid: z.string(),
  url: z.string(),
})

export const AttendeeSchema = z.object({
  displayName: z.string(),
  email: z.string(),
  participationStatus: z.string(),
})

export const DisplayAlarmSchema = z.object({
  triggerInterval: z.number(),
  triggerDate: z.string(),
})

export const MailAlarmSchema = z.object({
  triggerInterval: z.number(),
  triggerDate: z.string(),
})

export const SoundAlarmSchema = z.object({
  triggerInterval: z.number(),
  triggerDate: z.string(),
  soundName: z.string(),
  soundFile: z.string(),
})

export const OpenFileAlarmSchema = z.object({
  triggerInterval: z.number(),
  triggerDate: z.string(),
  filepath: z.string(),
})
