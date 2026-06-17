import { Command, Option } from 'clipanion'
import { getClient } from '../../../../sdk.js'
import { createFormatter } from '../../../../output/index.js'

/**
 * Get a requiredresource by ID.
 */
export class GetRequiredResourceCommand extends Command {
  static override paths = [['automator', 'workflows', 'actions', 'requiredResources', 'get']]

  static override usage = Command.Usage({
    description: 'Get a requiredresource by ID',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })

  requiredResourceId = Option.String({ required: true })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const item = await client.requiredresources.get(this.requiredResourceId)

      const output = formatter.format({
        kind: item.kind,
        name: item.name,
        resource: item.resource,
        version: item.version,
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
