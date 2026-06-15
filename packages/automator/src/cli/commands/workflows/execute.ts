import { Command, Option } from 'clipanion'
import { getClient } from '../../sdk.js'
import { createFormatter } from '../../output/index.js'

/**
 * Execute a workflow
 */
export class ExecuteWorkflowCommand extends Command {
  static override paths = [['automator', 'workflows', 'execute']]

  static override usage = Command.Usage({
    description: 'Execute a workflow',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  workflowId = Option.String({ required: true })
  workflow = Option.String('--workflow', { required: true, description: 'The workflow to execute' })
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      await client.workflows.execute(
        this.workflow as unknown as Parameters<typeof client.workflows.execute>[0]
      )

      const output = formatter.formatSuccess('execute completed successfully')
      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}
