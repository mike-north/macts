/**
 * The OmniFocus contract: the transport-neutral description of every
 * OmniFocus operation.
 *
 * It declares the types callers work with (records, create and update inputs,
 * enums, and the `OmniFocusClient` interface) and one descriptor per operation:
 * its identity, the permission it requires, and the value types of its input
 * and result. Its resource table tells references how to identify and resolve
 * the objects they point to.
 *
 * The contract performs no I/O. A client is created from it by a client
 * factory from `@macts/sdk`, local or remote, which supplies the runtime that
 * `bind` turns into a `OmniFocusClient`; application code changes locality by
 * changing the factory, not the contract.
 *
 * Generated from the OmniFocus manifest; do not edit.
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
  type ValueType,
} from '@macts/contracts'

const t = ValueTypes

/** Status of a project */
export type ProjectStatus = 'active' | 'onHold' | 'done' | 'dropped'

/** Unit for time intervals */
export type IntervalUnit = 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year'

/** Method for task repetition */
export type RepetitionMethod = 'fixedRepetition' | 'startAfterCompletion' | 'dueAfterCompletion'

/** Schedule type for repetition */
export type RepetitionSchedule = 'regularly' | 'fromCompletion'

/** Which date property to base repetition on */
export type RepetitionBasedOn = 'basedOnDue' | 'basedOnPlanned' | 'basedOnDefer'

/** A task within OmniFocus */
export interface Task {
  /**
   * The unique identifier of the task.
   * Never null: the primary identifier.
   */
  readonly id: string
  /**
   * The name of the task.
   * Nullable. No evidence that the app always sets it.
   */
  name: string | null
  /**
   * The note of the task.
   * Nullable. No evidence that the app always sets it.
   */
  note: string | null
  /**
   * True if flagged.
   * Nullable. No evidence that the app always sets it.
   */
  flagged: boolean | null
  /**
   * True if the task is completed.
   * Nullable. No evidence that the app always sets it.
   */
  readonly completed: boolean | null
  /**
   * When the task should become available for action.
   * Nullable. No evidence that the app always sets it.
   */
  deferDate: Date | null
  /**
   * The date at which work for this task is intended.
   * Nullable. No evidence that the app always sets it.
   */
  plannedDate: Date | null
  /**
   * When the task must be finished.
   * Nullable. No evidence that the app always sets it.
   */
  dueDate: Date | null
  /**
   * The task's date of completion.
   * Nullable. No evidence that the app always sets it.
   */
  completionDate: Date | null
  /**
   * The date the task was dropped.
   * Nullable. No evidence that the app always sets it.
   */
  droppedDate: Date | null
  /**
   * When the task was created.
   * Nullable. No evidence that the app always sets it.
   */
  creationDate: Date | null
  /**
   * When the task was last modified.
   * Nullable. No evidence that the app always sets it.
   */
  readonly modificationDate: Date | null
  /**
   * The estimated time, in whole minutes, that this task will take to finish.
   * Nullable. No evidence that the app always sets it.
   */
  estimatedMinutes: Integer | null
  /**
   * If true, any children are sequentially dependent.
   * Nullable. No evidence that the app always sets it.
   */
  sequential: boolean | null
  /**
   * If true, complete when children are completed.
   * Nullable. No evidence that the app always sets it.
   */
  completedByChildren: boolean | null
  /**
   * Returns true if the task itself is an inbox task or if the task is contained by an inbox task.
   * Nullable. No evidence that the app always sets it.
   */
  readonly inInbox: boolean | null
  /**
   * If the task is the next task of its containing project, next is true.
   * Nullable. No evidence that the app always sets it.
   */
  readonly next: boolean | null
  /**
   * True if the task has a task that must be completed prior to it being actionable.
   * Nullable. No evidence that the app always sets it.
   */
  readonly blocked: boolean | null
  /**
   * When the task should become available for action (including inherited).
   * Nullable. No evidence that the app always sets it.
   */
  readonly effectiveDeferDate: Date | null
  /**
   * The date at which work for this task is intended (including inherited).
   * Nullable. No evidence that the app always sets it.
   */
  readonly effectivePlannedDate: Date | null
  /**
   * When the task must be finished (including inherited).
   * Nullable. No evidence that the app always sets it.
   */
  readonly effectiveDueDate: Date | null
  /**
   * True if the task is completed, or any of its containing tasks or project are completed.
   * Nullable. No evidence that the app always sets it.
   */
  readonly effectivelyCompleted: boolean | null
  /**
   * True if the task is dropped, or any of its containing tasks or project are dropped.
   * Nullable. No evidence that the app always sets it.
   */
  readonly effectivelyDropped: boolean | null
  /**
   * True if the task is dropped.
   * Nullable. No evidence that the app always sets it.
   */
  readonly dropped: boolean | null
  /**
   * The number of direct children of this task.
   * Nullable. No evidence that the app always sets it.
   */
  readonly numberOfTasks: Integer | null
  /**
   * The number of available direct children of this task.
   * Nullable. No evidence that the app always sets it.
   */
  readonly numberOfAvailableTasks: Integer | null
  /**
   * The number of completed direct children of this task.
   * Nullable. No evidence that the app always sets it.
   */
  readonly numberOfCompletedTasks: Integer | null
}

