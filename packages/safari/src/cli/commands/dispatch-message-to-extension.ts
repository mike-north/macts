import { Command, Option } from 'clipanion'
import { getClient } from '../sdk.js'
import { createFormatter } from '../output/index.js'

/**
 * Dispatch a message to a Safari Extension.
 */
export class DispatchMessageToExtensionCommand extends Command {
  static override paths = [['safari', 'dispatch-message-to-extension']]

  static override usage = Command.Usage({
    description: 'Dispatch a message to a Safari Extension.',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      await client.dispatchMessageToExtension()

      const output = formatter.formatSuccess('dispatchMessageToExtension completed successfully')
      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}
