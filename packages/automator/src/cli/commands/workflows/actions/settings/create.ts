import { Command, Option } from 'clipanion'
import { getClient } from '../../../../sdk.js'
import { createFormatter } from '../../../../output/index.js'

/**
 * Create a new setting.
 */
export class CreateSettingCommand extends Command {
  static override paths = [['automator', 'workflows', 'actions', 'settings', 'create']]

  static override usage = Command.Usage({
    description: 'Create a new setting',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  workflowId = Option.String('--workflow-id', { required: true, description: 'Workflow ID' })
  automatorActionId = Option.String('--automator-action-id', {
    required: true,
    description: 'AutomatorAction ID',
  })
  value = Option.String('--value', { required: true, description: 'The value of the setting' })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      // Assert the SDK's precise create-input type. CLI flags surface every field as a
      // string/boolean primitive, which may not structurally overlap the input's richer
      // member types (e.g. a color object) or exact-optional members, so we assert via
      // `unknown`. The RPC layer coerces/validates the payload at runtime.
      const item = await client.settings.create({
        value: this.value,
      } as unknown as Parameters<typeof client.settings.create>[0])

      const output = formatter.format({
        message: 'Setting created successfully',
        name: item.name,
        value: item.value,
        defaultValue: item.defaultValue,
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
