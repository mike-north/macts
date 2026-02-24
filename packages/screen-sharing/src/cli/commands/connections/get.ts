import { Command, Option } from 'clipanion'
import { getClient } from '../../sdk.js'
import { createFormatter } from '../../output/index.js'

/**
 * Get a connection by ID.
 */
export class GetConnectionCommand extends Command {
  static override paths = [['screen-sharing', 'connections', 'get']]

  static override usage = Command.Usage({
    description: 'Get a connection by ID',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })

  connectionId = Option.String({ required: true })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const item = await client.connections.get(this.connectionId)

      const output = formatter.format({
        name: item.name,
        id: item.id,
        url: item.url,
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
