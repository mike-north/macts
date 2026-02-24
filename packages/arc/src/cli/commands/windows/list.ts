import { Command, Option } from 'clipanion'
import { getClient } from '../../sdk.js'
import { createFormatter } from '../../output/index.js'

/**
 * List windows.
 */
export class ListWindowsCommand extends Command {
  static override paths = [['arc', 'windows', 'list']]

  static override usage = Command.Usage({
    description: 'List windows',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const items = await client.windows.list()

      const output = formatter.formatList(
        items.map((item) => ({
          id: item.id,
          name: item.name,
          index: item.index,
          closeable: item.closeable,
          minimizable: item.minimizable,
          minimized: item.minimized,
          resizable: item.resizable,
          visible: item.visible,
          zoomable: item.zoomable,
          zoomed: item.zoomed,
          activeTab: item.activeTab,
          activeSpace: item.activeSpace,
          incognito: item.incognito,
          mode: item.mode,
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
