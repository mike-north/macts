import { Command, Option } from 'clipanion'
import { getClient } from '../../../sdk.js'
import { createFormatter } from '../../../output/index.js'

/**
 * Create a new bookmark.
 */
export class CreateBookmarkCommand extends Command {
  static override paths = [['microsoft-word', 'documents', 'bookmarks', 'create']]

  static override usage = Command.Usage({
    description: 'Create a new bookmark',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  documentId = Option.String('--document-id', { required: true, description: 'Document ID' })
  name = Option.String('--name', { required: true, description: 'The name of the bookmark' })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const item = await client.bookmarks.create({
        name: this.name,
      } as Record<string, unknown>)

      const output = formatter.format({
        message: 'Bookmark created successfully',
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
