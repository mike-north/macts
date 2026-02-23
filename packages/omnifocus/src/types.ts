/**
 * Type definitions for the SDK.
 * Auto-generated - do not edit.
 */

import { z } from "zod";

/** Status of a project */
export type ProjectStatus = 'active' | 'onHold' | 'done' | 'dropped';

/** Unit for time intervals */
export type IntervalUnit = 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year';

/** Method for task repetition */
export type RepetitionMethod = 'fixedRepetition' | 'startAfterCompletion' | 'dueAfterCompletion';

/** Schedule type for repetition */
export type RepetitionSchedule = 'regularly' | 'fromCompletion';

/** Which date property to base repetition on */
export type RepetitionBasedOn = 'basedOnDue' | 'basedOnPlanned' | 'basedOnDefer';

/** A task within OmniFocus */
export interface Task {
  /** The unique identifier of the task */
  id: string;
  /** The name of the task */
  name: string;
  /** The note of the task */
  note: string;
  /** True if flagged */
  flagged: boolean;
  /** True if the task is completed */
  completed: boolean;
  /** When the task should become available for action */
  deferDate: Date;
  /** The date at which work for this task is intended */
  plannedDate: Date;
  /** When the task must be finished */
  dueDate: Date;
  /** The task's date of completion */
  completionDate: Date;
  /** The date the task was dropped */
  droppedDate: Date;
  /** When the task was created */
  creationDate: Date;
  /** When the task was last modified */
  modificationDate: Date;
  /** The estimated time, in whole minutes, that this task will take to finish */
  estimatedMinutes: number;
  /** If true, any children are sequentially dependent */
  sequential: boolean;
  /** If true, complete when children are completed */
  completedByChildren: boolean;
  /** Returns true if the task itself is an inbox task or if the task is contained by an inbox task */
  inInbox: boolean;
  /** If the task is the next task of its containing project, next is true */
  next: boolean;
  /** True if the task has a task that must be completed prior to it being actionable */
  blocked: boolean;
  /** When the task should become available for action (including inherited) */
  effectiveDeferDate: Date;
  /** The date at which work for this task is intended (including inherited) */
  effectivePlannedDate: Date;
  /** When the task must be finished (including inherited) */
  effectiveDueDate: Date;
  /** True if the task is completed, or any of its containing tasks or project are completed */
  effectivelyCompleted: boolean;
  /** True if the task is dropped, or any of its containing tasks or project are dropped */
  effectivelyDropped: boolean;
  /** True if the task is dropped */
  dropped: boolean;
  /** The number of direct children of this task */
  numberOfTasks: number;
  /** The number of available direct children of this task */
  numberOfAvailableTasks: number;
  /** The number of completed direct children of this task */
  numberOfCompletedTasks: number;
}

/** Input for creating a Task */
export interface TaskCreateInput {
  /** The name of the task */
  name?: string;
  /** The note of the task */
  note?: string;
  /** True if flagged */
  flagged?: boolean;
  /** When the task should become available for action */
  deferDate?: Date;
  /** The date at which work for this task is intended */
  plannedDate?: Date;
  /** When the task must be finished */
  dueDate?: Date;
  /** The task's date of completion */
  completionDate?: Date;
  /** The date the task was dropped */
  droppedDate?: Date;
  /** When the task was created */
  creationDate?: Date;
  /** The estimated time, in whole minutes, that this task will take to finish */
  estimatedMinutes?: number;
  /** If true, any children are sequentially dependent */
  sequential?: boolean;
  /** If true, complete when children are completed */
  completedByChildren?: boolean;
}

/** Input for updating a Task */
export type TaskUpdateInput = Partial<TaskCreateInput>;

/** A project in OmniFocus */
export interface Project {
  /** The unique identifier of the project */
  id: string;
  /** The name of the project */
  name: string;
  /** The note of the project */
  note: string;
  /** The status of the project */
  status: ProjectStatus;
  /** The effective status of the project */
  effectiveStatus: ProjectStatus;
  /** True if flagged */
  flagged: boolean;
  /** True if the project is completed */
  completed: boolean;
  /** When the project should become available for action */
  deferDate: Date;
  /** The date at which work for this project is intended */
  plannedDate: Date;
  /** When the project must be finished */
  dueDate: Date;
  /** The project's date of completion */
  completionDate: Date;
  /** The date the project was dropped */
  droppedDate: Date;
  /** When the project was created */
  creationDate: Date;
  /** When the project was last modified */
  modificationDate: Date;
  /** When the project was last reviewed */
  lastReviewDate: Date;
  /** When the project should next be reviewed */
  nextReviewDate: Date;
  /** The estimated time, in whole minutes, that this project will take to finish */
  estimatedMinutes: number;
  /** If true, any children are sequentially dependent */
  sequential: boolean;
  /** If true, complete when children are completed */
  completedByChildren: boolean;
  /** True if the project contains singleton actions */
  singletonActionHolder: boolean;
  /** True if the project is the default holder of singleton actions */
  defaultSingletonActionHolder: boolean;
  /** True if the project has a project that must be completed prior to it being actionable */
  blocked: boolean;
  /** When the project should become available for action (including inherited) */
  effectiveDeferDate: Date;
  /** The date at which work for this project is intended (including inherited) */
  effectivePlannedDate: Date;
  /** When the project must be finished (including inherited) */
  effectiveDueDate: Date;
  /** True if the project is completed */
  effectivelyCompleted: boolean;
  /** True if the project is dropped */
  effectivelyDropped: boolean;
  /** True if the project is dropped */
  dropped: boolean;
  /** The number of direct children of this project */
  numberOfTasks: number;
  /** The number of available direct children of this project */
  numberOfAvailableTasks: number;
  /** The number of completed direct children of this project */
  numberOfCompletedTasks: number;
}

