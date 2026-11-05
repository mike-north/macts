/**
 * Type definitions for the SDK.
 * Auto-generated - do not edit.
 */

import { z } from 'zod'

export type { ProjectStatus } from './contract/index.js'

export type { IntervalUnit } from './contract/index.js'

export type { RepetitionMethod } from './contract/index.js'

export type { RepetitionSchedule } from './contract/index.js'

export type { RepetitionBasedOn } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Task } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type TaskCreateInput = Omit<
  import('./contract/index.js').TaskCreateInput,
  'estimatedMinutes'
> & {
  /** The estimated time, in whole minutes, that this task will take to finish Numeric values are validated by the contract before dispatch. */
  estimatedMinutes?: null extends import('./contract/index.js').TaskCreateInput['estimatedMinutes']
    ? number | null
    : number
}

/** Canonical update input, retaining checked numeric conveniences. */
export type TaskUpdateInput = Omit<
  import('./contract/index.js').TaskUpdateInput,
  'estimatedMinutes'
> & {
  /** The estimated time, in whole minutes, that this task will take to finish Numeric values are validated by the contract before dispatch. */
  estimatedMinutes?: null extends import('./contract/index.js').TaskUpdateInput['estimatedMinutes']
    ? number | null
    : number
}

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Project } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type ProjectCreateInput = Omit<
  import('./contract/index.js').ProjectCreateInput,
  'estimatedMinutes'
> & {
  /** The estimated time, in whole minutes, that this project will take to finish Numeric values are validated by the contract before dispatch. */
  estimatedMinutes?: null extends import('./contract/index.js').ProjectCreateInput['estimatedMinutes']
    ? number | null
    : number
}

/** Canonical update input, retaining checked numeric conveniences. */
export type ProjectUpdateInput = Omit<
  import('./contract/index.js').ProjectUpdateInput,
  'estimatedMinutes'
> & {
  /** The estimated time, in whole minutes, that this project will take to finish Numeric values are validated by the contract before dispatch. */
  estimatedMinutes?: null extends import('./contract/index.js').ProjectUpdateInput['estimatedMinutes']
    ? number | null
    : number
}

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Folder } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { FolderCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { FolderUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Tag } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { TagCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { TagUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { InboxTask } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { InboxTaskCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { InboxTaskUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Perspective } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { PerspectiveCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { PerspectiveUpdateInput } from './contract/index.js'

// Raw/passthrough response validators retained for explicit raw RPC consumers. SDK records use the contract codecs.

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const TaskSchema = z.object({
  id: z.string(),
  name: z.string(),
  note: z.string(),
  flagged: z.boolean(),
  completed: z.boolean(),
  deferDate: z.string(),
  plannedDate: z.string(),
  dueDate: z.string(),
  completionDate: z.string(),
  droppedDate: z.string(),
  creationDate: z.string(),
  modificationDate: z.string(),
  estimatedMinutes: z.number(),
  sequential: z.boolean(),
  completedByChildren: z.boolean(),
  inInbox: z.boolean(),
  next: z.boolean(),
  blocked: z.boolean(),
  effectiveDeferDate: z.string(),
  effectivePlannedDate: z.string(),
  effectiveDueDate: z.string(),
  effectivelyCompleted: z.boolean(),
  effectivelyDropped: z.boolean(),
  dropped: z.boolean(),
  numberOfTasks: z.number(),
  numberOfAvailableTasks: z.number(),
  numberOfCompletedTasks: z.number(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  note: z.string(),
  status: z.string(),
  effectiveStatus: z.string(),
  flagged: z.boolean(),
  completed: z.boolean(),
  deferDate: z.string(),
  plannedDate: z.string(),
  dueDate: z.string(),
  completionDate: z.string(),
  droppedDate: z.string(),
  creationDate: z.string(),
  modificationDate: z.string(),
  lastReviewDate: z.string(),
  nextReviewDate: z.string(),
  estimatedMinutes: z.number(),
  sequential: z.boolean(),
  completedByChildren: z.boolean(),
  singletonActionHolder: z.boolean(),
  defaultSingletonActionHolder: z.boolean(),
  blocked: z.boolean(),
  effectiveDeferDate: z.string(),
  effectivePlannedDate: z.string(),
  effectiveDueDate: z.string(),
  effectivelyCompleted: z.boolean(),
  effectivelyDropped: z.boolean(),
  dropped: z.boolean(),
  numberOfTasks: z.number(),
  numberOfAvailableTasks: z.number(),
  numberOfCompletedTasks: z.number(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const FolderSchema = z.object({
  id: z.string(),
  name: z.string(),
  note: z.string(),
  hidden: z.boolean(),
  effectivelyHidden: z.boolean(),
  creationDate: z.string(),
  modificationDate: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const TagSchema = z.object({
  id: z.string(),
  name: z.string(),
  note: z.string(),
  allowsNextAction: z.boolean(),
  hidden: z.boolean(),
  effectivelyHidden: z.boolean(),
  availableTaskCount: z.number(),
  remainingTaskCount: z.number(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const InboxTaskSchema = z.object({
  id: z.string(),
  name: z.string(),
  note: z.string(),
  flagged: z.boolean(),
  deferDate: z.string(),
  dueDate: z.string(),
  creationDate: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const PerspectiveSchema = z.object({
  id: z.string(),
  name: z.string(),
})
