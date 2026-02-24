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
      const item = await client.settings.create({
        value: this.value,
      } as Record<string, unknown>)

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
