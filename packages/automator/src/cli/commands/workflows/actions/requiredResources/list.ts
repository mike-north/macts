import { Command, Option } from 'clipanion'
import { getClient } from '../../../../sdk.js'
import { createFormatter } from '../../../../output/index.js'

/**
 * List required resources.
 */
export class ListRequiredResourcesCommand extends Command {
  static override paths = [['automator', 'workflows', 'actions', 'requiredResources', 'list']]

  static override usage = Command.Usage({
    description: 'List required resources',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  actionId = Option.String('--action-id', { required: true, description: 'Action identifier' })
  pageSize = Option.String('--page-size', {
    description: 'The most items to show, from 1 to 100 (default 25)',
  })
  cursor = Option.String('--cursor', {
    description: 'Continue from the previous page, as its output says',
  })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const page = await client.requiredResources.list(this.actionId, {
        ...(this.pageSize === undefined ? {} : { pageSize: Number(this.pageSize) }),
        ...(this.cursor === undefined ? {} : { cursor: this.cursor }),
      })

      const output = formatter.formatPage(
        page.items.map((item) => ({
          kind: item.kind,
          name: item.name,
          resource: item.resource,
          version: item.version,
        })),
        page.nextCursor
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
