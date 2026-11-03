/**
 * The OmniPlan contract: the transport-neutral description of every
 * OmniPlan operation.
 *
 * It declares the types callers work with (records, create and update inputs,
 * enums, and the `OmniPlanClient` interface) and one descriptor per operation:
 * its identity, the permission it requires, and the value types of its input
 * and result. Its resource table tells references how to identify and resolve
 * the objects they point to.
 *
 * The contract performs no I/O. A client is created from it by a client
 * factory from `@macts/sdk`, local or remote, which supplies the runtime that
 * `bind` turns into a `OmniPlanClient`; application code changes locality by
 * changing the factory, not the contract.
 *
 * Generated from the OmniPlan manifest; do not edit.
 *
 * @packageDocumentation
 */

import {
  ValueTypes,
  type AppContract,
  type CallOptions,
  type ClientBrand,
  type ClientRuntime,
  type Integer,
  type OperationDescriptor,
  type Page,
  type ResourceDescriptor,
  type ValueType,
} from '@macts/contracts'

const t = ValueTypes

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
  /**
   * The unique identifier for the project.
   * Never null: the primary identifier.
   */
  readonly id: string
  /**
   * The project's name.
   * Nullable. No evidence that the app always sets it.
   */
  readonly name: string | null
  /**
   * The date on which work can begin.
   * Nullable. No evidence that the app always sets it.
   */
  startingDate: Date | null
  /**
   * The date on which work is complete.
   * Nullable. No evidence that the app always sets it.
   */
  readonly endingDate: Date | null
  /**
   * The cost of the entire project.
   * Nullable. No evidence that the app always sets it.
   */
  readonly totalCost: number | null
  /**
   * The percentage of the project which is complete (1.0 = 100%).
   * Nullable. No evidence that the app always sets it.
   */
  readonly completed: number | null
  /**
   * The total duration of the project in seconds.
   * Nullable. No evidence that the app always sets it.
   */
  readonly duration: number | null
  /**
   * The number of person-seconds required to complete the project.
   * Nullable. No evidence that the app always sets it.
   */
  readonly effort: number | null
}

/** A task within an OmniPlan project */
export interface Task {
  /**
   * Internal identifier for this task.
   * Never null: the primary identifier.
   */
  readonly id: Integer
  /**
   * The name of the task.
   * Nullable. No evidence that the app always sets it.
   */
  name: string | null
  /**
   * The date on which work begins.
   * Nullable. No evidence that the app always sets it.
   */
  startingDate: Date | null
  /**
   * The date on which work ends.
   * Nullable. No evidence that the app always sets it.
   */
  endingDate: Date | null
  /**
   * The number of working seconds occupied by task.
   * Nullable. No evidence that the app always sets it.
   */
  duration: number | null
  /**
   * The number of person-seconds required to perform the task.
   * Nullable. No evidence that the app always sets it.
   */
  effort: number | null
  /**
   * The percentage of the task which is complete (1.0 = 100%).
   * Nullable. No evidence that the app always sets it.
   */
  completed: number | null
  /**
   * The person-seconds completed.
   * Nullable. No evidence that the app always sets it.
   */
  completedEffort: number | null
  /**
   * The person-seconds remaining.
   * Nullable. No evidence that the app always sets it.
   */
  readonly remainingEffort: number | null
  /**
   * Priority of this task.
   * Nullable. No evidence that the app always sets it.
   */
  priority: Integer | null
  /**
   * The status of the current task.
   * Nullable. No evidence that the app always sets it.
   */
  readonly taskStatus: TaskStatus | null
  /**
   * Whether this task is a standard task, milestone, group, or hammock.
   * Nullable. No evidence that the app always sets it.
   */
  taskType: TaskType | null
  /**
   * Cost for this task itself.
   * Nullable. No evidence that the app always sets it.
   */
  staticCost: number | null
  /**
   * Cost for paying resources assigned to this task.
   * Nullable. No evidence that the app always sets it.
   */
  readonly resourceCost: number | null
  /**
   * Total cost for this task.
   * Nullable. No evidence that the app always sets it.
   */
  readonly totalCost: number | null
  /**
   * The depth or level of this task in the project hierarchy.
   * Nullable. No evidence that the app always sets it.
   */
  readonly outlineDepth: Integer | null
  /**
   * The hierarchical or WBS number of this task.
   * Nullable. No evidence that the app always sets it.
   */
  readonly outlineNumber: string | null
  /**
   * The earliest date this task may start.
   * Nullable. No evidence that the app always sets it.
   */
  startingConstraintDate: Date | null
  /**
   * The latest date this task may end.
   * Nullable. No evidence that the app always sets it.
   */
  endingConstraintDate: Date | null
  /**
   * Whether the start date is locked or not.
   * Nullable. No evidence that the app always sets it.
   */
  startingDateLocked: boolean | null
  /**
   * Whether the end date is locked or not.
   * Nullable. No evidence that the app always sets it.
   */
  endingDateLocked: boolean | null
  /**
   * Notes.
   * Nullable. No evidence that the app always sets it.
   */
  note: string | null
}

/** A milestone (zero-duration marker task) */
export interface Milestone {
  /**
   * Internal identifier for this milestone.
   * Never null: the primary identifier.
   */
  readonly id: Integer
  /**
   * The name of the milestone.
   * Nullable. No evidence that the app always sets it.
   */
  name: string | null
  /**
   * The date of the milestone.
   * Nullable. No evidence that the app always sets it.
   */
  startingDate: Date | null
  /**
   * Notes.
   * Nullable. No evidence that the app always sets it.
   */
  note: string | null
}

/** A resource (person, equipment, or material) */
export interface Resource {
  /**
   * Internal identifier for this resource.
   * Never null: the primary identifier.
   */
  readonly id: Integer
  /**
   * The name of the resource.
   * Nullable. No evidence that the app always sets it.
   */
  name: string | null
  /**
   * Type of the resource.
   * Nullable. No evidence that the app always sets it.
   */
  resourceType: ResourceType | null
  /**
   * The total number of units for this resource (1.0 = 100%).
   * Nullable. No evidence that the app always sets it.
   */
  number: number | null
  /**
   * Email address for this resource.
   * Nullable. No evidence that the app always sets it.
   */
  emailAddress: string | null
  /**
   * The fixed cost per use of this resource.
   * Nullable. No evidence that the app always sets it.
   */
  costPerUse: number | null
  /**
   * The cost per hour of this resource.
   * Nullable. No evidence that the app always sets it.
   */
  costPerHour: number | null
  /**
   * Resource efficiency (1.0 = 100%).
   * Nullable. No evidence that the app always sets it.
   */
  efficiency: number | null
  /**
   * Total number of uses of this resource.
   * Nullable. No evidence that the app always sets it.
   */
  readonly totalUses: Integer | null
  /**
   * Total seconds worked by this resource.
   * Nullable. No evidence that the app always sets it.
   */
  readonly totalSeconds: number | null
  /**
   * Total cost of all assignments for this resource.
   * Nullable. No evidence that the app always sets it.
   */
  readonly totalCost: number | null
  /**
   * Notes.
   * Nullable. No evidence that the app always sets it.
   */
  note: string | null
  /**
   * The depth or level of this resource in the hierarchy.
   * Nullable. No evidence that the app always sets it.
   */
  readonly outlineDepth: Integer | null
}

