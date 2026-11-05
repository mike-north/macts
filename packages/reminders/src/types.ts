/**
 * Type definitions for the SDK.
 * Auto-generated - do not edit.
 */

import { z } from 'zod'

export type { ReminderPriority } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Account } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type AccountCreateInput = import('./contract/index.js').AccountCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type AccountUpdateInput = import('./contract/index.js').AccountUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { List } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type ListCreateInput = import('./contract/index.js').ListCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type ListUpdateInput = import('./contract/index.js').ListUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Reminder } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type ReminderCreateInput = Omit<
  import('./contract/index.js').ReminderCreateInput,
  'priority'
> & {
  /** Priority (0=none, 1=high, 5=medium, 9=low) Numeric values are validated by the contract before dispatch. */
  priority?: number | Extract<import('./contract/index.js').ReminderCreateInput['priority'], null>
}

/** Canonical update input, retaining checked numeric conveniences. */
export type ReminderUpdateInput = Omit<
  import('./contract/index.js').ReminderUpdateInput,
  'priority'
> & {
  /** Priority (0=none, 1=high, 5=medium, 9=low) Numeric values are validated by the contract before dispatch. */
  priority?: number | Extract<import('./contract/index.js').ReminderUpdateInput['priority'], null>
}

// Raw/passthrough response validators retained for explicit raw RPC consumers. SDK records use the contract codecs.

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const AccountSchema = z.object({
  name: z.string(),
  id: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const ListSchema = z.object({
  name: z.string(),
  id: z.string(),
  color: z.string(),
  emblem: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
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
  alldayDueDate: z.string(),
})
