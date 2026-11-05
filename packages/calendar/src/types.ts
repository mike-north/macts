/**
 * Type definitions for the SDK.
 * Auto-generated - do not edit.
 */

import { z } from 'zod'

export type { ParticipationStatus } from './contract/index.js'

export type { EventStatus } from './contract/index.js'

export type { CalendarPriority } from './contract/index.js'

export type { ViewType } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Calendar } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type CalendarCreateInput = import('./contract/index.js').CalendarCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type CalendarUpdateInput = import('./contract/index.js').CalendarUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Event } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type EventCreateInput = import('./contract/index.js').EventCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type EventUpdateInput = import('./contract/index.js').EventUpdateInput & {
  /** Redundant parent; the positional argument owns scope. */ calendarId?: string
}

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Attendee } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type AttendeeCreateInput = import('./contract/index.js').AttendeeCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type AttendeeUpdateInput = import('./contract/index.js').AttendeeUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { DisplayAlarm } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type DisplayAlarmCreateInput = Omit<
  import('./contract/index.js').DisplayAlarmCreateInput,
  'triggerInterval'
> & {
  /** The interval in minutes between the event and the alarm (positive for after, negative for before) Numeric values are validated by the contract before dispatch. */
  triggerInterval?:
    | number
    | Extract<import('./contract/index.js').DisplayAlarmCreateInput['triggerInterval'], null>
}

/** Canonical update input, retaining checked numeric conveniences. */
export type DisplayAlarmUpdateInput = Omit<
  import('./contract/index.js').DisplayAlarmUpdateInput,
  'triggerInterval'
> & {
  /** The interval in minutes between the event and the alarm (positive for after, negative for before) Numeric values are validated by the contract before dispatch. */
  triggerInterval?:
    | number
    | Extract<import('./contract/index.js').DisplayAlarmUpdateInput['triggerInterval'], null>
}

/** Canonical SDK record; typed operations decode through the app contract. */
export type { MailAlarm } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type MailAlarmCreateInput = Omit<
  import('./contract/index.js').MailAlarmCreateInput,
  'triggerInterval'
> & {
  /** The interval in minutes between the event and the alarm (positive for after, negative for before) Numeric values are validated by the contract before dispatch. */
  triggerInterval?:
    | number
    | Extract<import('./contract/index.js').MailAlarmCreateInput['triggerInterval'], null>
}

/** Canonical update input, retaining checked numeric conveniences. */
export type MailAlarmUpdateInput = Omit<
  import('./contract/index.js').MailAlarmUpdateInput,
  'triggerInterval'
> & {
  /** The interval in minutes between the event and the alarm (positive for after, negative for before) Numeric values are validated by the contract before dispatch. */
  triggerInterval?:
    | number
    | Extract<import('./contract/index.js').MailAlarmUpdateInput['triggerInterval'], null>
}

/** Canonical SDK record; typed operations decode through the app contract. */
export type { SoundAlarm } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type SoundAlarmCreateInput = Omit<
  import('./contract/index.js').SoundAlarmCreateInput,
  'triggerInterval'
> & {
  /** The interval in minutes between the event and the alarm (positive for after, negative for before) Numeric values are validated by the contract before dispatch. */
  triggerInterval?:
    | number
    | Extract<import('./contract/index.js').SoundAlarmCreateInput['triggerInterval'], null>
}

/** Canonical update input, retaining checked numeric conveniences. */
export type SoundAlarmUpdateInput = Omit<
  import('./contract/index.js').SoundAlarmUpdateInput,
  'triggerInterval'
> & {
  /** The interval in minutes between the event and the alarm (positive for after, negative for before) Numeric values are validated by the contract before dispatch. */
  triggerInterval?:
    | number
    | Extract<import('./contract/index.js').SoundAlarmUpdateInput['triggerInterval'], null>
}

/** Canonical SDK record; typed operations decode through the app contract. */
export type { OpenFileAlarm } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type OpenFileAlarmCreateInput = Omit<
  import('./contract/index.js').OpenFileAlarmCreateInput,
  'triggerInterval'
> & {
  /** The interval in minutes between the event and the alarm (positive for after, negative for before) Numeric values are validated by the contract before dispatch. */
  triggerInterval?:
    | number
    | Extract<import('./contract/index.js').OpenFileAlarmCreateInput['triggerInterval'], null>
}

/** Canonical update input, retaining checked numeric conveniences. */
export type OpenFileAlarmUpdateInput = Omit<
  import('./contract/index.js').OpenFileAlarmUpdateInput,
  'triggerInterval'
> & {
  /** The interval in minutes between the event and the alarm (positive for after, negative for before) Numeric values are validated by the contract before dispatch. */
  triggerInterval?:
    | number
    | Extract<import('./contract/index.js').OpenFileAlarmUpdateInput['triggerInterval'], null>
}

// Raw/passthrough response validators retained for explicit raw RPC consumers. SDK records use the contract codecs.

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const CalendarSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  title: z.string(),
  color: z.object({ red: z.number(), green: z.number(), blue: z.number() }),
  writable: z.boolean(),
  description: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
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

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const AttendeeSchema = z.object({
  displayName: z.string(),
  email: z.string(),
  participationStatus: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const DisplayAlarmSchema = z.object({
  triggerInterval: z.number(),
  triggerDate: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const MailAlarmSchema = z.object({
  triggerInterval: z.number(),
  triggerDate: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const SoundAlarmSchema = z.object({
  triggerInterval: z.number(),
  triggerDate: z.string(),
  soundName: z.string(),
  soundFile: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const OpenFileAlarmSchema = z.object({
  triggerInterval: z.number(),
  triggerDate: z.string(),
  filepath: z.string(),
})
