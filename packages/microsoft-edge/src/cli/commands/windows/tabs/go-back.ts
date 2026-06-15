import { Command, Option } from 'clipanion'
import { getClient } from '../../../sdk.js'
import { createFormatter } from '../../../output/index.js'

/**
 * Go Back (If Possible)
 */
export class GoBackTabCommand extends Command {
  static override paths = [['microsoft-edge', 'windows', 'tabs', 'go-back']]

  static override usage = Command.Usage({
    description: 'Go Back (If Possible)',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  windowId = Option.String('--window-id', { required: true, description: 'Window ID' })
  tabId = Option.String('--tab-id', { required: true, description: 'Tab identifier' })
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      await client.tabs.goBack(this.tabId as unknown as Parameters<typeof client.tabs.goBack>[0])

      const output = formatter.formatSuccess('goBack completed successfully')
      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}