/** A project in OmniFocus */
export interface Project {
  /**
   * The unique identifier of the project.
   * Never null: the primary identifier.
   */
  readonly id: string
  /**
   * The name of the project.
   * Nullable. No evidence that the app always sets it.
   */
  name: string | null
  /**
   * The note of the project.
   * Nullable. No evidence that the app always sets it.
   */
  note: string | null
  /**
   * The status of the project.
   * Nullable. No evidence that the app always sets it.
   */
  status: ProjectStatus | null
  /**
   * The effective status of the project.
   * Nullable. No evidence that the app always sets it.
   */
  readonly effectiveStatus: ProjectStatus | null
  /**
   * True if flagged.
   * Nullable. No evidence that the app always sets it.
   */
  flagged: boolean | null
  /**
   * True if the project is completed.
   * Nullable. No evidence that the app always sets it.
   */
  readonly completed: boolean | null
  /**
   * When the project should become available for action.
   * Nullable. No evidence that the app always sets it.
   */
  deferDate: Date | null
  /**
   * The date at which work for this project is intended.
   * Nullable. No evidence that the app always sets it.
   */
  plannedDate: Date | null
  /**
   * When the project must be finished.
   * Nullable. No evidence that the app always sets it.
   */
  dueDate: Date | null
  /**
   * The project's date of completion.
   * Nullable. No evidence that the app always sets it.
   */
  completionDate: Date | null
  /**
   * The date the project was dropped.
   * Nullable. No evidence that the app always sets it.
   */
  droppedDate: Date | null
  /**
   * When the project was created.
   * Nullable. No evidence that the app always sets it.
   */
  creationDate: Date | null
  /**
   * When the project was last modified.
   * Nullable. No evidence that the app always sets it.
   */
  readonly modificationDate: Date | null
  /**
   * When the project was last reviewed.
   * Nullable. No evidence that the app always sets it.
   */
  lastReviewDate: Date | null
  /**
   * When the project should next be reviewed.
   * Nullable. No evidence that the app always sets it.
   */
  nextReviewDate: Date | null
  /**
   * The estimated time, in whole minutes, that this project will take to finish.
   * Nullable. No evidence that the app always sets it.
   */
  estimatedMinutes: Integer | null
  /**
   * If true, any children are sequentially dependent.
   * Nullable. No evidence that the app always sets it.
   */
  sequential: boolean | null
  /**
   * If true, complete when children are completed.
   * Nullable. No evidence that the app always sets it.
   */
  completedByChildren: boolean | null
  /**
   * True if the project contains singleton actions.
   * Nullable. No evidence that the app always sets it.
   */
  singletonActionHolder: boolean | null
  /**
   * True if the project is the default holder of singleton actions.
   * Nullable. No evidence that the app always sets it.
   */
  defaultSingletonActionHolder: boolean | null
  /**
   * True if the project has a project that must be completed prior to it being actionable.
   * Nullable. No evidence that the app always sets it.
   */
  readonly blocked: boolean | null
  /**
   * When the project should become available for action (including inherited).
   * Nullable. No evidence that the app always sets it.
   */
  readonly effectiveDeferDate: Date | null
  /**
   * The date at which work for this project is intended (including inherited).
   * Nullable. No evidence that the app always sets it.
   */
  readonly effectivePlannedDate: Date | null
  /**
   * When the project must be finished (including inherited).
   * Nullable. No evidence that the app always sets it.
   */
  readonly effectiveDueDate: Date | null
  /**
   * True if the project is completed.
   * Nullable. No evidence that the app always sets it.
   */
  readonly effectivelyCompleted: boolean | null
  /**
   * True if the project is dropped.
   * Nullable. No evidence that the app always sets it.
   */
  readonly effectivelyDropped: boolean | null
  /**
   * True if the project is dropped.
   * Nullable. No evidence that the app always sets it.
   */
  readonly dropped: boolean | null
  /**
   * The number of direct children of this project.
   * Nullable. No evidence that the app always sets it.
   */
  readonly numberOfTasks: Integer | null
  /**
   * The number of available direct children of this project.
   * Nullable. No evidence that the app always sets it.
   */
  readonly numberOfAvailableTasks: Integer | null
  /**
   * The number of completed direct children of this project.
   * Nullable. No evidence that the app always sets it.
   */
  readonly numberOfCompletedTasks: Integer | null
}

/** A group of projects and sub-folders representing an area of responsibility */
export interface Folder {
  /**
   * The unique identifier of the folder.
   * Never null: the primary identifier.
   */
  readonly id: string
  /**
   * The name of the folder.
   * Nullable. No evidence that the app always sets it.
   */
  name: string | null
  /**
   * The note of the folder.
   * Nullable. No evidence that the app always sets it.
   */
  note: string | null
  /**
   * Set if the folder is currently hidden.
   * Nullable. No evidence that the app always sets it.
   */
  hidden: boolean | null
  /**
   * Set if the folder is currently hidden or any of its container folders are hidden.
   * Nullable. No evidence that the app always sets it.
   */
  readonly effectivelyHidden: boolean | null
  /**
   * When the folder was created.
   * Nullable. No evidence that the app always sets it.
   */
  readonly creationDate: Date | null
  /**
   * When the folder was last modified.
   * Nullable. No evidence that the app always sets it.
   */
  readonly modificationDate: Date | null
}

/** A tag for organizing and filtering tasks */
export interface Tag {
  /**
   * The unique identifier of the tag.
   * Never null: the primary identifier.
   */
  readonly id: string
  /**
   * The name of the tag.
   * Nullable. No evidence that the app always sets it.
   */
  name: string | null
  /**
   * The note of the tag.
   * Nullable. No evidence that the app always sets it.
   */
  note: string | null
  /**
   * If false, tasks associated with this tag will be skipped when determining the next action for a
   * project.
   * Nullable. No evidence that the app always sets it.
   */
  allowsNextAction: boolean | null
  /**
   * Set if the tag is currently hidden.
   * Nullable. No evidence that the app always sets it.
   */
  hidden: boolean | null
  /**
   * Set if the tag is currently hidden or any of its container tags are hidden.
   * Nullable. No evidence that the app always sets it.
   */
  readonly effectivelyHidden: boolean | null
  /**
   * The number of available tasks.
   * Nullable. No evidence that the app always sets it.
   */
  readonly availableTaskCount: Integer | null
  /**
   * The number of remaining tasks.
   * Nullable. No evidence that the app always sets it.
   */
  readonly remainingTaskCount: Integer | null
}

/** A task that is in the document's inbox */
export interface InboxTask {
  /**
   * The unique identifier of the inbox task.
   * Never null: the primary identifier.
   */
  readonly id: string
  /**
   * The name of the inbox task.
   * Nullable. No evidence that the app always sets it.
   */
  name: string | null
  /**
   * The note of the inbox task.
   * Nullable. No evidence that the app always sets it.
   */
  note: string | null
  /**
   * True if flagged.
   * Nullable. No evidence that the app always sets it.
   */
  flagged: boolean | null
  /**
   * When the task should become available for action.
   * Nullable. No evidence that the app always sets it.
   */
  deferDate: Date | null
  /**
   * When the task must be finished.
   * Nullable. No evidence that the app always sets it.
   */
  dueDate: Date | null
  /**
   * When the task was created.
   * Nullable. No evidence that the app always sets it.
   */
  creationDate: Date | null
}

/** A saved view or filter configuration */
export interface Perspective {
  /**
   * The unique identifier of the perspective.
   * Never null: the primary identifier.
   */
  readonly id: string
  /**
   * The name of the perspective.
   * Nullable. No evidence that the app always sets it.
   */
  readonly name: string | null
}

/** Input for creating a Task. */
export interface TaskCreateInput {
  /** Task name */
  name: string
  /** Task note */
  note?: string
  /** True if flagged */
  flagged?: boolean
  /** Defer date */
  deferDate?: Date
  /** The date at which work for this task is intended */
  plannedDate?: Date
  /** Due date */
  dueDate?: Date
  /** The task's date of completion */
  completionDate?: Date
  /** The date the task was dropped */
  droppedDate?: Date
  /** When the task was created */
  creationDate?: Date
  /** The estimated time, in whole minutes, that this task will take to finish */
  estimatedMinutes?: Integer
  /** If true, any children are sequentially dependent */
  sequential?: boolean
  /** If true, complete when children are completed */
  completedByChildren?: boolean
}

