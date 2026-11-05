import { Command, Option } from 'clipanion'
import { getClient } from '../../sdk.js'
import { createFormatter } from '../../output/index.js'

/**
 * Get a workflow by name.
 */
export class GetWorkflowCommand extends Command {
  static override paths = [['automator', 'workflows', 'get']]

  static override usage = Command.Usage({
    description:
      "Get a workflow by name. When several workflows share the same name, the first match in the app's order is used, and the operation does not fail as ambiguous.",
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })

  workflowId = Option.String({ name: 'name', required: true })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const item = await client.workflows.get(this.workflowId)

      const output = formatter.format({
        name: item.name,
        currentAction: item.currentAction,
        executionResult: item.executionResult,
        executionErrorMessage: item.executionErrorMessage,
        executionErrorNumber: item.executionErrorNumber,
        executionId: item.executionId,
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