/** Input for creating a Project */
export interface ProjectCreateInput {
  /** The name of the project */
  name?: string;
  /** The note of the project */
  note?: string;
  /** The status of the project */
  status?: ProjectStatus;
  /** True if flagged */
  flagged?: boolean;
  /** When the project should become available for action */
  deferDate?: Date;
  /** The date at which work for this project is intended */
  plannedDate?: Date;
  /** When the project must be finished */
  dueDate?: Date;
  /** The project's date of completion */
  completionDate?: Date;
  /** The date the project was dropped */
  droppedDate?: Date;
  /** When the project was created */
  creationDate?: Date;
  /** When the project was last reviewed */
  lastReviewDate?: Date;
  /** When the project should next be reviewed */
  nextReviewDate?: Date;
  /** The estimated time, in whole minutes, that this project will take to finish */
  estimatedMinutes?: number;
  /** If true, any children are sequentially dependent */
  sequential?: boolean;
  /** If true, complete when children are completed */
  completedByChildren?: boolean;
  /** True if the project contains singleton actions */
  singletonActionHolder?: boolean;
  /** True if the project is the default holder of singleton actions */
  defaultSingletonActionHolder?: boolean;
}

/** Input for updating a Project */
export type ProjectUpdateInput = Partial<ProjectCreateInput>;

/** A group of projects and sub-folders representing an area of responsibility */
export interface Folder {
  /** The unique identifier of the folder */
  id: string;
  /** The name of the folder */
  name: string;
  /** The note of the folder */
  note: string;
  /** Set if the folder is currently hidden */
  hidden: boolean;
  /** Set if the folder is currently hidden or any of its container folders are hidden */
  effectivelyHidden: boolean;
  /** When the folder was created */
  creationDate: Date;
  /** When the folder was last modified */
  modificationDate: Date;
}

/** Input for creating a Folder */
export interface FolderCreateInput {
  /** The name of the folder */
  name?: string;
  /** The note of the folder */
  note?: string;
  /** Set if the folder is currently hidden */
  hidden?: boolean;
}

/** Input for updating a Folder */
export type FolderUpdateInput = Partial<FolderCreateInput>;

/** A tag for organizing and filtering tasks */
export interface Tag {
  /** The unique identifier of the tag */
  id: string;
  /** The name of the tag */
  name: string;
  /** The note of the tag */
  note: string;
  /** If false, tasks associated with this tag will be skipped when determining the next action for a project */
  allowsNextAction: boolean;
  /** Set if the tag is currently hidden */
  hidden: boolean;
  /** Set if the tag is currently hidden or any of its container tags are hidden */
  effectivelyHidden: boolean;
  /** The number of available tasks */
  availableTaskCount: number;
  /** The number of remaining tasks */
  remainingTaskCount: number;
}

/** Input for creating a Tag */
export interface TagCreateInput {
  /** The name of the tag */
  name?: string;
  /** The note of the tag */
  note?: string;
  /** If false, tasks associated with this tag will be skipped when determining the next action for a project */
  allowsNextAction?: boolean;
  /** Set if the tag is currently hidden */
  hidden?: boolean;
}

/** Input for updating a Tag */
export type TagUpdateInput = Partial<TagCreateInput>;

/** A task that is in the document's inbox */
export interface InboxTask {
  /** The unique identifier of the inbox task */
  id: string;
  /** The name of the inbox task */
  name: string;
  /** The note of the inbox task */
  note: string;
  /** True if flagged */
  flagged: boolean;
  /** When the task should become available for action */
  deferDate: Date;
  /** When the task must be finished */
  dueDate: Date;
  /** When the task was created */
  creationDate: Date;
}

/** Input for creating a InboxTask */
export interface InboxTaskCreateInput {
  /** The name of the inbox task */
  name?: string;
  /** The note of the inbox task */
  note?: string;
  /** True if flagged */
  flagged?: boolean;
  /** When the task should become available for action */
  deferDate?: Date;
  /** When the task must be finished */
  dueDate?: Date;
  /** When the task was created */
  creationDate?: Date;
}

/** Input for updating a InboxTask */
export type InboxTaskUpdateInput = Partial<InboxTaskCreateInput>;

/** A saved view or filter configuration */
export interface Perspective {
  /** The unique identifier of the perspective */
  id: string;
  /** The name of the perspective */
  name: string;
}

/** Input for creating a Perspective */
export interface PerspectiveCreateInput {
}

/** Input for updating a Perspective */
export type PerspectiveUpdateInput = Partial<PerspectiveCreateInput>;

// Zod schemas for runtime validation

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
});

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
});

export const FolderSchema = z.object({
  id: z.string(),
  name: z.string(),
  note: z.string(),
  hidden: z.boolean(),
  effectivelyHidden: z.boolean(),
  creationDate: z.string(),
  modificationDate: z.string(),
});

export const TagSchema = z.object({
  id: z.string(),
  name: z.string(),
  note: z.string(),
  allowsNextAction: z.boolean(),
  hidden: z.boolean(),
  effectivelyHidden: z.boolean(),
  availableTaskCount: z.number(),
  remainingTaskCount: z.number(),
});

export const InboxTaskSchema = z.object({
  id: z.string(),
  name: z.string(),
  note: z.string(),
  flagged: z.boolean(),
  deferDate: z.string(),
  dueDate: z.string(),
  creationDate: z.string(),
});

export const PerspectiveSchema = z.object({
  id: z.string(),
  name: z.string(),
});