/** Input for updating a Task. Omitted fields are left unchanged. */
export interface TaskUpdateInput {
  /**
   * Task name.
   * Cannot be reset: null is rejected.
   */
  name?: string
  /**
   * Task note.
   * Cannot be reset: null is rejected.
   */
  note?: string
  /**
   * True if flagged.
   * Cannot be reset: null is rejected.
   */
  flagged?: boolean
  /**
   * Defer date.
   * Cannot be reset: null is rejected.
   */
  deferDate?: Date
  /**
   * The date at which work for this task is intended.
   * Cannot be reset: null is rejected.
   */
  plannedDate?: Date
  /**
   * Due date.
   * Cannot be reset: null is rejected.
   */
  dueDate?: Date
  /**
   * The task's date of completion.
   * Cannot be reset: null is rejected.
   */
  completionDate?: Date
  /**
   * The date the task was dropped.
   * Cannot be reset: null is rejected.
   */
  droppedDate?: Date
  /**
   * When the task was created.
   * Cannot be reset: null is rejected.
   */
  creationDate?: Date
  /**
   * The estimated time, in whole minutes, that this task will take to finish.
   * Cannot be reset: null is rejected.
   */
  estimatedMinutes?: Integer
  /**
   * If true, any children are sequentially dependent.
   * Cannot be reset: null is rejected.
   */
  sequential?: boolean
  /**
   * If true, complete when children are completed.
   * Cannot be reset: null is rejected.
   */
  completedByChildren?: boolean
}

/** Input for creating a Project. */
export interface ProjectCreateInput {
  /** Project name */
  name: string
  /** Project note */
  note?: string
  /** Project status */
  status?: ProjectStatus
  /** True if flagged */
  flagged?: boolean
  /** When the project should become available for action */
  deferDate?: Date
  /** The date at which work for this project is intended */
  plannedDate?: Date
  /** When the project must be finished */
  dueDate?: Date
  /** The project's date of completion */
  completionDate?: Date
  /** The date the project was dropped */
  droppedDate?: Date
  /** When the project was created */
  creationDate?: Date
  /** When the project was last reviewed */
  lastReviewDate?: Date
  /** When the project should next be reviewed */
  nextReviewDate?: Date
  /** The estimated time, in whole minutes, that this project will take to finish */
  estimatedMinutes?: Integer
  /** If true, any children are sequentially dependent */
  sequential?: boolean
  /** If true, complete when children are completed */
  completedByChildren?: boolean
  /** True if the project contains singleton actions */
  singletonActionHolder?: boolean
  /** True if the project is the default holder of singleton actions */
  defaultSingletonActionHolder?: boolean
}

/** Input for updating a Project. Omitted fields are left unchanged. */
export interface ProjectUpdateInput {
  /**
   * Project name.
   * Cannot be reset: null is rejected.
   */
  name?: string
  /**
   * Project note.
   * Cannot be reset: null is rejected.
   */
  note?: string
  /**
   * Project status.
   * Cannot be reset: null is rejected.
   */
  status?: ProjectStatus
  /**
   * True if flagged.
   * Cannot be reset: null is rejected.
   */
  flagged?: boolean
  /**
   * When the project should become available for action.
   * Cannot be reset: null is rejected.
   */
  deferDate?: Date
  /**
   * The date at which work for this project is intended.
   * Cannot be reset: null is rejected.
   */
  plannedDate?: Date
  /**
   * When the project must be finished.
   * Cannot be reset: null is rejected.
   */
  dueDate?: Date
  /**
   * The project's date of completion.
   * Cannot be reset: null is rejected.
   */
  completionDate?: Date
  /**
   * The date the project was dropped.
   * Cannot be reset: null is rejected.
   */
  droppedDate?: Date
  /**
   * When the project was created.
   * Cannot be reset: null is rejected.
   */
  creationDate?: Date
  /**
   * When the project was last reviewed.
   * Cannot be reset: null is rejected.
   */
  lastReviewDate?: Date
  /**
   * When the project should next be reviewed.
   * Cannot be reset: null is rejected.
   */
  nextReviewDate?: Date
  /**
   * The estimated time, in whole minutes, that this project will take to finish.
   * Cannot be reset: null is rejected.
   */
  estimatedMinutes?: Integer
  /**
   * If true, any children are sequentially dependent.
   * Cannot be reset: null is rejected.
   */
  sequential?: boolean
  /**
   * If true, complete when children are completed.
   * Cannot be reset: null is rejected.
   */
  completedByChildren?: boolean
  /**
   * True if the project contains singleton actions.
   * Cannot be reset: null is rejected.
   */
  singletonActionHolder?: boolean
  /**
   * True if the project is the default holder of singleton actions.
   * Cannot be reset: null is rejected.
   */
  defaultSingletonActionHolder?: boolean
}

/** Input for creating a Folder. */
export interface FolderCreateInput {
  /** Folder name */
  name: string
  /** Folder note */
  note?: string
  /** Set if the folder is currently hidden */
  hidden?: boolean
}

/** Input for updating a Folder. Omitted fields are left unchanged. */
export interface FolderUpdateInput {
  /**
   * Folder name.
   * Cannot be reset: null is rejected.
   */
  name?: string
  /**
   * Folder note.
   * Cannot be reset: null is rejected.
   */
  note?: string
  /**
   * Set if the folder is currently hidden.
   * Cannot be reset: null is rejected.
   */
  hidden?: boolean
}

/** Input for creating a Tag. */
export interface TagCreateInput {
  /** Tag name */
  name: string
  /** The note of the tag */
  note?: string
  /**
   * If false, tasks associated with this tag will be skipped when determining the next action for a
   * project
   */
  allowsNextAction?: boolean
  /** Set if the tag is currently hidden */
  hidden?: boolean
}

/** Input for updating a Tag. Omitted fields are left unchanged. */
export interface TagUpdateInput {
  /**
   * Tag name.
   * Cannot be reset: null is rejected.
   */
  name?: string
  /**
   * The note of the tag.
   * Cannot be reset: null is rejected.
   */
  note?: string
  /**
   * If false, tasks associated with this tag will be skipped when determining the next action for a
   * project.
   * Cannot be reset: null is rejected.
   */
  allowsNextAction?: boolean
  /**
   * Set if the tag is currently hidden.
   * Cannot be reset: null is rejected.
   */
  hidden?: boolean
}

/** Input for creating an InboxTask. */
export interface InboxTaskCreateInput {
  /** Task name */
  name: string
  /** Task note */
  note?: string
  /** True if flagged */
  flagged?: boolean
  /** When the task should become available for action */
  deferDate?: Date
  /** When the task must be finished */
  dueDate?: Date
  /** When the task was created */
  creationDate?: Date
}

/** Input for updating an InboxTask. Omitted fields are left unchanged. */
export interface InboxTaskUpdateInput {
  /**
   * Task name.
   * Cannot be reset: null is rejected.
   */
  name?: string
  /**
   * Task note.
   * Cannot be reset: null is rejected.
   */
  note?: string
  /**
   * True if flagged.
   * Cannot be reset: null is rejected.
   */
  flagged?: boolean
  /**
   * When the task should become available for action.
   * Cannot be reset: null is rejected.
   */
  deferDate?: Date
  /**
   * When the task must be finished.
   * Cannot be reset: null is rejected.
   */
  dueDate?: Date
  /**
   * When the task was created.
   * Cannot be reset: null is rejected.
   */
  creationDate?: Date
}

/** Input for creating a Perspective. */
export type PerspectiveCreateInput = Record<string, never>

/** Input for updating a Perspective. Omitted fields are left unchanged. */
export type PerspectiveUpdateInput = Record<string, never>

