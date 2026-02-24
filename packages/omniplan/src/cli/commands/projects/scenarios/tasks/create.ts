import { Command, Option } from 'clipanion'
import * as t from 'typanion'
import { getClient } from '../../../../sdk.js'
import { createFormatter } from '../../../../output/index.js'

/**
 * Create a new task.
 */
export class CreateTaskCommand extends Command {
  static override paths = [['omniplan', 'projects', 'scenarios', 'tasks', 'create']]

  static override usage = Command.Usage({
    description: 'Create a new task',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  projectId = Option.String('--project-id', { required: true, description: 'Project ID' })
  scenarioId = Option.String('--scenario-id', { required: true, description: 'Scenario ID' })
  name = Option.String('--name', { required: true, description: 'The name of the task' })
  startingDate = Option.String('--starting-date', {
    required: true,
    description: 'The date on which work begins',
  })
  endingDate = Option.String('--ending-date', {
    required: true,
    description: 'The date on which work ends',
  })
  duration = Option.String('--duration', {
    required: true,
    description: 'The number of working seconds occupied by task',
  })
  effort = Option.String('--effort', {
    required: true,
    description: 'The number of person-seconds required to perform the task',
  })
  completed = Option.String('--completed', {
    required: true,
    description: 'The percentage of the task which is complete (1.0 = 100%)',
  })
  completedEffort = Option.String('--completed-effort', {
    required: true,
    description: 'The person-seconds completed',
  })
  priority = Option.String('--priority', { required: true, description: 'Priority of this task' })
  taskType = Option.String('--task-type', {
    required: true,
    description: 'Whether this task is a standard task, milestone, group, or hammock',
    validator: t.isEnum(['standardTask', 'milestoneTask', 'groupTask', 'hammockTask']),
  })
  staticCost = Option.String('--static-cost', {
    required: true,
    description: 'Cost for this task itself',
  })
  startingConstraintDate = Option.String('--starting-constraint-date', {
    required: true,
    description: 'The earliest date this task may start',
  })
  endingConstraintDate = Option.String('--ending-constraint-date', {
    required: true,
    description: 'The latest date this task may end',
  })
  startingDateLocked = Option.Boolean('--starting-date-locked', {
    description: 'Whether the start date is locked or not',
  })
  endingDateLocked = Option.Boolean('--ending-date-locked', {
    description: 'Whether the end date is locked or not',
  })
  note = Option.String('--note', { required: true, description: 'Notes' })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const item = await client.tasks.create({
        name: this.name,
        startingDate: this.startingDate,
        endingDate: this.endingDate,
        duration: this.duration,
        effort: this.effort,
        completed: this.completed,
        completedEffort: this.completedEffort,
        priority: this.priority,
        taskType: this.taskType,
        staticCost: this.staticCost,
        startingConstraintDate: this.startingConstraintDate,
        endingConstraintDate: this.endingConstraintDate,
        startingDateLocked: this.startingDateLocked,
        endingDateLocked: this.endingDateLocked,
        note: this.note,
      } as Record<string, unknown>)

      const output = formatter.format({
        message: 'Task created successfully',
        id: item.id,
        name: item.name,
        startingDate: item.startingDate,
        endingDate: item.endingDate,
        duration: item.duration,
        effort: item.effort,
        completed: item.completed,
        completedEffort: item.completedEffort,
        remainingEffort: item.remainingEffort,
        priority: item.priority,
        taskStatus: item.taskStatus,
        taskType: item.taskType,
        staticCost: item.staticCost,
        resourceCost: item.resourceCost,
        totalCost: item.totalCost,
        outlineDepth: item.outlineDepth,
        outlineNumber: item.outlineNumber,
        startingConstraintDate: item.startingConstraintDate,
        endingConstraintDate: item.endingConstraintDate,
        startingDateLocked: item.startingDateLocked,
        endingDateLocked: item.endingDateLocked,
        note: item.note,
      })

      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}
