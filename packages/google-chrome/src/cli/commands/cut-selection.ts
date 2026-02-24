import { Command, Option } from 'clipanion'
import { getClient } from '../sdk.js'
import { createFormatter } from '../output/index.js'

/**
 * Cut selected text (If Possible).
 */
export class CutSelectionCommand extends Command {
  static override paths = [['google-chrome', 'cut-selection']]

  static override usage = Command.Usage({
    description: 'Cut selected text (If Possible).',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      await client.cutSelection()

      const output = formatter.formatSuccess('cutSelection completed successfully')
      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}
