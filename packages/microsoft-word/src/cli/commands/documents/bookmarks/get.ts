import { Command, Option } from 'clipanion'
import { getClient } from '../../../sdk.js'
import { createFormatter } from '../../../output/index.js'

/**
 * Get a bookmark by ID.
 */
export class GetBookmarkCommand extends Command {
  static override paths = [['microsoft-word', 'documents', 'bookmarks', 'get']]

  static override usage = Command.Usage({
    description: 'Get a bookmark by ID',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  documentId = Option.String('--document-id', { required: true, description: 'Document ID' })

  bookmarkId = Option.String({ required: true })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const item = await client.bookmarks.get(this.bookmarkId)

      const output = formatter.format({
        name: item.name,
        start: item.start,
        end: item.end,
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
