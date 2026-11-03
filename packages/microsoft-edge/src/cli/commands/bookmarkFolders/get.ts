import { Command, Option } from 'clipanion'
import { getClient } from '../../sdk.js'
import { createFormatter } from '../../output/index.js'

/**
 * Get a bookmark folder by ID.
 */
export class GetBookmarkFolderCommand extends Command {
  static override paths = [['microsoft-edge', 'bookmarkFolders', 'get']]

  static override usage = Command.Usage({
    description: 'Get a bookmark folder by ID',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })

  bookmarkFolderId = Option.String({ name: 'id', required: true })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const item = await client.bookmarkFolders.get(this.bookmarkFolderId)

      const output = formatter.format({
        id: item.id,
        title: item.title,
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
