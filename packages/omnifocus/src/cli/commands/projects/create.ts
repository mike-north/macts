import { Command, Option } from 'clipanion'
import * as t from 'typanion'
import { getClient } from '../../sdk.js'
import { createFormatter } from '../../output/index.js'

/**
 * Create a new project.
 */
export class CreateProjectCommand extends Command {
  static override paths = [['omnifocus', 'projects', 'create']]

  static override usage = Command.Usage({
    description: 'Create a new project',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  name = Option.String('--name', { required: true, description: 'The name of the project' })
  note = Option.String('--note', { required: true, description: 'The note of the project' })
  status = Option.String('--status', {
    required: true,
    description: 'The status of the project',
    validator: t.isEnum(['active', 'onHold', 'done', 'dropped']),
  })
  flagged = Option.Boolean('--flagged', { description: 'True if flagged' })
  deferDate = Option.String('--defer-date', {
    required: true,
    description: 'When the project should become available for action',
  })
  plannedDate = Option.String('--planned-date', {
    required: true,
    description: 'The date at which work for this project is intended',
  })
  dueDate = Option.String('--due-date', {
    required: true,
    description: 'When the project must be finished',
  })
  completionDate = Option.String('--completion-date', {
    required: true,
    description: "The project's date of completion",
  })
  droppedDate = Option.String('--dropped-date', {
    required: true,
    description: 'The date the project was dropped',
  })
  creationDate = Option.String('--creation-date', {
    required: true,
    description: 'When the project was created',
  })
  lastReviewDate = Option.String('--last-review-date', {
    required: true,
    description: 'When the project was last reviewed',
  })
  nextReviewDate = Option.String('--next-review-date', {
    required: true,
    description: 'When the project should next be reviewed',
  })
  estimatedMinutes = Option.String('--estimated-minutes', {
    required: true,
    description: 'The estimated time, in whole minutes, that this project will take to finish',
  })
  sequential = Option.Boolean('--sequential', {
    description: 'If true, any children are sequentially dependent',
  })
  completedByChildren = Option.Boolean('--completed-by-children', {
    description: 'If true, complete when children are completed',
  })
  singletonActionHolder = Option.Boolean('--singleton-action-holder', {
    description: 'True if the project contains singleton actions',
  })
  defaultSingletonActionHolder = Option.Boolean('--default-singleton-action-holder', {
    description: 'True if the project is the default holder of singleton actions',
  })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      // Assert the SDK's precise create-input type. CLI flags surface every field as a
      // string/boolean primitive, which may not structurally overlap the input's richer
      // member types (e.g. a color object) or exact-optional members, so we assert via
      // `unknown`. The RPC layer coerces/validates the payload at runtime.
      const item = await client.projects.create({
        name: this.name,
        note: this.note,
        status: this.status,
        flagged: this.flagged,
        deferDate: this.deferDate,
        plannedDate: this.plannedDate,
        dueDate: this.dueDate,
        completionDate: this.completionDate,
        droppedDate: this.droppedDate,
        creationDate: this.creationDate,
        lastReviewDate: this.lastReviewDate,
        nextReviewDate: this.nextReviewDate,
        estimatedMinutes: this.estimatedMinutes,
        sequential: this.sequential,
        completedByChildren: this.completedByChildren,
        singletonActionHolder: this.singletonActionHolder,
        defaultSingletonActionHolder: this.defaultSingletonActionHolder,
      } as unknown as Parameters<typeof client.projects.create>[0])

      const output = formatter.format({
        message: 'Project created successfully',
        id: item.id,
        name: item.name,
        note: item.note,
        status: item.status,
        effectiveStatus: item.effectiveStatus,
        flagged: item.flagged,
        completed: item.completed,
        deferDate: item.deferDate,
        plannedDate: item.plannedDate,
        dueDate: item.dueDate,
        completionDate: item.completionDate,
        droppedDate: item.droppedDate,
        creationDate: item.creationDate,
        modificationDate: item.modificationDate,
        lastReviewDate: item.lastReviewDate,
        nextReviewDate: item.nextReviewDate,
        estimatedMinutes: item.estimatedMinutes,
        sequential: item.sequential,
        completedByChildren: item.completedByChildren,
        singletonActionHolder: item.singletonActionHolder,
        defaultSingletonActionHolder: item.defaultSingletonActionHolder,
        blocked: item.blocked,
        effectiveDeferDate: item.effectiveDeferDate,
        effectivePlannedDate: item.effectivePlannedDate,
        effectiveDueDate: item.effectiveDueDate,
        effectivelyCompleted: item.effectivelyCompleted,
        effectivelyDropped: item.effectivelyDropped,
        dropped: item.dropped,
        numberOfTasks: item.numberOfTasks,
        numberOfAvailableTasks: item.numberOfAvailableTasks,
        numberOfCompletedTasks: item.numberOfCompletedTasks,
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