/** An assignment of a resource to a task */
export interface Assignment {
  /**
   * Units of the resource required for this task (1.0 = 100%).
   * Nullable. No evidence that the app always sets it.
   */
  units: number | null
}

/** A dependency of one task upon another task */
export interface Dependency {
  /**
   * Type of dependency.
   * Nullable. No evidence that the app always sets it.
   */
  dependencyType: DependencyType | null
  /**
   * The number of seconds of lead time required between the tasks.
   * Nullable. No evidence that the app always sets it.
   */
  leadTime: number | null
  /**
   * The lead time, in percentage of the length of the prerequisite.
   * Nullable. No evidence that the app always sets it.
   */
  leadPercentage: number | null
}

/** A scheduling conflict or issue */
export interface Violation {
  /**
   * The type of violation.
   * Nullable. No evidence that the app always sets it.
   */
  readonly violationType: string | null
  /**
   * The short description of this violation.
   * Nullable. No evidence that the app always sets it.
   */
  readonly shortDescription: string | null
  /**
   * The long description HTML for this violation.
   * Nullable. No evidence that the app always sets it.
   */
  readonly html: string | null
}

/** An alternative project plan */
export interface Scenario {
  /**
   * The unique identifier for the scenario.
   * Never null: the primary identifier.
   */
  readonly id: string
  /**
   * The name of the scenario.
   * Nullable. No evidence that the app always sets it.
   */
  name: string | null
  /**
   * The date on which work can begin.
   * Nullable. No evidence that the app always sets it.
   */
  startingDate: Date | null
  /**
   * The date on which work is complete.
   * Nullable. No evidence that the app always sets it.
   */
  readonly endingDate: Date | null
  /**
   * The cost of the entire project.
   * Nullable. No evidence that the app always sets it.
   */
  readonly totalCost: number | null
  /**
   * The percentage complete (1.0 = 100%).
   * Nullable. No evidence that the app always sets it.
   */
  readonly completed: number | null
  /**
   * The total duration in seconds.
   * Nullable. No evidence that the app always sets it.
   */
  readonly duration: number | null
  /**
   * The number of person-seconds required.
   * Nullable. No evidence that the app always sets it.
   */
  readonly effort: number | null
  /**
   * Number of violations in the scenario.
   * Nullable. No evidence that the app always sets it.
   */
  readonly violationCount: Integer | null
  /**
   * Scheduling granularity for this scenario.
   * Nullable. No evidence that the app always sets it.
   */
  schedulingGranularity: SchedulingGranularity | null
}

/** A schedule of working time */
export type Schedule = Record<string, never>

/** A locale based currency object */
export interface Currency {
  /**
   * Locale code for this currency.
   * Nullable. No evidence that the app always sets it.
   */
  readonly code: string | null
  /**
   * Name for this currency.
   * Nullable. No evidence that the app always sets it.
   */
  readonly name: string | null
  /**
   * Symbol for this currency.
   * Nullable. No evidence that the app always sets it.
   */
  readonly symbol: string | null
}

/** Input for creating a Project. */
export interface ProjectCreateInput {
  /** The date on which work can begin */
  startingDate?: Date
}

/** Input for updating a Project. Omitted fields are left unchanged. */
export interface ProjectUpdateInput {
  /**
   * The date on which work can begin.
   * Cannot be reset: null is rejected.
   */
  startingDate?: Date
}

/** Input for creating a Task. */
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
  priority?: Integer
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

/** Input for updating a Task. Omitted fields are left unchanged. */
export interface TaskUpdateInput {
  /**
   * Task name.
   * Cannot be reset: null is rejected.
   */
  name?: string
  /**
   * Start date.
   * Cannot be reset: null is rejected.
   */
  startingDate?: Date
  /**
   * The date on which work ends.
   * Cannot be reset: null is rejected.
   */
  endingDate?: Date
  /**
   * Duration in seconds.
   * Cannot be reset: null is rejected.
   */
  duration?: number
  /**
   * The number of person-seconds required to perform the task.
   * Cannot be reset: null is rejected.
   */
  effort?: number
  /**
   * The percentage of the task which is complete (1.0 = 100%).
   * Cannot be reset: null is rejected.
   */
  completed?: number
  /**
   * The person-seconds completed.
   * Cannot be reset: null is rejected.
   */
  completedEffort?: number
  /**
   * Priority of this task.
   * Cannot be reset: null is rejected.
   */
  priority?: Integer
  /**
   * Whether this task is a standard task, milestone, group, or hammock.
   * Cannot be reset: null is rejected.
   */
  taskType?: TaskType
  /**
   * Cost for this task itself.
   * Cannot be reset: null is rejected.
   */
  staticCost?: number
  /**
   * The earliest date this task may start.
   * Cannot be reset: null is rejected.
   */
  startingConstraintDate?: Date
  /**
   * The latest date this task may end.
   * Cannot be reset: null is rejected.
   */
  endingConstraintDate?: Date
  /**
   * Whether the start date is locked or not.
   * Cannot be reset: null is rejected.
   */
  startingDateLocked?: boolean
  /**
   * Whether the end date is locked or not.
   * Cannot be reset: null is rejected.
   */
  endingDateLocked?: boolean
  /**
   * Notes.
   * Cannot be reset: null is rejected.
   */
  note?: string
}

/** Input for creating a Milestone. */
export interface MilestoneCreateInput {
  /** Milestone name */
  name: string
  /** Milestone date */
  startingDate?: Date
  /** Notes */
  note?: string
}

/** Input for updating a Milestone. Omitted fields are left unchanged. */
export interface MilestoneUpdateInput {
  /**
   * Milestone name.
   * Cannot be reset: null is rejected.
   */
  name?: string
  /**
   * Milestone date.
   * Cannot be reset: null is rejected.
   */
  startingDate?: Date
  /**
   * Notes.
   * Cannot be reset: null is rejected.
   */
  note?: string
}

/** Input for creating a Resource. */
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

/** Input for updating a Resource. Omitted fields are left unchanged. */
export interface ResourceUpdateInput {
  /**
   * Resource name.
   * Cannot be reset: null is rejected.
   */
  name?: string
  /**
   * Resource type.
   * Cannot be reset: null is rejected.
   */
  resourceType?: ResourceType
  /**
   * The total number of units for this resource (1.0 = 100%).
   * Cannot be reset: null is rejected.
   */
  number?: number
  /**
   * Email address for this resource.
   * Cannot be reset: null is rejected.
   */
  emailAddress?: string
  /**
   * The fixed cost per use of this resource.
   * Cannot be reset: null is rejected.
   */
  costPerUse?: number
  /**
   * The cost per hour of this resource.
   * Cannot be reset: null is rejected.
   */
  costPerHour?: number
  /**
   * Resource efficiency (1.0 = 100%).
   * Cannot be reset: null is rejected.
   */
  efficiency?: number
  /**
   * Notes.
   * Cannot be reset: null is rejected.
   */
  note?: string
}

/** Input for creating an Assignment. */
export interface AssignmentCreateInput {
  /** Units of the resource required for this task (1.0 = 100%) */
  units?: number
}

/** Input for updating an Assignment. Omitted fields are left unchanged. */
export interface AssignmentUpdateInput {
  /**
   * Units of the resource required for this task (1.0 = 100%).
   * Cannot be reset: null is rejected.
   */
  units?: number
}

