import { Command, Option } from 'clipanion'
import { getClient } from '../../../sdk.js'
import { createFormatter } from '../../../output/index.js'

/**
 * List anchors.
 */
export class ListAnchorsCommand extends Command {
  static override paths = [['system-settings', 'panes', 'anchors', 'list']]

  static override usage = Command.Usage({
    description: 'List anchors',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  paneId = Option.String('--pane-id', { required: true, description: 'Pane ID' })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const items = await client.anchors.list()

      const output = formatter.formatList(
        items.map((item) => ({
          name: item.name,
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
