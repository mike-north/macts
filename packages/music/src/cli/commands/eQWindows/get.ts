import { Command, Option } from 'clipanion'
import { getClient } from '../../sdk.js'
import { createFormatter } from '../../output/index.js'

/**
 * Get a eqwindow by ID.
 */
export class GetEQWindowCommand extends Command {
  static override paths = [['music', 'eQWindows', 'get']]

  static override usage = Command.Usage({
    description: 'Get a eqwindow by ID',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })

  eQWindowId = Option.String({ required: true })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const item = await client.eqwindows.get(this.eQWindowId)

      const output = formatter.format({
        id: item.id,
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
