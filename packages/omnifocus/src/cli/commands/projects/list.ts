import { Command, Option } from 'clipanion'
import { getClient } from '../../sdk.js'
import { createFormatter } from '../../output/index.js'

/**
 * List projects.
 */
export class ListProjectsCommand extends Command {
  static override paths = [['omnifocus', 'projects', 'list']]

  static override usage = Command.Usage({
    description: 'List projects',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  pageSize = Option.String('--page-size', {
    description: 'The most items to show, from 1 to 100 (default 25)',
  })
  cursor = Option.String('--cursor', {
    description: 'Continue from the previous page, as its output says',
  })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const page = await client.projects.list({
        ...(this.pageSize === undefined ? {} : { pageSize: Number(this.pageSize) }),
        ...(this.cursor === undefined ? {} : { cursor: this.cursor }),
      })

      const output = formatter.formatPage(
        page.items.map((item) => ({
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
        })),
        page.nextCursor
      )

      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}