/** Input for creating a Dependency. */
export interface DependencyCreateInput {
  /** Type of dependency */
  dependencyType?: DependencyType
  /** The number of seconds of lead time required between the tasks */
  leadTime?: number
  /** The lead time, in percentage of the length of the prerequisite */
  leadPercentage?: number
}

/** Input for updating a Dependency. Omitted fields are left unchanged. */
export interface DependencyUpdateInput {
  /**
   * Type of dependency.
   * Cannot be reset: null is rejected.
   */
  dependencyType?: DependencyType
  /**
   * The number of seconds of lead time required between the tasks.
   * Cannot be reset: null is rejected.
   */
  leadTime?: number
  /**
   * The lead time, in percentage of the length of the prerequisite.
   * Cannot be reset: null is rejected.
   */
  leadPercentage?: number
}

/** Input for creating a Violation. */
export type ViolationCreateInput = Record<string, never>

/** Input for updating a Violation. Omitted fields are left unchanged. */
export type ViolationUpdateInput = Record<string, never>

/** Input for creating a Scenario. */
export interface ScenarioCreateInput {
  /** The name of the scenario */
  name?: string
  /** The date on which work can begin */
  startingDate?: Date
  /** Scheduling granularity for this scenario */
  schedulingGranularity?: SchedulingGranularity
}

/** Input for updating a Scenario. Omitted fields are left unchanged. */
export interface ScenarioUpdateInput {
  /**
   * The name of the scenario.
   * Cannot be reset: null is rejected.
   */
  name?: string
  /**
   * The date on which work can begin.
   * Cannot be reset: null is rejected.
   */
  startingDate?: Date
  /**
   * Scheduling granularity for this scenario.
   * Cannot be reset: null is rejected.
   */
  schedulingGranularity?: SchedulingGranularity
}

/** Input for creating a Schedule. */
export type ScheduleCreateInput = Record<string, never>

/** Input for updating a Schedule. Omitted fields are left unchanged. */
export type ScheduleUpdateInput = Record<string, never>

/** Input for creating a Currency. */
export type CurrencyCreateInput = Record<string, never>

/** Input for updating a Currency. Omitted fields are left unchanged. */
export type CurrencyUpdateInput = Record<string, never>

/** An OmniPlan project */
export interface ProjectResourceClient {
  /** List projects, as one page holding all of them. */
  list(options?: CallOptions): Promise<Page<Project>>
  /**
   * Read the project identified by `id`.
   *
   * @param id - Project identifier. Does not accept null.
   */
  get(id: string, options?: CallOptions): Promise<Project>
}

/** A task within an OmniPlan project */
export interface TaskResourceClient {
  /** List tasks, as one page holding all of them. */
  list(options?: CallOptions): Promise<Page<Task>>
  /**
   * Read the task identified by `id`.
   *
   * @param id - Task identifier. Does not accept null.
   */
  get(id: Integer, options?: CallOptions): Promise<Task>
  /** Create a task. */
  create(input: TaskCreateInput, options?: CallOptions): Promise<Task>
}

/** A milestone (zero-duration marker task) */
export interface MilestoneResourceClient {
  /** List milestones, as one page holding all of them. */
  list(options?: CallOptions): Promise<Page<Milestone>>
  /**
   * Read the milestone identified by `id`.
   *
   * @param id - Milestone identifier. Does not accept null.
   */
  get(id: Integer, options?: CallOptions): Promise<Milestone>
  /** Create a milestone. */
  create(input: MilestoneCreateInput, options?: CallOptions): Promise<Milestone>
}

/** A resource (person, equipment, or material) */
export interface ResourceResourceClient {
  /** List resources, as one page holding all of them. */
  list(options?: CallOptions): Promise<Page<Resource>>
  /**
   * Read the resource identified by `id`.
   *
   * @param id - Resource identifier. Does not accept null.
   */
  get(id: Integer, options?: CallOptions): Promise<Resource>
  /** Create a resource. */
  create(input: ResourceCreateInput, options?: CallOptions): Promise<Resource>
}

/** An assignment of a resource to a task */
export interface AssignmentResourceClient {
  /** List assignments, as one page holding all of them. */
  list(options?: CallOptions): Promise<Page<Assignment>>
}

/** A dependency of one task upon another task */
export interface DependencyResourceClient {
  /** List dependencies, as one page holding all of them. */
  list(options?: CallOptions): Promise<Page<Dependency>>
}

/** A scheduling conflict or issue */
export interface ViolationResourceClient {
  /** List violations, as one page holding all of them. */
  list(options?: CallOptions): Promise<Page<Violation>>
  /** Fix a violation */
  fix(options?: CallOptions): Promise<void>
}

/** An alternative project plan */
export interface ScenarioResourceClient {
  /** List scenarios, as one page holding all of them. */
  list(options?: CallOptions): Promise<Page<Scenario>>
  /**
   * Read the scenario identified by `id`.
   *
   * @param id - Scenario identifier. Does not accept null.
   */
  get(id: string, options?: CallOptions): Promise<Scenario>
}

/**
 * The OmniPlan client: one namespace per resource that has operations, plus the app's own commands.
 * A client factory creates one from {@link omniPlanContract}. Its type carries the contract's
 * resource table, {@link OmniPlanResources}, so references can be bound to it by resource; the
 * brand has no runtime member.
 */
export interface OmniPlanClient extends ClientBrand<OmniPlanResources> {
  /** An OmniPlan project */
  readonly projects: ProjectResourceClient
  /** A task within an OmniPlan project */
  readonly tasks: TaskResourceClient
  /** A milestone (zero-duration marker task) */
  readonly milestones: MilestoneResourceClient
  /** A resource (person, equipment, or material) */
  readonly resources: ResourceResourceClient
  /** An assignment of a resource to a task */
  readonly assignments: AssignmentResourceClient
  /** A dependency of one task upon another task */
  readonly dependencies: DependencyResourceClient
  /** A scheduling conflict or issue */
  readonly violations: ViolationResourceClient
  /** An alternative project plan */
  readonly scenarios: ScenarioResourceClient
  /**
   * Export a document
   *
   * @param to - Export file path. Does not accept null.
   */
  _export(to: string, options?: CallOptions): Promise<void>
  /**
   * Assign resources to tasks
   *
   * @param resource - Resource to assign. Does not accept null.
   * @param task - Task to assign to. Does not accept null.
   */
  assign(resource: string, task: string, options?: CallOptions): Promise<void>
  /**
   * Create a dependency between tasks
   *
   * @param prerequisite - Prerequisite task. Does not accept null.
   * @param dependent - Dependent task. Does not accept null.
   */
  depend(prerequisite: string, dependent: string, options?: CallOptions): Promise<void>
  /** Commit the current schedule as the baseline schedule */
  baseline(options?: CallOptions): Promise<void>
  /** Level resources on project */
  level(options?: CallOptions): Promise<void>
  /**
   * Look up a task via a custom data key
   *
   * @param key - Custom data key. Does not accept null.
   */
  lookup(key: string, options?: CallOptions): Promise<void>
  /** Make a change tracking mark on project */
  changeMark(options?: CallOptions): Promise<void>
  /**
   * Add working hours to a schedule
   *
   * @param schedule - Target schedule. Does not accept null.
   */
  addWorkTime(schedule: string, options?: CallOptions): Promise<void>
  /**
   * Remove working hours from a schedule
   *
   * @param schedule - Target schedule. Does not accept null.
   */
  subtractWorkTime(schedule: string, options?: CallOptions): Promise<void>
  /** Undo the last command */
  undo(options?: CallOptions): Promise<void>
  /** Redo the last undone command */
  redo(options?: CallOptions): Promise<void>
}

