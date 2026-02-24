import { Command, Option } from 'clipanion'
import { getClient } from '../../sdk.js'
import { createFormatter } from '../../output/index.js'

/**
 * Create a new source.
 */
export class CreateSourceCommand extends Command {
  static override paths = [['tv', 'sources', 'create']]

  static override usage = Command.Usage({
    description: 'Create a new source',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const item = await client.sources.create({} as Record<string, unknown>)

      const output = formatter.format({
        message: 'Source created successfully',
        id: item.id,
        capacity: item.capacity,
        freeSpace: item.freeSpace,
        kind: item.kind,
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
