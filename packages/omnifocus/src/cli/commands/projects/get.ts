import { Command, Option } from 'clipanion'
import { getClient } from '../../sdk.js'
import { createFormatter } from '../../output/index.js'

/**
 * Get a project by ID.
 */
export class GetProjectCommand extends Command {
  static override paths = [['omnifocus', 'projects', 'get']]

  static override usage = Command.Usage({
    description: 'Get a project by ID',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })

  projectId = Option.String({ required: true })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const item = await client.projects.get(this.projectId)

      const output = formatter.format({
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