/** The members of {@link TaskType}, for its value type. */
const taskTypeMembers = ['standardTask', 'milestoneTask', 'groupTask', 'hammockTask'] as const

/** The members of {@link TaskStatus}, for its value type. */
const taskStatusMembers = ['ok', 'closeToDueDate', 'dueNow', 'pastDue', 'finished'] as const

/** The members of {@link ResourceType}, for its value type. */
const resourceTypeMembers = ['person', 'equipment', 'material', 'resourceGroup'] as const

/** The members of {@link DependencyType}, for its value type. */
const dependencyTypeMembers = ['startstart', 'startfinish', 'finishstart', 'finishfinish'] as const

/** The members of {@link SchedulingGranularity}, for its value type. */
const schedulingGranularityMembers = [
  'exactScheduling',
  'hourlyScheduling',
  'dailyScheduling',
] as const

const projectRecordType: ValueType<Project> = t.record(
  {
    id: t.string({ description: 'The unique identifier for the project' }),
    name: t.nullable(t.string(), { description: "The project's name" }),
    startingDate: t.nullable(t.date(), { description: 'The date on which work can begin' }),
    endingDate: t.nullable(t.date(), { description: 'The date on which work is complete' }),
    totalCost: t.nullable(t.double(), { description: 'The cost of the entire project' }),
    completed: t.nullable(t.double(), {
      description: 'The percentage of the project which is complete (1.0 = 100%)',
    }),
    duration: t.nullable(t.double(), {
      description: 'The total duration of the project in seconds',
    }),
    effort: t.nullable(t.double(), {
      description: 'The number of person-seconds required to complete the project',
    }),
  },
  { description: 'An OmniPlan project' }
)

const taskRecordType: ValueType<Task> = t.record(
  {
    id: t.integer({ description: 'Internal identifier for this task' }),
    name: t.nullable(t.string(), { description: 'The name of the task' }),
    startingDate: t.nullable(t.date(), { description: 'The date on which work begins' }),
    endingDate: t.nullable(t.date(), { description: 'The date on which work ends' }),
    duration: t.nullable(t.double(), {
      description: 'The number of working seconds occupied by task',
    }),
    effort: t.nullable(t.double(), {
      description: 'The number of person-seconds required to perform the task',
    }),
    completed: t.nullable(t.double(), {
      description: 'The percentage of the task which is complete (1.0 = 100%)',
    }),
    completedEffort: t.nullable(t.double(), { description: 'The person-seconds completed' }),
    remainingEffort: t.nullable(t.double(), { description: 'The person-seconds remaining' }),
    priority: t.nullable(t.integer(), { description: 'Priority of this task' }),
    taskStatus: t.nullable(t.enumeration(taskStatusMembers), {
      description: 'The status of the current task',
    }),
    taskType: t.nullable(t.enumeration(taskTypeMembers), {
      description: 'Whether this task is a standard task, milestone, group, or hammock',
    }),
    staticCost: t.nullable(t.double(), { description: 'Cost for this task itself' }),
    resourceCost: t.nullable(t.double(), {
      description: 'Cost for paying resources assigned to this task',
    }),
    totalCost: t.nullable(t.double(), { description: 'Total cost for this task' }),
    outlineDepth: t.nullable(t.integer(), {
      description: 'The depth or level of this task in the project hierarchy',
    }),
    outlineNumber: t.nullable(t.string(), {
      description: 'The hierarchical or WBS number of this task',
    }),
    startingConstraintDate: t.nullable(t.date(), {
      description: 'The earliest date this task may start',
    }),
    endingConstraintDate: t.nullable(t.date(), {
      description: 'The latest date this task may end',
    }),
    startingDateLocked: t.nullable(t.boolean(), {
      description: 'Whether the start date is locked or not',
    }),
    endingDateLocked: t.nullable(t.boolean(), {
      description: 'Whether the end date is locked or not',
    }),
    note: t.nullable(t.string(), { description: 'Notes' }),
  },
  { description: 'A task within an OmniPlan project' }
)

const milestoneRecordType: ValueType<Milestone> = t.record(
  {
    id: t.integer({ description: 'Internal identifier for this milestone' }),
    name: t.nullable(t.string(), { description: 'The name of the milestone' }),
    startingDate: t.nullable(t.date(), { description: 'The date of the milestone' }),
    note: t.nullable(t.string(), { description: 'Notes' }),
  },
  { description: 'A milestone (zero-duration marker task)' }
)

const resourceRecordType: ValueType<Resource> = t.record(
  {
    id: t.integer({ description: 'Internal identifier for this resource' }),
    name: t.nullable(t.string(), { description: 'The name of the resource' }),
    resourceType: t.nullable(t.enumeration(resourceTypeMembers), {
      description: 'Type of the resource',
    }),
    number: t.nullable(t.double(), {
      description: 'The total number of units for this resource (1.0 = 100%)',
    }),
    emailAddress: t.nullable(t.string(), { description: 'Email address for this resource' }),
    costPerUse: t.nullable(t.double(), { description: 'The fixed cost per use of this resource' }),
    costPerHour: t.nullable(t.double(), { description: 'The cost per hour of this resource' }),
    efficiency: t.nullable(t.double(), { description: 'Resource efficiency (1.0 = 100%)' }),
    totalUses: t.nullable(t.integer(), { description: 'Total number of uses of this resource' }),
    totalSeconds: t.nullable(t.double(), { description: 'Total seconds worked by this resource' }),
    totalCost: t.nullable(t.double(), {
      description: 'Total cost of all assignments for this resource',
    }),
    note: t.nullable(t.string(), { description: 'Notes' }),
    outlineDepth: t.nullable(t.integer(), {
      description: 'The depth or level of this resource in the hierarchy',
    }),
  },
  { description: 'A resource (person, equipment, or material)' }
)

const assignmentRecordType: ValueType<Assignment> = t.record(
  {
    units: t.nullable(t.double(), {
      description: 'Units of the resource required for this task (1.0 = 100%)',
    }),
  },
  { description: 'An assignment of a resource to a task' }
)

const dependencyRecordType: ValueType<Dependency> = t.record(
  {
    dependencyType: t.nullable(t.enumeration(dependencyTypeMembers), {
      description: 'Type of dependency',
    }),
    leadTime: t.nullable(t.double(), {
      description: 'The number of seconds of lead time required between the tasks',
    }),
    leadPercentage: t.nullable(t.double(), {
      description: 'The lead time, in percentage of the length of the prerequisite',
    }),
  },
  { description: 'A dependency of one task upon another task' }
)

const violationRecordType: ValueType<Violation> = t.record(
  {
    violationType: t.nullable(t.string(), { description: 'The type of violation' }),
    shortDescription: t.nullable(t.string(), {
      description: 'The short description of this violation',
    }),
    html: t.nullable(t.string(), { description: 'The long description HTML for this violation' }),
  },
  { description: 'A scheduling conflict or issue' }
)

