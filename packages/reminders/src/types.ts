/**
 * Type definitions for the SDK.
 * Auto-generated - do not edit.
 */

import { z } from 'zod'

/** Priority level for reminders */
export type ReminderPriority = '0' | '9' | '5' | '1'

/** An account in the Reminders application */
export interface Account {
  /** The name of the account */
  name: string
  /** The unique identifier of the account */
  id: string
}

/** Input for creating a Account */
export type AccountCreateInput = Record<string, never>

/** Input for updating a Account */
export type AccountUpdateInput = Partial<AccountCreateInput>

/** A list of reminders */
export interface List {
  /** The name of the list */
  name: string
  /** The unique identifier of the list */
  id: string
  /** The color of the list */
  color: { r: number; g: number; b: number }
  /** The emblem icon name of the list */
  emblem: string
}

/** Input for creating a List */
export interface ListCreateInput {
  /** The name of the list */
  name?: string
  /** The color of the list */
  color?: { r: number; g: number; b: number }
  /** The emblem icon name of the list */
  emblem?: string
}

/** Input for updating a List */
export type ListUpdateInput = Partial<ListCreateInput>

/** A reminder item */
export interface Reminder {
  /** The name of the reminder */
  name: string
  /** The unique identifier of the reminder */
  id: string
  /** The notes attached to the reminder */
  body: string
  /** Whether the reminder is completed */
  completed: boolean
  /** The completion date of the reminder */
  completionDate: Date
  /** The due date of the reminder */
  dueDate: Date
  /** The remind date of the reminder */
  remindMeDate: Date
  /** The priority of the reminder (0=none, 1=high, 5=medium, 9=low) */
  priority: number
  /** Whether the reminder is flagged */
  flagged: boolean
  /** The creation date of the reminder */
  creationDate: Date
  /** The modification date of the reminder */
  modificationDate: Date
  /** The all-day due date of the reminder */
  allDayDueDate: Date
}

/** Input for creating a Reminder */
export interface ReminderCreateInput {
  /** The name of the reminder */
  name?: string
  /** The notes attached to the reminder */
  body?: string
  /** Whether the reminder is completed */
  completed?: boolean
  /** The due date of the reminder */
  dueDate?: Date
  /** The remind date of the reminder */
  remindMeDate?: Date
  /** The priority of the reminder (0=none, 1=high, 5=medium, 9=low) */
  priority?: number
  /** Whether the reminder is flagged */
  flagged?: boolean
  /** The all-day due date of the reminder */
  allDayDueDate?: Date
}

/** Input for updating a Reminder */
export type ReminderUpdateInput = Partial<ReminderCreateInput>

// Zod schemas for runtime validation

export const AccountSchema = z.object({
  name: z.string(),
  id: z.string(),
})

export const ListSchema = z.object({
  name: z.string(),
  id: z.string(),
  color: z.object({ red: z.number(), green: z.number(), blue: z.number() }),
  emblem: z.string(),
})

export const ReminderSchema = z.object({
  name: z.string(),
  id: z.string(),
  body: z.string(),
  completed: z.boolean(),
  completionDate: z.string(),
  dueDate: z.string(),
  remindMeDate: z.string(),
  priority: z.number(),
  flagged: z.boolean(),
  creationDate: z.string(),
  modificationDate: z.string(),
  allDayDueDate: z.string(),
})