/** A task within OmniFocus */
export interface TaskResourceClient {
  /** List tasks. */
  list(options?: CallOptions): Promise<readonly Task[]>
  /**
   * Read the task identified by `id`.
   *
   * @param id - Task identifier. Does not accept null.
   */
  get(id: string, options?: CallOptions): Promise<Task>
  /** Create a task. */
  create(input: TaskCreateInput, options?: CallOptions): Promise<Task>
}

/** A project in OmniFocus */
export interface ProjectResourceClient {
  /** List projects. */
  list(options?: CallOptions): Promise<readonly Project[]>
  /**
   * Read the project identified by `id`.
   *
   * @param id - Project identifier. Does not accept null.
   */
  get(id: string, options?: CallOptions): Promise<Project>
  /** Create a project. */
  create(input: ProjectCreateInput, options?: CallOptions): Promise<Project>
}

/** A group of projects and sub-folders representing an area of responsibility */
export interface FolderResourceClient {
  /** List folders. */
  list(options?: CallOptions): Promise<readonly Folder[]>
  /**
   * Read the folder identified by `id`.
   *
   * @param id - Folder identifier. Does not accept null.
   */
  get(id: string, options?: CallOptions): Promise<Folder>
  /** Create a folder. */
  create(input: FolderCreateInput, options?: CallOptions): Promise<Folder>
}

/** A tag for organizing and filtering tasks */
export interface TagResourceClient {
  /** List tags. */
  list(options?: CallOptions): Promise<readonly Tag[]>
  /**
   * Read the tag identified by `id`.
   *
   * @param id - Tag identifier. Does not accept null.
   */
  get(id: string, options?: CallOptions): Promise<Tag>
  /** Create a tag. */
  create(input: TagCreateInput, options?: CallOptions): Promise<Tag>
}

/** A task that is in the document's inbox */
export interface InboxTaskResourceClient {
  /** List inbox tasks. */
  list(options?: CallOptions): Promise<readonly InboxTask[]>
  /**
   * Read the inbox task identified by `id`.
   *
   * @param id - Inbox task identifier. Does not accept null.
   */
  get(id: string, options?: CallOptions): Promise<InboxTask>
  /** Create an inbox task. */
  create(input: InboxTaskCreateInput, options?: CallOptions): Promise<InboxTask>
}

/** A saved view or filter configuration */
export interface PerspectiveResourceClient {
  /** List perspectives. */
  list(options?: CallOptions): Promise<readonly Perspective[]>
  /**
   * Read the perspective identified by `id`.
   *
   * @param id - Perspective identifier. Does not accept null.
   */
  get(id: string, options?: CallOptions): Promise<Perspective>
}

/**
 * The OmniFocus client: one namespace per resource that has operations, plus the app's own
 * commands. A client factory creates one from {@link omniFocusContract}.
 */
export interface OmniFocusClient {
  /** A task within OmniFocus */
  readonly tasks: TaskResourceClient
  /** A project in OmniFocus */
  readonly projects: ProjectResourceClient
  /** A group of projects and sub-folders representing an area of responsibility */
  readonly folders: FolderResourceClient
  /** A tag for organizing and filtering tasks */
  readonly tags: TagResourceClient
  /** A task that is in the document's inbox */
  readonly inboxTasks: InboxTaskResourceClient
  /** A saved view or filter configuration */
  readonly perspectives: PerspectiveResourceClient
  /**
   * Generate a list of completions given a string
   *
   * @param text - Text to complete. Does not accept null.
   */
  complete(text: string, options?: CallOptions): Promise<void>
  /**
   * Mark one or more projects or tasks complete
   *
   * @param targets - Objects to mark complete. Does not accept null.
   */
  markComplete(targets: string, options?: CallOptions): Promise<void>
  /**
   * Mark one or more projects or tasks incomplete
   *
   * @param targets - Objects to mark incomplete. Does not accept null.
   */
  markIncomplete(targets: string, options?: CallOptions): Promise<void>
  /**
   * Mark one or more projects or tasks as dropped
   *
   * @param targets - Objects to mark dropped. Does not accept null.
   */
  markDropped(targets: string, options?: CallOptions): Promise<void>
  /**
   * Converts a textual representation of tasks into tasks
   *
   * @param text - Text to parse. Does not accept null.
   * @param into - Target container. Does not accept null.
   */
  parseTasksInto(text: string, into: string, options?: CallOptions): Promise<void>
  /**
   * Write a backup archive of the document
   *
   * @param _in - The file in which to archive the document. Does not accept null.
   * @param compression - Should the archive be written with data compression enabled. Does not
   * accept null.
   */
  archive(_in: string, compression?: boolean, options?: CallOptions): Promise<void>
  /** Hides completed tasks and processes any inbox items */
  compact(options?: CallOptions): Promise<void>
  /** Synchronizes with the shared OmniFocus sync database */
  synchronize(options?: CallOptions): Promise<void>
  /**
   * Imports a file into an existing OmniFocus document
   *
   * @param file - File to import. Does not accept null.
   */
  importInto(file: string, options?: CallOptions): Promise<void>
  /** Undo the last command */
  undo(options?: CallOptions): Promise<void>
  /** Redo the last undone command */
  redo(options?: CallOptions): Promise<void>
}

/** The members of {@link ProjectStatus}, for its value type. */
const projectStatusMembers = ['active', 'onHold', 'done', 'dropped'] as const

const taskRecordType: ValueType<Task> = t.record(
  {
    id: t.string({ description: 'The unique identifier of the task' }),
    name: t.nullable(t.string(), { description: 'The name of the task' }),
    note: t.nullable(t.string(), { description: 'The note of the task' }),
    flagged: t.nullable(t.boolean(), { description: 'True if flagged' }),
    completed: t.nullable(t.boolean(), { description: 'True if the task is completed' }),
    deferDate: t.nullable(t.date(), {
      description: 'When the task should become available for action',
    }),
    plannedDate: t.nullable(t.date(), {
      description: 'The date at which work for this task is intended',
    }),
    dueDate: t.nullable(t.date(), { description: 'When the task must be finished' }),
    completionDate: t.nullable(t.date(), { description: "The task's date of completion" }),
    droppedDate: t.nullable(t.date(), { description: 'The date the task was dropped' }),
    creationDate: t.nullable(t.date(), { description: 'When the task was created' }),
    modificationDate: t.nullable(t.date(), { description: 'When the task was last modified' }),
    estimatedMinutes: t.nullable(t.integer(), {
      description: 'The estimated time, in whole minutes, that this task will take to finish',
    }),
    sequential: t.nullable(t.boolean(), {
      description: 'If true, any children are sequentially dependent',
    }),
    completedByChildren: t.nullable(t.boolean(), {
      description: 'If true, complete when children are completed',
    }),
    inInbox: t.nullable(t.boolean(), {
      description:
        'Returns true if the task itself is an inbox task or if the task is contained by an inbox task',
    }),
    next: t.nullable(t.boolean(), {
      description: 'If the task is the next task of its containing project, next is true',
    }),
    blocked: t.nullable(t.boolean(), {
      description:
        'True if the task has a task that must be completed prior to it being actionable',
    }),
    effectiveDeferDate: t.nullable(t.date(), {
      description: 'When the task should become available for action (including inherited)',
    }),
    effectivePlannedDate: t.nullable(t.date(), {
      description: 'The date at which work for this task is intended (including inherited)',
    }),
    effectiveDueDate: t.nullable(t.date(), {
      description: 'When the task must be finished (including inherited)',
    }),
    effectivelyCompleted: t.nullable(t.boolean(), {
      description:
        'True if the task is completed, or any of its containing tasks or project are completed',
    }),
    effectivelyDropped: t.nullable(t.boolean(), {
      description:
        'True if the task is dropped, or any of its containing tasks or project are dropped',
    }),
    dropped: t.nullable(t.boolean(), { description: 'True if the task is dropped' }),
    numberOfTasks: t.nullable(t.integer(), {
      description: 'The number of direct children of this task',
    }),
    numberOfAvailableTasks: t.nullable(t.integer(), {
      description: 'The number of available direct children of this task',
    }),
    numberOfCompletedTasks: t.nullable(t.integer(), {
      description: 'The number of completed direct children of this task',
    }),
  },
  { description: 'A task within OmniFocus' }
)

