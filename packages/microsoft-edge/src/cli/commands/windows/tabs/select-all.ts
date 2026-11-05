import { Command, Option } from 'clipanion'
import { getClient } from '../../../sdk.js'
import { createFormatter } from '../../../output/index.js'

/**
 * Select all
 */
export class SelectAllTabCommand extends Command {
  static override paths = [['microsoft-edge', 'windows', 'tabs', 'select-all']]

  static override usage = Command.Usage({
    description: 'Select all',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  windowId = Option.String('--window-id', { required: true, description: 'Window identifier' })
  tabId = Option.String({ name: 'id', required: true })
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      await client.tabs.selectAll(
        this.windowId as unknown as Parameters<typeof client.tabs.selectAll>[0],
        this.tabId as unknown as Parameters<typeof client.tabs.selectAll>[1]
      )

      const output = formatter.formatSuccess('selectAll completed successfully')
      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}