const scenarioRecordType: ValueType<Scenario> = t.record(
  {
    id: t.string({ description: 'The unique identifier for the scenario' }),
    name: t.nullable(t.string(), { description: 'The name of the scenario' }),
    startingDate: t.nullable(t.date(), { description: 'The date on which work can begin' }),
    endingDate: t.nullable(t.date(), { description: 'The date on which work is complete' }),
    totalCost: t.nullable(t.double(), { description: 'The cost of the entire project' }),
    completed: t.nullable(t.double(), { description: 'The percentage complete (1.0 = 100%)' }),
    duration: t.nullable(t.double(), { description: 'The total duration in seconds' }),
    effort: t.nullable(t.double(), { description: 'The number of person-seconds required' }),
    violationCount: t.nullable(t.integer(), {
      description: 'Number of violations in the scenario',
    }),
    schedulingGranularity: t.nullable(t.enumeration(schedulingGranularityMembers), {
      description: 'Scheduling granularity for this scenario',
    }),
  },
  { description: 'An alternative project plan' }
)

const taskCreateInputType: ValueType<TaskCreateInput> = t.record({
  name: t.string({ description: 'Task name' }),
  startingDate: t.optional(t.date({ description: 'Start date' })),
  endingDate: t.optional(t.date({ description: 'The date on which work ends' })),
  duration: t.optional(t.double({ description: 'Duration in seconds' })),
  effort: t.optional(
    t.double({ description: 'The number of person-seconds required to perform the task' })
  ),
  completed: t.optional(
    t.double({ description: 'The percentage of the task which is complete (1.0 = 100%)' })
  ),
  completedEffort: t.optional(t.double({ description: 'The person-seconds completed' })),
  priority: t.optional(t.integer({ description: 'Priority of this task' })),
  taskType: t.optional(
    t.enumeration(taskTypeMembers, {
      description: 'Whether this task is a standard task, milestone, group, or hammock',
    })
  ),
  staticCost: t.optional(t.double({ description: 'Cost for this task itself' })),
  startingConstraintDate: t.optional(
    t.date({ description: 'The earliest date this task may start' })
  ),
  endingConstraintDate: t.optional(t.date({ description: 'The latest date this task may end' })),
  startingDateLocked: t.optional(
    t.boolean({ description: 'Whether the start date is locked or not' })
  ),
  endingDateLocked: t.optional(t.boolean({ description: 'Whether the end date is locked or not' })),
  note: t.optional(t.string({ description: 'Notes' })),
})

const milestoneCreateInputType: ValueType<MilestoneCreateInput> = t.record({
  name: t.string({ description: 'Milestone name' }),
  startingDate: t.optional(t.date({ description: 'Milestone date' })),
  note: t.optional(t.string({ description: 'Notes' })),
})

const resourceCreateInputType: ValueType<ResourceCreateInput> = t.record({
  name: t.string({ description: 'Resource name' }),
  resourceType: t.optional(t.enumeration(resourceTypeMembers, { description: 'Resource type' })),
  number: t.optional(
    t.double({ description: 'The total number of units for this resource (1.0 = 100%)' })
  ),
  emailAddress: t.optional(t.string({ description: 'Email address for this resource' })),
  costPerUse: t.optional(t.double({ description: 'The fixed cost per use of this resource' })),
  costPerHour: t.optional(t.double({ description: 'The cost per hour of this resource' })),
  efficiency: t.optional(t.double({ description: 'Resource efficiency (1.0 = 100%)' })),
  note: t.optional(t.string({ description: 'Notes' })),
})

/**
 * The type of the resource table of {@link omniPlanContract}: every resource a
 * reference can name, keyed by manifest resource key, with its record type,
 * its identifier type (when it has one), the operations that resolve
 * references to it, and, for a resource the app finds only within another,
 * that parent resource. A client created from the contract carries it, so
 * `bindReference` admits only references the contract can resolve.
 */
export type OmniPlanResources = Readonly<{
  Project: ResourceDescriptor<Project, string> & {
    readonly id: ValueType<string>
    readonly get: 'omniplan.projects.get'
    readonly list: 'omniplan.projects.list'
  }
  Task: ResourceDescriptor<Task, Integer> & {
    readonly id: ValueType<Integer>
    readonly get: 'omniplan.tasks.get'
    readonly list: 'omniplan.tasks.list'
  }
  Milestone: ResourceDescriptor<Milestone, Integer> & {
    readonly id: ValueType<Integer>
    readonly get: 'omniplan.milestones.get'
    readonly list: 'omniplan.milestones.list'
  }
  Resource: ResourceDescriptor<Resource, Integer> & {
    readonly id: ValueType<Integer>
    readonly get: 'omniplan.resources.get'
    readonly list: 'omniplan.resources.list'
  }
  Assignment: ResourceDescriptor<Assignment> & { readonly list: 'omniplan.assignments.list' }
  Dependency: ResourceDescriptor<Dependency> & { readonly list: 'omniplan.dependencies.list' }
  Violation: ResourceDescriptor<Violation> & { readonly list: 'omniplan.violations.list' }
  Scenario: ResourceDescriptor<Scenario, string> & {
    readonly id: ValueType<string>
    readonly get: 'omniplan.scenarios.get'
    readonly list: 'omniplan.scenarios.list'
  }
}>

/**
 * The resource table: the implementation of {@link OmniPlanResources}, which
 * declares it, so the two are one table. It lists each resource that records
 * a `get` or a `list`. A resource with neither is left out, because no
 * reference to it can be resolved at any position or in any form (phases/13
 * D7, "Resolvable targets"). This table is also the registry that reference
 * value types read, lazily.
 */
const resources = {
  Project: {
    name: 'Project',
    record: projectRecordType,
    id: t.string({ description: 'The unique identifier for the project' }),
    get: 'omniplan.projects.get',
    list: 'omniplan.projects.list',
  },
  Task: {
    name: 'Task',
    record: taskRecordType,
    id: t.integer({ description: 'Internal identifier for this task' }),
    get: 'omniplan.tasks.get',
    list: 'omniplan.tasks.list',
  },
  Milestone: {
    name: 'Milestone',
    record: milestoneRecordType,
    id: t.integer({ description: 'Internal identifier for this milestone' }),
    get: 'omniplan.milestones.get',
    list: 'omniplan.milestones.list',
  },
  Resource: {
    name: 'Resource',
    record: resourceRecordType,
    id: t.integer({ description: 'Internal identifier for this resource' }),
    get: 'omniplan.resources.get',
    list: 'omniplan.resources.list',
  },
  Assignment: {
    name: 'Assignment',
    record: assignmentRecordType,
    list: 'omniplan.assignments.list',
  },
  Dependency: {
    name: 'Dependency',
    record: dependencyRecordType,
    list: 'omniplan.dependencies.list',
  },
  Violation: {
    name: 'Violation',
    record: violationRecordType,
    list: 'omniplan.violations.list',
  },
  Scenario: {
    name: 'Scenario',
    record: scenarioRecordType,
    id: t.string({ description: 'The unique identifier for the scenario' }),
    get: 'omniplan.scenarios.get',
    list: 'omniplan.scenarios.list',
  },
} satisfies OmniPlanResources

