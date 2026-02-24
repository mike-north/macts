import { Command, Option } from 'clipanion'
import { getClient } from '../sdk.js'
import { createFormatter } from '../output/index.js'

/**
 * Cut the selected content to the clipboard
 */
export class CutObjectCommand extends Command {
  static override paths = [['microsoft-word', 'cut-object']]

  static override usage = Command.Usage({
    description: 'Cut the selected content to the clipboard',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      await client.cutObject()

      const output = formatter.formatSuccess('cutObject completed successfully')
      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}
