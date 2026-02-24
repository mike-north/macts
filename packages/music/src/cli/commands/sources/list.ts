import { Command, Option } from 'clipanion'
import { getClient } from '../../sdk.js'
import { createFormatter } from '../../output/index.js'

/**
 * List sources.
 */
export class ListSourcesCommand extends Command {
  static override paths = [['music', 'sources', 'list']]

  static override usage = Command.Usage({
    description: 'List sources',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const items = await client.sources.list()

      const output = formatter.formatList(
        items.map((item) => ({
          capacity: item.capacity,
          freeSpace: item.freeSpace,
          kind: item.kind,
        }))
      )

      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}
