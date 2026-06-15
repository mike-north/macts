/**
 * Type definitions for the SDK.
 * Auto-generated - do not edit.
 */

import { z } from 'zod'

/** Type of task */
export type TaskType = 'standardTask' | 'milestoneTask' | 'groupTask' | 'hammockTask'

/** Status of a task */
export type TaskStatus = 'ok' | 'closeToDueDate' | 'dueNow' | 'pastDue' | 'finished'

/** Type of resource */
export type ResourceType = 'person' | 'equipment' | 'material' | 'resourceGroup'

/** Type of dependency between tasks */
export type DependencyType = 'startstart' | 'startfinish' | 'finishstart' | 'finishfinish'

/** Granularity for task scheduling */
export type SchedulingGranularity = 'exactScheduling' | 'hourlyScheduling' | 'dailyScheduling'

/** An OmniPlan project */
export interface Project {
  /** The unique identifier for the project */
  id: string
  /** The project's name */
  name: string
  /** The date on which work can begin */
  startingDate: Date
  /** The date on which work is complete */
  endingDate: Date
  /** The cost of the entire project */
  totalCost: number
  /** The percentage of the project which is complete (1.0 = 100%) */
  completed: number
  /** The total duration of the project in seconds */
  duration: number
  /** The number of person-seconds required to complete the project */
  effort: number
}

/** Input for creating a Project */
export interface ProjectCreateInput {
  /** The date on which work can begin */
  startingDate?: Date
}

/** Input for updating a Project */
export type ProjectUpdateInput = Partial<ProjectCreateInput>

/** A task within an OmniPlan project */
export interface Task {
  /** Internal identifier for this task */
  id: number
  /** The name of the task */
  name: string
  /** The date on which work begins */
  startingDate: Date
  /** The date on which work ends */
  endingDate: Date
  /** The number of working seconds occupied by task */
  duration: number
  /** The number of person-seconds required to perform the task */
  effort: number
  /** The percentage of the task which is complete (1.0 = 100%) */
  completed: number
  /** The person-seconds completed */
  completedEffort: number
  /** The person-seconds remaining */
  remainingEffort: number
  /** Priority of this task */
  priority: number
  /** The status of the current task */
  taskStatus: TaskStatus
  /** Whether this task is a standard task, milestone, group, or hammock */
  taskType: TaskType
  /** Cost for this task itself */
  staticCost: number
  /** Cost for paying resources assigned to this task */
  resourceCost: number
  /** Total cost for this task */
  totalCost: number
  /** The depth or level of this task in the project hierarchy */
  outlineDepth: number
  /** The hierarchical or WBS number of this task */
  outlineNumber: string
  /** The earliest date this task may start */
  startingConstraintDate: Date
  /** The latest date this task may end */
  endingConstraintDate: Date
  /** Whether the start date is locked or not */
  startingDateLocked: boolean
  /** Whether the end date is locked or not */
  endingDateLocked: boolean
  /** Notes */
  note: string
}

/** Input for creating a Task */
export interface TaskCreateInput {
  /** Task name */
  name: string
  /** Start date */
  startingDate?: Date
  /** The date on which work ends */
  endingDate?: Date
  /** Duration in seconds */
  duration?: number
  /** The number of person-seconds required to perform the task */
  effort?: number
  /** The percentage of the task which is complete (1.0 = 100%) */
  completed?: number
  /** The person-seconds completed */
  completedEffort?: number
  /** Priority of this task */
  priority?: number
  /** Whether this task is a standard task, milestone, group, or hammock */
  taskType?: TaskType
  /** Cost for this task itself */
  staticCost?: number
  /** The earliest date this task may start */
  startingConstraintDate?: Date
  /** The latest date this task may end */
  endingConstraintDate?: Date
  /** Whether the start date is locked or not */
  startingDateLocked?: boolean
  /** Whether the end date is locked or not */
  endingDateLocked?: boolean
  /** Notes */
  note?: string
}

/** Input for updating a Task */
export type TaskUpdateInput = Partial<TaskCreateInput>

/** A milestone (zero-duration marker task) */
export interface Milestone {
  /** Internal identifier for this milestone */
  id: number
  /** The name of the milestone */
  name: string
  /** The date of the milestone */
  startingDate: Date
  /** Notes */
  note: string
}

/** Input for creating a Milestone */
export interface MilestoneCreateInput {
  /** Milestone name */
  name: string
  /** Milestone date */
  startingDate?: Date
  /** Notes */
  note?: string
}

/** Input for updating a Milestone */
export type MilestoneUpdateInput = Partial<MilestoneCreateInput>

/** A resource (person, equipment, or material) */
export interface Resource {
  /** Internal identifier for this resource */
  id: number
  /** The name of the resource */
  name: string
  /** Type of the resource */
  resourceType: ResourceType
  /** The total number of units for this resource (1.0 = 100%) */
  number: number
  /** Email address for this resource */
  emailAddress: string
  /** The fixed cost per use of this resource */
  costPerUse: number
  /** The cost per hour of this resource */
  costPerHour: number
  /** Resource efficiency (1.0 = 100%) */
  efficiency: number
  /** Total number of uses of this resource */
  totalUses: number
  /** Total seconds worked by this resource */
  totalSeconds: number
  /** Total cost of all assignments for this resource */
  totalCost: number
  /** Notes */
  note: string
  /** The depth or level of this resource in the hierarchy */
  outlineDepth: number
}

/** Input for creating a Resource */
export interface ResourceCreateInput {
  /** Resource name */
  name: string
  /** Resource type */
  resourceType?: ResourceType
  /** The total number of units for this resource (1.0 = 100%) */
  number?: number
  /** Email address for this resource */
  emailAddress?: string
  /** The fixed cost per use of this resource */
  costPerUse?: number
  /** The cost per hour of this resource */
  costPerHour?: number
  /** Resource efficiency (1.0 = 100%) */
  efficiency?: number
  /** Notes */
  note?: string
}