const projectRecordType: ValueType<Project> = t.record(
  {
    id: t.string({ description: 'The unique identifier of the project' }),
    name: t.nullable(t.string(), { description: 'The name of the project' }),
    note: t.nullable(t.string(), { description: 'The note of the project' }),
    status: t.nullable(t.enumeration(projectStatusMembers), {
      description: 'The status of the project',
    }),
    effectiveStatus: t.nullable(t.enumeration(projectStatusMembers), {
      description: 'The effective status of the project',
    }),
    flagged: t.nullable(t.boolean(), { description: 'True if flagged' }),
    completed: t.nullable(t.boolean(), { description: 'True if the project is completed' }),
    deferDate: t.nullable(t.date(), {
      description: 'When the project should become available for action',
    }),
    plannedDate: t.nullable(t.date(), {
      description: 'The date at which work for this project is intended',
    }),
    dueDate: t.nullable(t.date(), { description: 'When the project must be finished' }),
    completionDate: t.nullable(t.date(), { description: "The project's date of completion" }),
    droppedDate: t.nullable(t.date(), { description: 'The date the project was dropped' }),
    creationDate: t.nullable(t.date(), { description: 'When the project was created' }),
    modificationDate: t.nullable(t.date(), { description: 'When the project was last modified' }),
    lastReviewDate: t.nullable(t.date(), { description: 'When the project was last reviewed' }),
    nextReviewDate: t.nullable(t.date(), {
      description: 'When the project should next be reviewed',
    }),
    estimatedMinutes: t.nullable(t.integer(), {
      description: 'The estimated time, in whole minutes, that this project will take to finish',
    }),
    sequential: t.nullable(t.boolean(), {
      description: 'If true, any children are sequentially dependent',
    }),
    completedByChildren: t.nullable(t.boolean(), {
      description: 'If true, complete when children are completed',
    }),
    singletonActionHolder: t.nullable(t.boolean(), {
      description: 'True if the project contains singleton actions',
    }),
    defaultSingletonActionHolder: t.nullable(t.boolean(), {
      description: 'True if the project is the default holder of singleton actions',
    }),
    blocked: t.nullable(t.boolean(), {
      description:
        'True if the project has a project that must be completed prior to it being actionable',
    }),
    effectiveDeferDate: t.nullable(t.date(), {
      description: 'When the project should become available for action (including inherited)',
    }),
    effectivePlannedDate: t.nullable(t.date(), {
      description: 'The date at which work for this project is intended (including inherited)',
    }),
    effectiveDueDate: t.nullable(t.date(), {
      description: 'When the project must be finished (including inherited)',
    }),
    effectivelyCompleted: t.nullable(t.boolean(), {
      description: 'True if the project is completed',
    }),
    effectivelyDropped: t.nullable(t.boolean(), { description: 'True if the project is dropped' }),
    dropped: t.nullable(t.boolean(), { description: 'True if the project is dropped' }),
    numberOfTasks: t.nullable(t.integer(), {
      description: 'The number of direct children of this project',
    }),
    numberOfAvailableTasks: t.nullable(t.integer(), {
      description: 'The number of available direct children of this project',
    }),
    numberOfCompletedTasks: t.nullable(t.integer(), {
      description: 'The number of completed direct children of this project',
    }),
  },
  { description: 'A project in OmniFocus' }
)

const folderRecordType: ValueType<Folder> = t.record(
  {
    id: t.string({ description: 'The unique identifier of the folder' }),
    name: t.nullable(t.string(), { description: 'The name of the folder' }),
    note: t.nullable(t.string(), { description: 'The note of the folder' }),
    hidden: t.nullable(t.boolean(), { description: 'Set if the folder is currently hidden' }),
    effectivelyHidden: t.nullable(t.boolean(), {
      description:
        'Set if the folder is currently hidden or any of its container folders are hidden',
    }),
    creationDate: t.nullable(t.date(), { description: 'When the folder was created' }),
    modificationDate: t.nullable(t.date(), { description: 'When the folder was last modified' }),
  },
  { description: 'A group of projects and sub-folders representing an area of responsibility' }
)

const tagRecordType: ValueType<Tag> = t.record(
  {
    id: t.string({ description: 'The unique identifier of the tag' }),
    name: t.nullable(t.string(), { description: 'The name of the tag' }),
    note: t.nullable(t.string(), { description: 'The note of the tag' }),
    allowsNextAction: t.nullable(t.boolean(), {
      description:
        'If false, tasks associated with this tag will be skipped when determining the next action for a project',
    }),
    hidden: t.nullable(t.boolean(), { description: 'Set if the tag is currently hidden' }),
    effectivelyHidden: t.nullable(t.boolean(), {
      description: 'Set if the tag is currently hidden or any of its container tags are hidden',
    }),
    availableTaskCount: t.nullable(t.integer(), { description: 'The number of available tasks' }),
    remainingTaskCount: t.nullable(t.integer(), { description: 'The number of remaining tasks' }),
  },
  { description: 'A tag for organizing and filtering tasks' }
)

const inboxTaskRecordType: ValueType<InboxTask> = t.record(
  {
    id: t.string({ description: 'The unique identifier of the inbox task' }),
    name: t.nullable(t.string(), { description: 'The name of the inbox task' }),
    note: t.nullable(t.string(), { description: 'The note of the inbox task' }),
    flagged: t.nullable(t.boolean(), { description: 'True if flagged' }),
    deferDate: t.nullable(t.date(), {
      description: 'When the task should become available for action',
    }),
    dueDate: t.nullable(t.date(), { description: 'When the task must be finished' }),
    creationDate: t.nullable(t.date(), { description: 'When the task was created' }),
  },
  { description: "A task that is in the document's inbox" }
)

const perspectiveRecordType: ValueType<Perspective> = t.record(
  {
    id: t.string({ description: 'The unique identifier of the perspective' }),
    name: t.nullable(t.string(), { description: 'The name of the perspective' }),
  },
  { description: 'A saved view or filter configuration' }
)

