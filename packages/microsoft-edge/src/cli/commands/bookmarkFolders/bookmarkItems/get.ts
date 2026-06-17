import { Command, Option } from 'clipanion'
import { getClient } from '../../../sdk.js'
import { createFormatter } from '../../../output/index.js'

/**
 * Get a bookmarkitem by ID.
 */
export class GetBookmarkItemCommand extends Command {
  static override paths = [['microsoft-edge', 'bookmarkFolders', 'bookmarkItems', 'get']]

  static override usage = Command.Usage({
    description: 'Get a bookmarkitem by ID',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })

  bookmarkItemId = Option.String({ required: true })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const item = await client.bookmarkitems.get(this.bookmarkItemId)

      const output = formatter.format({
        id: item.id,
        title: item.title,
        uRL: item.uRL,
        index: item.index,
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
