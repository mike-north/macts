import { Command, Option } from 'clipanion'
import { getClient } from '../sdk.js'
import { createFormatter } from '../output/index.js'

/**
 * Get a reference to the currently selected window.
 */
export class CurrentWindowCommand extends Command {
  static override paths = [['iterm', 'current-window']]

  static override usage = Command.Usage({
    description: 'Get a reference to the currently selected window.',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const result = await client.currentWindow()

      const output = formatter.format(result)
      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}
