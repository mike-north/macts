import { Command, Option } from 'clipanion'
import { getClient } from '../../../sdk.js'
import { createFormatter } from '../../../output/index.js'

/**
 * Get a tab by index.
 */
export class GetTabCommand extends Command {
  static override paths = [['iterm', 'windows', 'tabs', 'get']]

  static override usage = Command.Usage({
    description:
      'Get a tab by index. A tab has no id, so it is selected by its zero-based position within its window, which drifts when tabs open, close or move.',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  windowId = Option.String('--window-id', { required: true, description: 'Window identifier' })

  tabId = Option.String({ name: 'index', required: true })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const item = await client.tabs.get(this.windowId, this.tabId)

      const output = formatter.format({
        index: item.index,
        title: item.title,
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