/** Input for updating a Resource */
export type ResourceUpdateInput = Partial<ResourceCreateInput>

/** An assignment of a resource to a task */
export interface Assignment {
  /** Units of the resource required for this task (1.0 = 100%) */
  units: number
}

/** Input for creating a Assignment */
export interface AssignmentCreateInput {
  /** Units of the resource required for this task (1.0 = 100%) */
  units?: number
}

/** Input for updating a Assignment */
export type AssignmentUpdateInput = Partial<AssignmentCreateInput>

/** A dependency of one task upon another task */
export interface Dependency {
  /** Type of dependency */
  dependencyType: DependencyType
  /** The number of seconds of lead time required between the tasks */
  leadTime: number
  /** The lead time, in percentage of the length of the prerequisite */
  leadPercentage: number
}

/** Input for creating a Dependency */
export interface DependencyCreateInput {
  /** Type of dependency */
  dependencyType?: DependencyType
  /** The number of seconds of lead time required between the tasks */
  leadTime?: number
  /** The lead time, in percentage of the length of the prerequisite */
  leadPercentage?: number
}

/** Input for updating a Dependency */
export type DependencyUpdateInput = Partial<DependencyCreateInput>

/** A scheduling conflict or issue */
export interface Violation {
  /** The type of violation */
  violationType: string
  /** The short description of this violation */
  shortDescription: string
  /** The long description HTML for this violation */
  html: string
}

/** Input for creating a Violation */
export type ViolationCreateInput = Record<string, never>

/** Input for updating a Violation */
export type ViolationUpdateInput = Partial<ViolationCreateInput>

/** An alternative project plan */
export interface Scenario {
  /** The unique identifier for the scenario */
  id: string
  /** The name of the scenario */
  name: string
  /** The date on which work can begin */
  startingDate: Date
  /** The date on which work is complete */
  endingDate: Date
  /** The cost of the entire project */
  totalCost: number
  /** The percentage complete (1.0 = 100%) */
  completed: number
  /** The total duration in seconds */
  duration: number
  /** The number of person-seconds required */
  effort: number
  /** Number of violations in the scenario */
  violationCount: number
  /** Scheduling granularity for this scenario */
  schedulingGranularity: SchedulingGranularity
}

/** Input for creating a Scenario */
export interface ScenarioCreateInput {
  /** The name of the scenario */
  name?: string
  /** The date on which work can begin */
  startingDate?: Date
  /** Scheduling granularity for this scenario */
  schedulingGranularity?: SchedulingGranularity
}

/** Input for updating a Scenario */
export type ScenarioUpdateInput = Partial<ScenarioCreateInput>

/** A schedule of working time */
export type Schedule = Record<string, never>

/** Input for creating a Schedule */
export type ScheduleCreateInput = Record<string, never>

/** Input for updating a Schedule */
export type ScheduleUpdateInput = Partial<ScheduleCreateInput>

/** A locale based currency object */
export interface Currency {
  /** Locale code for this currency */
  code: string
  /** Name for this currency */
  name: string
  /** Symbol for this currency */
  symbol: string
}

/** Input for creating a Currency */
export type CurrencyCreateInput = Record<string, never>

/** Input for updating a Currency */
export type CurrencyUpdateInput = Partial<CurrencyCreateInput>

// Zod schemas for runtime validation

export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  startingDate: z.string(),
  endingDate: z.string(),
  totalCost: z.number(),
  completed: z.number(),
  duration: z.number(),
  effort: z.number(),
})

export const TaskSchema = z.object({
  id: z.number(),
  name: z.string(),
  startingDate: z.string(),
  endingDate: z.string(),
  duration: z.number(),
  effort: z.number(),
  completed: z.number(),
  completedEffort: z.number(),
  remainingEffort: z.number(),
  priority: z.number(),
  taskStatus: z.string(),
  taskType: z.string(),
  staticCost: z.number(),
  resourceCost: z.number(),
  totalCost: z.number(),
  outlineDepth: z.number(),
  outlineNumber: z.string(),
  startingConstraintDate: z.string(),
  endingConstraintDate: z.string(),
  startingDateLocked: z.boolean(),
  endingDateLocked: z.boolean(),
  note: z.string(),
})

export const MilestoneSchema = z.object({
  id: z.number(),
  name: z.string(),
  startingDate: z.string(),
  note: z.string(),
})

export const ResourceSchema = z.object({
  id: z.number(),
  name: z.string(),
  resourceType: z.string(),
  number: z.number(),
  emailAddress: z.string(),
  costPerUse: z.number(),
  costPerHour: z.number(),
  efficiency: z.number(),
  totalUses: z.number(),
  totalSeconds: z.number(),
  totalCost: z.number(),
  note: z.string(),
  outlineDepth: z.number(),
})

export const AssignmentSchema = z.object({
  units: z.number(),
})

export const DependencySchema = z.object({
  dependencyType: z.string(),
  leadTime: z.number(),
  leadPercentage: z.number(),
})

export const ViolationSchema = z.object({
  violationType: z.string(),
  shortDescription: z.string(),
  html: z.string(),
})

export const ScenarioSchema = z.object({
  id: z.string(),
  name: z.string(),
  startingDate: z.string(),
  endingDate: z.string(),
  totalCost: z.number(),
  completed: z.number(),
  duration: z.number(),
  effort: z.number(),
  violationCount: z.number(),
  schedulingGranularity: z.string(),
})

export const ScheduleSchema = z.object({})

export const CurrencySchema = z.object({
  code: z.string(),
  name: z.string(),
  symbol: z.string(),
})