const projectListProjectsOperation: OperationDescriptor<Record<string, never>, Page<Project>> = {
  id: 'omniplan.projects.list',
  permission: 'omniplan:projects:list',
  target: { command: 'listProjects', resource: 'Project' },
  description: 'List all projects',
  input: t.record({}),
  output: t.page(projectRecordType),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const projectGetProjectOperation: OperationDescriptor<{ readonly id: string }, Project> = {
  id: 'omniplan.projects.get',
  permission: 'omniplan:projects:get',
  target: { command: 'getProject', resource: 'Project' },
  description: 'Get a project',
  input: t.record({
    id: t.string({ description: 'Project identifier' }),
  }),
  output: projectRecordType,
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: { id: { type: 'string', description: 'Project identifier' } },
    required: ['id'],
    additionalProperties: false,
  },
}

const taskListTasksOperation: OperationDescriptor<Record<string, never>, Page<Task>> = {
  id: 'omniplan.tasks.list',
  permission: 'omniplan:tasks:list',
  target: { command: 'listTasks', resource: 'Task' },
  description: 'List all tasks',
  input: t.record({}),
  output: t.page(taskRecordType),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const taskGetTaskOperation: OperationDescriptor<{ readonly id: Integer }, Task> = {
  id: 'omniplan.tasks.get',
  permission: 'omniplan:tasks:get',
  target: { command: 'getTask', resource: 'Task' },
  description: 'Get a task by ID',
  input: t.record({
    id: t.integer({ description: 'Task identifier' }),
  }),
  output: taskRecordType,
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      id: {
        type: 'object',
        properties: { integer: { type: 'string', pattern: '^(0|-?[1-9][0-9]*)$' } },
        required: ['integer'],
        additionalProperties: false,
        description: 'Task identifier',
      },
    },
    required: ['id'],
    additionalProperties: false,
  },
}

const taskCreateTaskOperation: OperationDescriptor<TaskCreateInput, Task> = {
  id: 'omniplan.tasks.create',
  permission: 'omniplan:tasks:create',
  target: { command: 'createTask', resource: 'Task' },
  description: 'Create a new task',
  input: taskCreateInputType,
  output: taskRecordType,
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Task name' },
      startingDate: {
        type: 'object',
        properties: {
          date: {
            type: 'string',
            pattern: '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}(Z|[+-]\\d{2}:\\d{2})$',
          },
        },
        required: ['date'],
        additionalProperties: false,
        description: 'Start date',
      },
      endingDate: {
        type: 'object',
        properties: {
          date: {
            type: 'string',
            pattern: '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}(Z|[+-]\\d{2}:\\d{2})$',
          },
        },
        required: ['date'],
        additionalProperties: false,
        description: 'The date on which work ends',
      },
      duration: {
        type: 'object',
        properties: {
          double: {
            anyOf: [
              { type: 'number' },
              { type: 'string', enum: ['NaN', 'Infinity', '-Infinity', '-0'] },
            ],
          },
        },
        required: ['double'],
        additionalProperties: false,
        description: 'Duration in seconds',
      },
      effort: {
        type: 'object',
        properties: {
          double: {
            anyOf: [
              { type: 'number' },
              { type: 'string', enum: ['NaN', 'Infinity', '-Infinity', '-0'] },
            ],
          },
        },
        required: ['double'],
        additionalProperties: false,
        description: 'The number of person-seconds required to perform the task',
      },
      completed: {
        type: 'object',
        properties: {
          double: {
            anyOf: [
              { type: 'number' },
              { type: 'string', enum: ['NaN', 'Infinity', '-Infinity', '-0'] },
            ],
          },
        },
        required: ['double'],
        additionalProperties: false,
        description: 'The percentage of the task which is complete (1.0 = 100%)',
      },
      completedEffort: {
        type: 'object',
        properties: {
          double: {
            anyOf: [
              { type: 'number' },
              { type: 'string', enum: ['NaN', 'Infinity', '-Infinity', '-0'] },
            ],
          },
        },
        required: ['double'],
        additionalProperties: false,
        description: 'The person-seconds completed',
      },
      priority: {
        type: 'object',
        properties: { integer: { type: 'string', pattern: '^(0|-?[1-9][0-9]*)$' } },
        required: ['integer'],
        additionalProperties: false,
        description: 'Priority of this task',
      },
      taskType: {
        type: 'string',
        enum: ['standardTask', 'milestoneTask', 'groupTask', 'hammockTask'],
        description: 'Whether this task is a standard task, milestone, group, or hammock',
      },
      staticCost: {
        type: 'object',
        properties: {
          double: {
            anyOf: [
              { type: 'number' },
              { type: 'string', enum: ['NaN', 'Infinity', '-Infinity', '-0'] },
            ],
          },
        },
        required: ['double'],
        additionalProperties: false,
        description: 'Cost for this task itself',
      },
      startingConstraintDate: {
        type: 'object',
        properties: {
          date: {
            type: 'string',
            pattern: '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}(Z|[+-]\\d{2}:\\d{2})$',
          },
        },
        required: ['date'],
        additionalProperties: false,
        description: 'The earliest date this task may start',
      },
      endingConstraintDate: {
        type: 'object',
        properties: {
          date: {
            type: 'string',
            pattern: '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}(Z|[+-]\\d{2}:\\d{2})$',
          },
        },
        required: ['date'],
        additionalProperties: false,
        description: 'The latest date this task may end',
      },
      startingDateLocked: {
        type: 'boolean',
        description: 'Whether the start date is locked or not',
      },
      endingDateLocked: { type: 'boolean', description: 'Whether the end date is locked or not' },
      note: { type: 'string', description: 'Notes' },
    },
    required: ['name'],
    additionalProperties: false,
  },
}

const milestoneListMilestonesOperation: OperationDescriptor<
  Record<string, never>,
  Page<Milestone>
> = {
  id: 'omniplan.milestones.list',
  permission: 'omniplan:milestones:list',
  target: { command: 'listMilestones', resource: 'Milestone' },
  description: 'List all milestones',
  input: t.record({}),
  output: t.page(milestoneRecordType),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const milestoneGetMilestoneOperation: OperationDescriptor<{ readonly id: Integer }, Milestone> = {
  id: 'omniplan.milestones.get',
  permission: 'omniplan:milestones:get',
  target: { command: 'getMilestone', resource: 'Milestone' },
  description: 'Get a milestone by ID',
  input: t.record({
    id: t.integer({ description: 'Milestone identifier' }),
  }),
  output: milestoneRecordType,
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      id: {
        type: 'object',
        properties: { integer: { type: 'string', pattern: '^(0|-?[1-9][0-9]*)$' } },
        required: ['integer'],
        additionalProperties: false,
        description: 'Milestone identifier',
      },
    },
    required: ['id'],
    additionalProperties: false,
  },
}

const milestoneCreateMilestoneOperation: OperationDescriptor<MilestoneCreateInput, Milestone> = {
  id: 'omniplan.milestones.create',
  permission: 'omniplan:milestones:create',
  target: { command: 'createMilestone', resource: 'Milestone' },
  description: 'Create a new milestone',
  input: milestoneCreateInputType,
  output: milestoneRecordType,
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Milestone name' },
      startingDate: {
        type: 'object',
        properties: {
          date: {
            type: 'string',
            pattern: '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}\\.\\d{3}(Z|[+-]\\d{2}:\\d{2})$',
          },
        },
        required: ['date'],
        additionalProperties: false,
        description: 'Milestone date',
      },
      note: { type: 'string', description: 'Notes' },
    },
    required: ['name'],
    additionalProperties: false,
  },
}

