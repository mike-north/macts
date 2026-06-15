import { Command, Option } from 'clipanion'
import { getClient } from '../../../sdk.js'
import { createFormatter } from '../../../output/index.js'

/**
 * Undo the last change
 */
export class UndoTabCommand extends Command {
  static override paths = [['microsoft-edge', 'windows', 'tabs', 'undo']]

  static override usage = Command.Usage({
    description: 'Undo the last change',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  windowId = Option.String('--window-id', { required: true, description: 'Window ID' })
  tabId = Option.String('--tab-id', { required: true, description: 'Tab identifier' })
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      await client.tabs.undo(this.tabId as unknown as Parameters<typeof client.tabs.undo>[0])

      const output = formatter.formatSuccess('undo completed successfully')
      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}
