/**
 * Type definitions for the SDK.
 * Auto-generated - do not edit.
 */

import { z } from 'zod'

export type { TaskType } from './contract/index.js'

export type { TaskStatus } from './contract/index.js'

export type { ResourceType } from './contract/index.js'

export type { DependencyType } from './contract/index.js'

export type { SchedulingGranularity } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Project } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type ProjectCreateInput = import('./contract/index.js').ProjectCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type ProjectUpdateInput = import('./contract/index.js').ProjectUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Task } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type TaskCreateInput = Omit<import('./contract/index.js').TaskCreateInput, 'priority'> & {
  /** Priority of this task Numeric values are validated by the contract before dispatch. */
  priority?: number | Extract<import('./contract/index.js').TaskCreateInput['priority'], null>
}

/** Canonical update input, retaining checked numeric conveniences. */
export type TaskUpdateInput = Omit<import('./contract/index.js').TaskUpdateInput, 'priority'> & {
  /** Priority of this task Numeric values are validated by the contract before dispatch. */
  priority?: number | Extract<import('./contract/index.js').TaskUpdateInput['priority'], null>
}

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Milestone } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type MilestoneCreateInput = import('./contract/index.js').MilestoneCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type MilestoneUpdateInput = import('./contract/index.js').MilestoneUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Resource } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type ResourceCreateInput = import('./contract/index.js').ResourceCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type ResourceUpdateInput = import('./contract/index.js').ResourceUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Assignment } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type AssignmentCreateInput = import('./contract/index.js').AssignmentCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type AssignmentUpdateInput = import('./contract/index.js').AssignmentUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Dependency } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type DependencyCreateInput = import('./contract/index.js').DependencyCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type DependencyUpdateInput = import('./contract/index.js').DependencyUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Violation } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type ViolationCreateInput = import('./contract/index.js').ViolationCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type ViolationUpdateInput = import('./contract/index.js').ViolationUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Scenario } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type ScenarioCreateInput = import('./contract/index.js').ScenarioCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type ScenarioUpdateInput = import('./contract/index.js').ScenarioUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Schedule } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type ScheduleCreateInput = import('./contract/index.js').ScheduleCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type ScheduleUpdateInput = import('./contract/index.js').ScheduleUpdateInput

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Currency } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type CurrencyCreateInput = import('./contract/index.js').CurrencyCreateInput

/** Canonical update input, retaining checked numeric conveniences. */
export type CurrencyUpdateInput = import('./contract/index.js').CurrencyUpdateInput

// Raw/passthrough response validators retained for explicit raw RPC consumers. SDK records use the contract codecs.

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
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

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
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

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const MilestoneSchema = z.object({
  id: z.number(),
  name: z.string(),
  startingDate: z.string(),
  note: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
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

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const AssignmentSchema = z.object({
  units: z.number(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const DependencySchema = z.object({
  dependencyType: z.string(),
  leadTime: z.number(),
  leadPercentage: z.number(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const ViolationSchema = z.object({
  violationType: z.string(),
  shortDescription: z.string(),
  html: z.string(),
})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
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

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const ScheduleSchema = z.object({})

/** Raw passthrough validator; typed SDK records use the canonical contract codec. */
export const CurrencySchema = z.object({
  code: z.string(),
  name: z.string(),
  symbol: z.string(),
})