const folderCreateInputType: ValueType<FolderCreateInput> = t.record({
  name: t.string({ description: 'Folder name' }),
  note: t.optional(t.string({ description: 'Folder note' })),
  hidden: t.optional(t.boolean({ description: 'Set if the folder is currently hidden' })),
})

const projectCreateInputType: ValueType<ProjectCreateInput> = t.record({
  name: t.string({ description: 'Project name' }),
  note: t.optional(t.string({ description: 'Project note' })),
  status: t.optional(t.enumeration(projectStatusMembers, { description: 'Project status' })),
  flagged: t.optional(t.boolean({ description: 'True if flagged' })),
  deferDate: t.optional(
    t.date({ description: 'When the project should become available for action' })
  ),
  plannedDate: t.optional(
    t.date({ description: 'The date at which work for this project is intended' })
  ),
  dueDate: t.optional(t.date({ description: 'When the project must be finished' })),
  completionDate: t.optional(t.date({ description: "The project's date of completion" })),
  droppedDate: t.optional(t.date({ description: 'The date the project was dropped' })),
  creationDate: t.optional(t.date({ description: 'When the project was created' })),
  lastReviewDate: t.optional(t.date({ description: 'When the project was last reviewed' })),
  nextReviewDate: t.optional(t.date({ description: 'When the project should next be reviewed' })),
  estimatedMinutes: t.optional(
    t.integer({
      description: 'The estimated time, in whole minutes, that this project will take to finish',
    })
  ),
  sequential: t.optional(
    t.boolean({ description: 'If true, any children are sequentially dependent' })
  ),
  completedByChildren: t.optional(
    t.boolean({ description: 'If true, complete when children are completed' })
  ),
  singletonActionHolder: t.optional(
    t.boolean({ description: 'True if the project contains singleton actions' })
  ),
  defaultSingletonActionHolder: t.optional(
    t.boolean({ description: 'True if the project is the default holder of singleton actions' })
  ),
})

const taskCreateInputType: ValueType<TaskCreateInput> = t.record({
  name: t.string({ description: 'Task name' }),
  note: t.optional(t.string({ description: 'Task note' })),
  flagged: t.optional(t.boolean({ description: 'True if flagged' })),
  deferDate: t.optional(t.date({ description: 'Defer date' })),
  plannedDate: t.optional(
    t.date({ description: 'The date at which work for this task is intended' })
  ),
  dueDate: t.optional(t.date({ description: 'Due date' })),
  completionDate: t.optional(t.date({ description: "The task's date of completion" })),
  droppedDate: t.optional(t.date({ description: 'The date the task was dropped' })),
  creationDate: t.optional(t.date({ description: 'When the task was created' })),
  estimatedMinutes: t.optional(
    t.integer({
      description: 'The estimated time, in whole minutes, that this task will take to finish',
    })
  ),
  sequential: t.optional(
    t.boolean({ description: 'If true, any children are sequentially dependent' })
  ),
  completedByChildren: t.optional(
    t.boolean({ description: 'If true, complete when children are completed' })
  ),
})

const tagCreateInputType: ValueType<TagCreateInput> = t.record({
  name: t.string({ description: 'Tag name' }),
  note: t.optional(t.string({ description: 'The note of the tag' })),
  allowsNextAction: t.optional(
    t.boolean({
      description:
        'If false, tasks associated with this tag will be skipped when determining the next action for a project',
    })
  ),
  hidden: t.optional(t.boolean({ description: 'Set if the tag is currently hidden' })),
})

const inboxTaskCreateInputType: ValueType<InboxTaskCreateInput> = t.record({
  name: t.string({ description: 'Task name' }),
  note: t.optional(t.string({ description: 'Task note' })),
  flagged: t.optional(t.boolean({ description: 'True if flagged' })),
  deferDate: t.optional(
    t.date({ description: 'When the task should become available for action' })
  ),
  dueDate: t.optional(t.date({ description: 'When the task must be finished' })),
  creationDate: t.optional(t.date({ description: 'When the task was created' })),
})

/**
 * Every resource, keyed by manifest resource key: its record, its identifier
 * (when it has one), and the operations that resolve references to it. This
 * table is also the registry that reference value types read, lazily.
 */
const resources: AppContract<OmniFocusClient>['resources'] = {
  Task: {
    name: 'Task',
    record: taskRecordType,
    id: t.string({ description: 'The unique identifier of the task' }),
    get: 'omnifocus.tasks.get',
    list: 'omnifocus.tasks.list',
  },
  Project: {
    name: 'Project',
    record: projectRecordType,
    id: t.string({ description: 'The unique identifier of the project' }),
    get: 'omnifocus.projects.get',
    list: 'omnifocus.projects.list',
  },
  Folder: {
    name: 'Folder',
    record: folderRecordType,
    id: t.string({ description: 'The unique identifier of the folder' }),
    get: 'omnifocus.folders.get',
    list: 'omnifocus.folders.list',
  },
  Tag: {
    name: 'Tag',
    record: tagRecordType,
    id: t.string({ description: 'The unique identifier of the tag' }),
    get: 'omnifocus.tags.get',
    list: 'omnifocus.tags.list',
  },
  InboxTask: {
    name: 'InboxTask',
    record: inboxTaskRecordType,
    id: t.string({ description: 'The unique identifier of the inbox task' }),
    get: 'omnifocus.inboxTasks.get',
    list: 'omnifocus.inboxTasks.list',
  },
  Perspective: {
    name: 'Perspective',
    record: perspectiveRecordType,
    id: t.string({ description: 'The unique identifier of the perspective' }),
    get: 'omnifocus.perspectives.get',
    list: 'omnifocus.perspectives.list',
  },
}

const folderListFoldersOperation: OperationDescriptor<Record<string, never>, readonly Folder[]> = {
  id: 'omnifocus.folders.list',
  permission: 'omnifocus:folders:list',
  target: { command: 'listFolders', resource: 'Folder' },
  description: 'List all folders',
  input: t.record({}),
  output: t.array(folderRecordType),
}

const folderGetFolderOperation: OperationDescriptor<{ readonly id: string }, Folder> = {
  id: 'omnifocus.folders.get',
  permission: 'omnifocus:folders:get',
  target: { command: 'getFolder', resource: 'Folder' },
  description: 'Get a folder by ID',
  input: t.record({
    id: t.string({ description: 'Folder identifier' }),
  }),
  output: folderRecordType,
}

const folderCreateFolderOperation: OperationDescriptor<FolderCreateInput, Folder> = {
  id: 'omnifocus.folders.create',
  permission: 'omnifocus:folders:create',
  target: { command: 'createFolder', resource: 'Folder' },
  description: 'Create a new folder',
  input: folderCreateInputType,
  output: folderRecordType,
}

const projectListProjectsOperation: OperationDescriptor<
  Record<string, never>,
  readonly Project[]
> = {
  id: 'omnifocus.projects.list',
  permission: 'omnifocus:projects:list',
  target: { command: 'listProjects', resource: 'Project' },
  description: 'List all projects',
  input: t.record({}),
  output: t.array(projectRecordType),
}

