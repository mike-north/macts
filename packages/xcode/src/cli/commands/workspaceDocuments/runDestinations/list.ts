import { Command, Option } from 'clipanion'
import { getClient } from '../../../sdk.js'
import { createFormatter } from '../../../output/index.js'

/**
 * List run destinations.
 */
export class ListRunDestinationsCommand extends Command {
  static override paths = [['xcode', 'workspaceDocuments', 'runDestinations', 'list']]

  static override usage = Command.Usage({
    description: 'List run destinations',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  workspaceName = Option.String('--workspace-name', {
    required: true,
    description: 'Workspace document name',
  })
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
      const page = await client.runDestinations.list(this.workspaceName, {
        ...(this.pageSize === undefined ? {} : { pageSize: Number(this.pageSize) }),
        ...(this.cursor === undefined ? {} : { cursor: this.cursor }),
      })

      const output = formatter.formatPage(
        page.items.map((item) => ({
          name: item.name,
          architecture: item.architecture,
          platform: item.platform,
          device: item.device,
          companionDevice: item.companionDevice,
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
