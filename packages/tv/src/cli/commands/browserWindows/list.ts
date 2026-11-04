import { Command, Option } from 'clipanion'
import { getClient } from '../../sdk.js'
import { createFormatter } from '../../output/index.js'

/**
 * List browser windows.
 */
export class ListBrowserWindowsCommand extends Command {
  static override paths = [['tv', 'browserWindows', 'list']]

  static override usage = Command.Usage({
    description: 'List browser windows',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const page = await client.browserWindows.list()

      const output = formatter.formatList(
        page.items.map((item) => ({
          id: item.id,
          selection: item.selection,
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