const projectGetProjectOperation: OperationDescriptor<{ readonly id: string }, Project> = {
  id: 'omnifocus.projects.get',
  permission: 'omnifocus:projects:get',
  target: { command: 'getProject', resource: 'Project' },
  description: 'Get a project by ID',
  input: t.record({
    id: t.string({ description: 'Project identifier' }),
  }),
  output: projectRecordType,
}

const projectCreateProjectOperation: OperationDescriptor<ProjectCreateInput, Project> = {
  id: 'omnifocus.projects.create',
  permission: 'omnifocus:projects:create',
  target: { command: 'createProject', resource: 'Project' },
  description: 'Create a new project',
  input: projectCreateInputType,
  output: projectRecordType,
}

const taskListTasksOperation: OperationDescriptor<Record<string, never>, readonly Task[]> = {
  id: 'omnifocus.tasks.list',
  permission: 'omnifocus:tasks:list',
  target: { command: 'listTasks', resource: 'Task' },
  description: 'List all tasks',
  input: t.record({}),
  output: t.array(taskRecordType),
}

const taskGetTaskOperation: OperationDescriptor<{ readonly id: string }, Task> = {
  id: 'omnifocus.tasks.get',
  permission: 'omnifocus:tasks:get',
  target: { command: 'getTask', resource: 'Task' },
  description: 'Get a task by ID',
  input: t.record({
    id: t.string({ description: 'Task identifier' }),
  }),
  output: taskRecordType,
}

const taskCreateTaskOperation: OperationDescriptor<TaskCreateInput, Task> = {
  id: 'omnifocus.tasks.create',
  permission: 'omnifocus:tasks:create',
  target: { command: 'createTask', resource: 'Task' },
  description: 'Create a new task',
  input: taskCreateInputType,
  output: taskRecordType,
}

const tagListTagsOperation: OperationDescriptor<Record<string, never>, readonly Tag[]> = {
  id: 'omnifocus.tags.list',
  permission: 'omnifocus:tags:list',
  target: { command: 'listTags', resource: 'Tag' },
  description: 'List all tags',
  input: t.record({}),
  output: t.array(tagRecordType),
}

const tagGetTagOperation: OperationDescriptor<{ readonly id: string }, Tag> = {
  id: 'omnifocus.tags.get',
  permission: 'omnifocus:tags:get',
  target: { command: 'getTag', resource: 'Tag' },
  description: 'Get a tag by ID',
  input: t.record({
    id: t.string({ description: 'Tag identifier' }),
  }),
  output: tagRecordType,
}

const tagCreateTagOperation: OperationDescriptor<TagCreateInput, Tag> = {
  id: 'omnifocus.tags.create',
  permission: 'omnifocus:tags:create',
  target: { command: 'createTag', resource: 'Tag' },
  description: 'Create a new tag',
  input: tagCreateInputType,
  output: tagRecordType,
}

const inboxTaskListInboxTasksOperation: OperationDescriptor<
  Record<string, never>,
  readonly InboxTask[]
> = {
  id: 'omnifocus.inboxTasks.list',
  permission: 'omnifocus:inboxTasks:list',
  target: { command: 'listInboxTasks', resource: 'InboxTask' },
  description: 'List all inbox tasks',
  input: t.record({}),
  output: t.array(inboxTaskRecordType),
}

const inboxTaskGetInboxTaskOperation: OperationDescriptor<{ readonly id: string }, InboxTask> = {
  id: 'omnifocus.inboxTasks.get',
  permission: 'omnifocus:inboxTasks:get',
  target: { command: 'getInboxTask', resource: 'InboxTask' },
  description: 'Get an inbox task by ID',
  input: t.record({
    id: t.string({ description: 'Inbox task identifier' }),
  }),
  output: inboxTaskRecordType,
}

const inboxTaskCreateInboxTaskOperation: OperationDescriptor<InboxTaskCreateInput, InboxTask> = {
  id: 'omnifocus.inboxTasks.create',
  permission: 'omnifocus:inboxTasks:create',
  target: { command: 'createInboxTask', resource: 'InboxTask' },
  description: 'Create a new inbox task',
  input: inboxTaskCreateInputType,
  output: inboxTaskRecordType,
}

const perspectiveListPerspectivesOperation: OperationDescriptor<
  Record<string, never>,
  readonly Perspective[]
> = {
  id: 'omnifocus.perspectives.list',
  permission: 'omnifocus:perspectives:list',
  target: { command: 'listPerspectives', resource: 'Perspective' },
  description: 'List all perspectives',
  input: t.record({}),
  output: t.array(perspectiveRecordType),
}

const perspectiveGetPerspectiveOperation: OperationDescriptor<
  { readonly id: string },
  Perspective
> = {
  id: 'omnifocus.perspectives.get',
  permission: 'omnifocus:perspectives:get',
  target: { command: 'getPerspective', resource: 'Perspective' },
  description: 'Get a perspective by ID',
  input: t.record({
    id: t.string({ description: 'Perspective identifier' }),
  }),
  output: perspectiveRecordType,
}

const appCompleteOperation: OperationDescriptor<{ readonly text: string }, undefined> = {
  id: 'omnifocus.app.complete',
  permission: 'omnifocus:app:complete',
  target: { command: 'complete' },
  description: 'Generate a list of completions given a string',
  input: t.record({
    text: t.string({ description: 'Text to complete' }),
  }),
  output: t.none(),
}

const appMarkCompleteOperation: OperationDescriptor<{ readonly targets: string }, undefined> = {
  id: 'omnifocus.app.markComplete',
  permission: 'omnifocus:app:markComplete',
  target: { command: 'markComplete' },
  description: 'Mark one or more projects or tasks complete',
  input: t.record({
    targets: t.string({ description: 'Objects to mark complete' }),
  }),
  output: t.none(),
}

const appMarkIncompleteOperation: OperationDescriptor<{ readonly targets: string }, undefined> = {
  id: 'omnifocus.app.markIncomplete',
  permission: 'omnifocus:app:markIncomplete',
  target: { command: 'markIncomplete' },
  description: 'Mark one or more projects or tasks incomplete',
  input: t.record({
    targets: t.string({ description: 'Objects to mark incomplete' }),
  }),
  output: t.none(),
}

const appMarkDroppedOperation: OperationDescriptor<{ readonly targets: string }, undefined> = {
  id: 'omnifocus.app.markDropped',
  permission: 'omnifocus:app:markDropped',
  target: { command: 'markDropped' },
  description: 'Mark one or more projects or tasks as dropped',
  input: t.record({
    targets: t.string({ description: 'Objects to mark dropped' }),
  }),
  output: t.none(),
}

const appParseTasksIntoOperation: OperationDescriptor<
  { readonly text: string; readonly into: string },
  undefined
> = {
  id: 'omnifocus.app.parseTasksInto',
  permission: 'omnifocus:app:parseTasksInto',
  target: { command: 'parseTasksInto' },
  description: 'Converts a textual representation of tasks into tasks',
  input: t.record({
    text: t.string({ description: 'Text to parse' }),
    into: t.string({ description: 'Target container' }),
  }),
  output: t.none(),
}

