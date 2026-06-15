import { Command, Option } from 'clipanion'
import { getClient } from '../../sdk.js'
import { createFormatter } from '../../output/index.js'

/**
 * Create a new workflow.
 */
export class CreateWorkflowCommand extends Command {
  static override paths = [['automator', 'workflows', 'create']]

  static override usage = Command.Usage({
    description: 'Create a new workflow',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      // Assert the SDK's precise create-input type. CLI flags surface every field as a
      // string/boolean primitive, which may not structurally overlap the input's richer
      // member types (e.g. a color object) or exact-optional members, so we assert via
      // `unknown`. The RPC layer coerces/validates the payload at runtime.
      const item = await client.workflows.create(
        {} as unknown as Parameters<typeof client.workflows.create>[0]
      )

      const output = formatter.format({
        message: 'Workflow created successfully',
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
