import { Command, Option } from 'clipanion'
import { getClient } from '../../../sdk.js'
import { createFormatter } from '../../../output/index.js'

/**
 * Create a new variable.
 */
export class CreateVariableCommand extends Command {
  static override paths = [['automator', 'workflows', 'variables', 'create']]

  static override usage = Command.Usage({
    description: 'Create a new variable',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  workflowId = Option.String('--workflow-id', { required: true, description: 'Workflow ID' })
  name = Option.String('--name', { required: true, description: 'The name of the variable' })
  value = Option.String('--value', { required: true, description: 'The value of the variable' })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      // Assert the SDK's precise create-input type. CLI flags surface every field as a
      // string/boolean primitive, which may not structurally overlap the input's richer
      // member types (e.g. a color object) or exact-optional members, so we assert via
      // `unknown`. The RPC layer coerces/validates the payload at runtime.
      const item = await client.variables.create({
        name: this.name,
        value: this.value,
      } as unknown as Parameters<typeof client.variables.create>[0])

      const output = formatter.format({
        message: 'Variable created successfully',
        name: item.name,
        value: item.value,
        settable: item.settable,
        id: item.id,
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