const appArchiveOperation: OperationDescriptor<
  { readonly in: string; readonly compression?: boolean | undefined },
  undefined
> = {
  id: 'omnifocus.app.archive',
  permission: 'omnifocus:app:archive',
  target: { command: 'archive' },
  description: 'Write a backup archive of the document',
  input: t.record({
    in: t.string({ description: 'The file in which to archive the document' }),
    compression: t.optional(
      t.boolean({ description: 'Should the archive be written with data compression enabled' })
    ),
  }),
  output: t.none(),
}

const appCompactOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'omnifocus.app.compact',
  permission: 'omnifocus:app:compact',
  target: { command: 'compact' },
  description: 'Hides completed tasks and processes any inbox items',
  input: t.record({}),
  output: t.none(),
}

const appSynchronizeOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'omnifocus.app.synchronize',
  permission: 'omnifocus:app:synchronize',
  target: { command: 'synchronize' },
  description: 'Synchronizes with the shared OmniFocus sync database',
  input: t.record({}),
  output: t.none(),
}

const appImportIntoOperation: OperationDescriptor<{ readonly file: string }, undefined> = {
  id: 'omnifocus.app.importInto',
  permission: 'omnifocus:app:importInto',
  target: { command: 'importInto' },
  description: 'Imports a file into an existing OmniFocus document',
  input: t.record({
    file: t.string({ description: 'File to import' }),
  }),
  output: t.none(),
}

const appUndoOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'omnifocus.app.undo',
  permission: 'omnifocus:app:undo',
  target: { command: 'undo' },
  description: 'Undo the last command',
  input: t.record({}),
  output: t.none(),
}

const appRedoOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'omnifocus.app.redo',
  permission: 'omnifocus:app:redo',
  target: { command: 'redo' },
  description: 'Redo the last undone command',
  input: t.record({}),
  output: t.none(),
}

/** Every operation, keyed by its identity. */
const operations: AppContract<OmniFocusClient>['operations'] = {
  'omnifocus.folders.list': folderListFoldersOperation,
  'omnifocus.folders.get': folderGetFolderOperation,
  'omnifocus.folders.create': folderCreateFolderOperation,
  'omnifocus.projects.list': projectListProjectsOperation,
  'omnifocus.projects.get': projectGetProjectOperation,
  'omnifocus.projects.create': projectCreateProjectOperation,
  'omnifocus.tasks.list': taskListTasksOperation,
  'omnifocus.tasks.get': taskGetTaskOperation,
  'omnifocus.tasks.create': taskCreateTaskOperation,
  'omnifocus.tags.list': tagListTagsOperation,
  'omnifocus.tags.get': tagGetTagOperation,
  'omnifocus.tags.create': tagCreateTagOperation,
  'omnifocus.inboxTasks.list': inboxTaskListInboxTasksOperation,
  'omnifocus.inboxTasks.get': inboxTaskGetInboxTaskOperation,
  'omnifocus.inboxTasks.create': inboxTaskCreateInboxTaskOperation,
  'omnifocus.perspectives.list': perspectiveListPerspectivesOperation,
  'omnifocus.perspectives.get': perspectiveGetPerspectiveOperation,
  'omnifocus.app.complete': appCompleteOperation,
  'omnifocus.app.markComplete': appMarkCompleteOperation,
  'omnifocus.app.markIncomplete': appMarkIncompleteOperation,
  'omnifocus.app.markDropped': appMarkDroppedOperation,
  'omnifocus.app.parseTasksInto': appParseTasksIntoOperation,
  'omnifocus.app.archive': appArchiveOperation,
  'omnifocus.app.compact': appCompactOperation,
  'omnifocus.app.synchronize': appSynchronizeOperation,
  'omnifocus.app.importInto': appImportIntoOperation,
  'omnifocus.app.undo': appUndoOperation,
  'omnifocus.app.redo': appRedoOperation,
}

/** Build the client on top of a factory-supplied runtime. */
function bind(runtime: ClientRuntime): OmniFocusClient {
  return {
    tasks: {
      list: (options) => runtime.invoke(taskListTasksOperation, {}, options),
      get: (id, options) => runtime.invoke(taskGetTaskOperation, { id }, options),
      create: (input, options) => runtime.invoke(taskCreateTaskOperation, input, options),
    },
    projects: {
      list: (options) => runtime.invoke(projectListProjectsOperation, {}, options),
      get: (id, options) => runtime.invoke(projectGetProjectOperation, { id }, options),
      create: (input, options) => runtime.invoke(projectCreateProjectOperation, input, options),
    },
    folders: {
      list: (options) => runtime.invoke(folderListFoldersOperation, {}, options),
      get: (id, options) => runtime.invoke(folderGetFolderOperation, { id }, options),
      create: (input, options) => runtime.invoke(folderCreateFolderOperation, input, options),
    },
    tags: {
      list: (options) => runtime.invoke(tagListTagsOperation, {}, options),
      get: (id, options) => runtime.invoke(tagGetTagOperation, { id }, options),
      create: (input, options) => runtime.invoke(tagCreateTagOperation, input, options),
    },
    inboxTasks: {
      list: (options) => runtime.invoke(inboxTaskListInboxTasksOperation, {}, options),
      get: (id, options) => runtime.invoke(inboxTaskGetInboxTaskOperation, { id }, options),
      create: (input, options) => runtime.invoke(inboxTaskCreateInboxTaskOperation, input, options),
    },
    perspectives: {
      list: (options) => runtime.invoke(perspectiveListPerspectivesOperation, {}, options),
      get: (id, options) => runtime.invoke(perspectiveGetPerspectiveOperation, { id }, options),
    },
    complete: (text, options) => runtime.invoke(appCompleteOperation, { text }, options),
    markComplete: (targets, options) =>
      runtime.invoke(appMarkCompleteOperation, { targets }, options),
    markIncomplete: (targets, options) =>
      runtime.invoke(appMarkIncompleteOperation, { targets }, options),
    markDropped: (targets, options) =>
      runtime.invoke(appMarkDroppedOperation, { targets }, options),
    parseTasksInto: (text, into, options) =>
      runtime.invoke(appParseTasksIntoOperation, { text, into }, options),
    archive: (_in, compression, options) =>
      runtime.invoke(appArchiveOperation, { in: _in, compression }, options),
    compact: (options) => runtime.invoke(appCompactOperation, {}, options),
    synchronize: (options) => runtime.invoke(appSynchronizeOperation, {}, options),
    importInto: (file, options) => runtime.invoke(appImportIntoOperation, { file }, options),
    undo: (options) => runtime.invoke(appUndoOperation, {}, options),
    redo: (options) => runtime.invoke(appRedoOperation, {}, options),
  }
}

/**
 * The OmniFocus contract. Pass it to a client factory to obtain a
 * {@link OmniFocusClient}.
 */
export const omniFocusContract: AppContract<OmniFocusClient> = {
  app: 'omnifocus',
  operations,
  resources,
  loadManifest: async () => (await import('./manifest.js')).manifest,
  bind,
}
