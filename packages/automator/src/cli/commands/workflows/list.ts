import { Command, Option } from 'clipanion'
import { getClient } from '../../sdk.js'
import { createFormatter } from '../../output/index.js'

/**
 * List workflows.
 */
export class ListWorkflowsCommand extends Command {
  static override paths = [['automator', 'workflows', 'list']]

  static override usage = Command.Usage({
    description: 'List workflows',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const items = await client.workflows.list()

      const output = formatter.formatList(
        items.map((item) => ({
          name: item.name,
          currentAction: item.currentAction,
          executionResult: item.executionResult,
          executionErrorMessage: item.executionErrorMessage,
          executionErrorNumber: item.executionErrorNumber,
          executionId: item.executionId,
        }))
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
