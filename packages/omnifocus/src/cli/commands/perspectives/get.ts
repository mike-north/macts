import { Command, Option } from 'clipanion'
import { getClient } from '../../sdk.js'
import { createFormatter } from '../../output/index.js'

/**
 * Get a perspective by ID.
 */
export class GetPerspectiveCommand extends Command {
  static override paths = [['omnifocus', 'perspectives', 'get']]

  static override usage = Command.Usage({
    description: 'Get a perspective by ID',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })

  perspectiveId = Option.String({ required: true })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const item = await client.perspectives.get(this.perspectiveId)

      const output = formatter.format({
        id: item.id,
        name: item.name,
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
