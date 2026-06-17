import { Command, Option } from 'clipanion'
import { getClient } from '../../../../sdk.js'
import { createFormatter } from '../../../../output/index.js'

/**
 * List requiredresources.
 */
export class ListRequiredResourcesCommand extends Command {
  static override paths = [['automator', 'workflows', 'actions', 'requiredResources', 'list']]

  static override usage = Command.Usage({
    description: 'List requiredresources',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  actionId = Option.String('--action-id', { required: true, description: 'Action identifier' })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const items = await client.requiredresources.list(this.actionId)

      const output = formatter.formatList(
        items.map((item) => ({
          kind: item.kind,
          name: item.name,
          resource: item.resource,
          version: item.version,
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