const resourceListResourcesOperation: OperationDescriptor<Record<string, never>, Page<Resource>> = {
  id: 'omniplan.resources.list',
  permission: 'omniplan:resources:list',
  target: { command: 'listResources', resource: 'Resource' },
  description: 'List all resources',
  input: t.record({}),
  output: t.page(resourceRecordType),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const resourceGetResourceOperation: OperationDescriptor<{ readonly id: Integer }, Resource> = {
  id: 'omniplan.resources.get',
  permission: 'omniplan:resources:get',
  target: { command: 'getResource', resource: 'Resource' },
  description: 'Get a resource by ID',
  input: t.record({
    id: t.integer({ description: 'Resource identifier' }),
  }),
  output: resourceRecordType,
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      id: {
        type: 'object',
        properties: { integer: { type: 'string', pattern: '^(0|-?[1-9][0-9]*)$' } },
        required: ['integer'],
        additionalProperties: false,
        description: 'Resource identifier',
      },
    },
    required: ['id'],
    additionalProperties: false,
  },
}

const resourceCreateResourceOperation: OperationDescriptor<ResourceCreateInput, Resource> = {
  id: 'omniplan.resources.create',
  permission: 'omniplan:resources:create',
  target: { command: 'createResource', resource: 'Resource' },
  description: 'Create a new resource',
  input: resourceCreateInputType,
  output: resourceRecordType,
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      name: { type: 'string', description: 'Resource name' },
      resourceType: {
        type: 'string',
        enum: ['person', 'equipment', 'material', 'resourceGroup'],
        description: 'Resource type',
      },
      number: {
        type: 'object',
        properties: {
          double: {
            anyOf: [
              { type: 'number' },
              { type: 'string', enum: ['NaN', 'Infinity', '-Infinity', '-0'] },
            ],
          },
        },
        required: ['double'],
        additionalProperties: false,
        description: 'The total number of units for this resource (1.0 = 100%)',
      },
      emailAddress: { type: 'string', description: 'Email address for this resource' },
      costPerUse: {
        type: 'object',
        properties: {
          double: {
            anyOf: [
              { type: 'number' },
              { type: 'string', enum: ['NaN', 'Infinity', '-Infinity', '-0'] },
            ],
          },
        },
        required: ['double'],
        additionalProperties: false,
        description: 'The fixed cost per use of this resource',
      },
      costPerHour: {
        type: 'object',
        properties: {
          double: {
            anyOf: [
              { type: 'number' },
              { type: 'string', enum: ['NaN', 'Infinity', '-Infinity', '-0'] },
            ],
          },
        },
        required: ['double'],
        additionalProperties: false,
        description: 'The cost per hour of this resource',
      },
      efficiency: {
        type: 'object',
        properties: {
          double: {
            anyOf: [
              { type: 'number' },
              { type: 'string', enum: ['NaN', 'Infinity', '-Infinity', '-0'] },
            ],
          },
        },
        required: ['double'],
        additionalProperties: false,
        description: 'Resource efficiency (1.0 = 100%)',
      },
      note: { type: 'string', description: 'Notes' },
    },
    required: ['name'],
    additionalProperties: false,
  },
}

const assignmentListAssignmentsOperation: OperationDescriptor<
  Record<string, never>,
  Page<Assignment>
> = {
  id: 'omniplan.assignments.list',
  permission: 'omniplan:assignments:list',
  target: { command: 'listAssignments', resource: 'Assignment' },
  description: 'List all assignments',
  input: t.record({}),
  output: t.page(assignmentRecordType),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const dependencyListDependenciesOperation: OperationDescriptor<
  Record<string, never>,
  Page<Dependency>
> = {
  id: 'omniplan.dependencies.list',
  permission: 'omniplan:dependencies:list',
  target: { command: 'listDependencies', resource: 'Dependency' },
  description: 'List all dependencies',
  input: t.record({}),
  output: t.page(dependencyRecordType),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const violationListViolationsOperation: OperationDescriptor<
  Record<string, never>,
  Page<Violation>
> = {
  id: 'omniplan.violations.list',
  permission: 'omniplan:violations:list',
  target: { command: 'listViolations', resource: 'Violation' },
  description: 'List all violations',
  input: t.record({}),
  output: t.page(violationRecordType),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const scenarioListScenariosOperation: OperationDescriptor<Record<string, never>, Page<Scenario>> = {
  id: 'omniplan.scenarios.list',
  permission: 'omniplan:scenarios:list',
  target: { command: 'listScenarios', resource: 'Scenario' },
  description: 'List all scenarios',
  input: t.record({}),
  output: t.page(scenarioRecordType),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const scenarioGetScenarioOperation: OperationDescriptor<{ readonly id: string }, Scenario> = {
  id: 'omniplan.scenarios.get',
  permission: 'omniplan:scenarios:get',
  target: { command: 'getScenario', resource: 'Scenario' },
  description: 'Get a scenario by ID',
  input: t.record({
    id: t.string({ description: 'Scenario identifier' }),
  }),
  output: scenarioRecordType,
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: { id: { type: 'string', description: 'Scenario identifier' } },
    required: ['id'],
    additionalProperties: false,
  },
}

const appExportOperation: OperationDescriptor<{ readonly to: string }, undefined> = {
  id: 'omniplan.app.export',
  permission: 'omniplan:app:export',
  target: { command: 'export' },
  description: 'Export a document',
  input: t.record({
    to: t.string({ description: 'Export file path' }),
  }),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: { to: { type: 'string', description: 'Export file path' } },
    required: ['to'],
    additionalProperties: false,
  },
}

const appAssignOperation: OperationDescriptor<
  { readonly resource: string; readonly task: string },
  undefined
> = {
  id: 'omniplan.app.assign',
  permission: 'omniplan:app:assign',
  target: { command: 'assign' },
  description: 'Assign resources to tasks',
  input: t.record({
    resource: t.string({ description: 'Resource to assign' }),
    task: t.string({ description: 'Task to assign to' }),
  }),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      resource: { type: 'string', description: 'Resource to assign' },
      task: { type: 'string', description: 'Task to assign to' },
    },
    required: ['resource', 'task'],
    additionalProperties: false,
  },
}

const appDependOperation: OperationDescriptor<
  { readonly prerequisite: string; readonly dependent: string },
  undefined
> = {
  id: 'omniplan.app.depend',
  permission: 'omniplan:app:depend',
  target: { command: 'depend' },
  description: 'Create a dependency between tasks',
  input: t.record({
    prerequisite: t.string({ description: 'Prerequisite task' }),
    dependent: t.string({ description: 'Dependent task' }),
  }),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {
      prerequisite: { type: 'string', description: 'Prerequisite task' },
      dependent: { type: 'string', description: 'Dependent task' },
    },
    required: ['prerequisite', 'dependent'],
    additionalProperties: false,
  },
}

const appBaselineOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'omniplan.app.baseline',
  permission: 'omniplan:app:baseline',
  target: { command: 'baseline' },
  description: 'Commit the current schedule as the baseline schedule',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const appLevelOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'omniplan.app.level',
  permission: 'omniplan:app:level',
  target: { command: 'level' },
  description: 'Level resources on project',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const appLookupOperation: OperationDescriptor<{ readonly key: string }, undefined> = {
  id: 'omniplan.app.lookup',
  permission: 'omniplan:app:lookup',
  target: { command: 'lookup' },
  description: 'Look up a task via a custom data key',
  input: t.record({
    key: t.string({ description: 'Custom data key' }),
  }),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: { key: { type: 'string', description: 'Custom data key' } },
    required: ['key'],
    additionalProperties: false,
  },
}

const appChangeMarkOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'omniplan.app.changeMark',
  permission: 'omniplan:app:changeMark',
  target: { command: 'changeMark' },
  description: 'Make a change tracking mark on project',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const appAddWorkTimeOperation: OperationDescriptor<{ readonly schedule: string }, undefined> = {
  id: 'omniplan.app.addWorkTime',
  permission: 'omniplan:app:addWorkTime',
  target: { command: 'addWorkTime' },
  description: 'Add working hours to a schedule',
  input: t.record({
    schedule: t.string({ description: 'Target schedule' }),
  }),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: { schedule: { type: 'string', description: 'Target schedule' } },
    required: ['schedule'],
    additionalProperties: false,
  },
}

const appSubtractWorkTimeOperation: OperationDescriptor<{ readonly schedule: string }, undefined> =
  {
    id: 'omniplan.app.subtractWorkTime',
    permission: 'omniplan:app:subtractWorkTime',
    target: { command: 'subtractWorkTime' },
    description: 'Remove working hours from a schedule',
    input: t.record({
      schedule: t.string({ description: 'Target schedule' }),
    }),
    output: t.none(),
    inputJsonSchema: {
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
      properties: { schedule: { type: 'string', description: 'Target schedule' } },
      required: ['schedule'],
      additionalProperties: false,
    },
  }

const violationFixOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'omniplan.violations.fix',
  permission: 'omniplan:violations:fix',
  target: { command: 'fix', resource: 'Violation' },
  description: 'Fix a violation',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const appUndoOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'omniplan.app.undo',
  permission: 'omniplan:app:undo',
  target: { command: 'undo' },
  description: 'Undo the last command',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

const appRedoOperation: OperationDescriptor<Record<string, never>, undefined> = {
  id: 'omniplan.app.redo',
  permission: 'omniplan:app:redo',
  target: { command: 'redo' },
  description: 'Redo the last undone command',
  input: t.record({}),
  output: t.none(),
  inputJsonSchema: {
    $schema: 'http://json-schema.org/draft-07/schema#',
    type: 'object',
    properties: {},
    additionalProperties: false,
  },
}

/** Every operation, keyed by its identity. */
const operations: AppContract<OmniPlanClient>['operations'] = {
  'omniplan.projects.list': projectListProjectsOperation,
  'omniplan.projects.get': projectGetProjectOperation,
  'omniplan.tasks.list': taskListTasksOperation,
  'omniplan.tasks.get': taskGetTaskOperation,
  'omniplan.tasks.create': taskCreateTaskOperation,
  'omniplan.milestones.list': milestoneListMilestonesOperation,
  'omniplan.milestones.get': milestoneGetMilestoneOperation,
  'omniplan.milestones.create': milestoneCreateMilestoneOperation,
  'omniplan.resources.list': resourceListResourcesOperation,
  'omniplan.resources.get': resourceGetResourceOperation,
  'omniplan.resources.create': resourceCreateResourceOperation,
  'omniplan.assignments.list': assignmentListAssignmentsOperation,
  'omniplan.dependencies.list': dependencyListDependenciesOperation,
  'omniplan.violations.list': violationListViolationsOperation,
  'omniplan.scenarios.list': scenarioListScenariosOperation,
  'omniplan.scenarios.get': scenarioGetScenarioOperation,
  'omniplan.app.export': appExportOperation,
  'omniplan.app.assign': appAssignOperation,
  'omniplan.app.depend': appDependOperation,
  'omniplan.app.baseline': appBaselineOperation,
  'omniplan.app.level': appLevelOperation,
  'omniplan.app.lookup': appLookupOperation,
  'omniplan.app.changeMark': appChangeMarkOperation,
  'omniplan.app.addWorkTime': appAddWorkTimeOperation,
  'omniplan.app.subtractWorkTime': appSubtractWorkTimeOperation,
  'omniplan.violations.fix': violationFixOperation,
  'omniplan.app.undo': appUndoOperation,
  'omniplan.app.redo': appRedoOperation,
}

/** Build the client on top of a factory-supplied runtime. */
function bind(runtime: ClientRuntime): OmniPlanClient {
  return {
    projects: {
      list: (options) => runtime.invoke(projectListProjectsOperation, {}, options),
      get: (id, options) => runtime.invoke(projectGetProjectOperation, { id }, options),
    },
    tasks: {
      list: (options) => runtime.invoke(taskListTasksOperation, {}, options),
      get: (id, options) => runtime.invoke(taskGetTaskOperation, { id }, options),
      create: (input, options) => runtime.invoke(taskCreateTaskOperation, input, options),
    },
    milestones: {
      list: (options) => runtime.invoke(milestoneListMilestonesOperation, {}, options),
      get: (id, options) => runtime.invoke(milestoneGetMilestoneOperation, { id }, options),
      create: (input, options) => runtime.invoke(milestoneCreateMilestoneOperation, input, options),
    },
    resources: {
      list: (options) => runtime.invoke(resourceListResourcesOperation, {}, options),
      get: (id, options) => runtime.invoke(resourceGetResourceOperation, { id }, options),
      create: (input, options) => runtime.invoke(resourceCreateResourceOperation, input, options),
    },
    assignments: {
      list: (options) => runtime.invoke(assignmentListAssignmentsOperation, {}, options),
    },
    dependencies: {
      list: (options) => runtime.invoke(dependencyListDependenciesOperation, {}, options),
    },
    violations: {
      list: (options) => runtime.invoke(violationListViolationsOperation, {}, options),
      fix: (options) => runtime.invoke(violationFixOperation, {}, options),
    },
    scenarios: {
      list: (options) => runtime.invoke(scenarioListScenariosOperation, {}, options),
      get: (id, options) => runtime.invoke(scenarioGetScenarioOperation, { id }, options),
    },
    _export: (to, options) => runtime.invoke(appExportOperation, { to }, options),
    assign: (resource, task, options) =>
      runtime.invoke(appAssignOperation, { resource, task }, options),
    depend: (prerequisite, dependent, options) =>
      runtime.invoke(appDependOperation, { prerequisite, dependent }, options),
    baseline: (options) => runtime.invoke(appBaselineOperation, {}, options),
    level: (options) => runtime.invoke(appLevelOperation, {}, options),
    lookup: (key, options) => runtime.invoke(appLookupOperation, { key }, options),
    changeMark: (options) => runtime.invoke(appChangeMarkOperation, {}, options),
    addWorkTime: (schedule, options) =>
      runtime.invoke(appAddWorkTimeOperation, { schedule }, options),
    subtractWorkTime: (schedule, options) =>
      runtime.invoke(appSubtractWorkTimeOperation, { schedule }, options),
    undo: (options) => runtime.invoke(appUndoOperation, {}, options),
    redo: (options) => runtime.invoke(appRedoOperation, {}, options),
  }
}

/**
 * The OmniPlan contract. Pass it to a client factory to obtain a
 * {@link OmniPlanClient}.
 */
export const omniPlanContract: AppContract<OmniPlanClient, OmniPlanResources> = {
  app: 'omniplan',
  operations,
  resources,
  loadManifest: async () => (await import('./manifest.js')).manifest,
  bind,
}
