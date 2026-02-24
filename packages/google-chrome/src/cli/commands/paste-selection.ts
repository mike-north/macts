import { Command, Option } from 'clipanion'
import { getClient } from '../sdk.js'
import { createFormatter } from '../output/index.js'

/**
 * Paste text (If Possible).
 */
export class PasteSelectionCommand extends Command {
  static override paths = [['google-chrome', 'paste-selection']]

  static override usage = Command.Usage({
    description: 'Paste text (If Possible).',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      await client.pasteSelection()

      const output = formatter.formatSuccess('pasteSelection completed successfully')
      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}
