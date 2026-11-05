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
export type { ProjectCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { ProjectUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Task } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type TaskCreateInput = Omit<import('./contract/index.js').TaskCreateInput, 'priority'> & {
  /** Priority of this task Numeric values are validated by the contract before dispatch. */
  priority?: null extends import('./contract/index.js').TaskCreateInput['priority']
    ? number | null
    : number
}

/** Canonical update input, retaining checked numeric conveniences. */
export type TaskUpdateInput = Omit<import('./contract/index.js').TaskUpdateInput, 'priority'> & {
  /** Priority of this task Numeric values are validated by the contract before dispatch. */
  priority?: null extends import('./contract/index.js').TaskUpdateInput['priority']
    ? number | null
    : number
}

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Milestone } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { MilestoneCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { MilestoneUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Resource } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { ResourceCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { ResourceUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Assignment } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { AssignmentCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { AssignmentUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Dependency } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { DependencyCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { DependencyUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Violation } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { ViolationCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { ViolationUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Scenario } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { ScenarioCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { ScenarioUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Schedule } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { ScheduleCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { ScheduleUpdateInput } from './contract/index.js'

/** Canonical SDK record; typed operations decode through the app contract. */
export type { Currency } from './contract/index.js'

/** Canonical create input, retaining checked numeric conveniences. */
export type { CurrencyCreateInput } from './contract/index.js'

/** Canonical update input, retaining checked numeric conveniences. */
export type { CurrencyUpdateInput } from './contract/index.js'

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
