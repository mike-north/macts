import { Command, Option } from 'clipanion'
import { getClient } from '../../../sdk.js'
import { createFormatter } from '../../../output/index.js'

/**
 * List tabs.
 */
export class ListTabsCommand extends Command {
  static override paths = [['iterm', 'windows', 'tabs', 'list']]

  static override usage = Command.Usage({
    description: 'List tabs',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  windowId = Option.String('--window-id', { required: true, description: 'Window identifier' })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const page = await client.tabs.list(Number(this.windowId))

      const output = formatter.formatList(
        page.items.map((item) => ({
          index: item.index,
          title: item.title,
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
