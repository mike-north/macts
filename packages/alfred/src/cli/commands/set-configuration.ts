import { Command, Option } from 'clipanion'
import { getClient } from '../sdk.js'
import { createFormatter } from '../output/index.js'

/**
 * Modify workflow configuration value, or set environment variable
 */
export class SetConfigurationCommand extends Command {
  static override paths = [['alfred', 'set-configuration']]

  static override usage = Command.Usage({
    description: 'Modify workflow configuration value, or set environment variable',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  variable = Option.String('--variable', {
    required: true,
    description: 'The name of the variable',
  })
  toValue = Option.String('--to-value', { required: true, description: 'The value to set' })
  inWorkflow = Option.String('--in-workflow', {
    required: true,
    description: 'The workflow bundle identifier',
  })
  exportable = Option.Boolean('--exportable', {
    description:
      "If this environment variable is fine for export, i.e. the Don't Export box is left unchecked (Defaults to Don't Export). This option is ignored for workflow configuration items",
  })
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      await client.setConfiguration(
        this.variable as unknown,
        this.toValue as unknown,
        this.inWorkflow as unknown,
        this.exportable as unknown
      )

      const output = formatter.formatSuccess('setConfiguration completed successfully')
      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}
