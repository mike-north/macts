import { Command, Option } from 'clipanion'
import { getClient } from '../../../sdk.js'
import { createFormatter } from '../../../output/index.js'

/**
 * List bookmarks.
 */
export class ListBookmarksCommand extends Command {
  static override paths = [['microsoft-word', 'documents', 'bookmarks', 'list']]

  static override usage = Command.Usage({
    description: 'List bookmarks',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  documentId = Option.String('--document-id', { required: true, description: 'Document ID' })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const items = await client.bookmarks.list()

      const output = formatter.formatList(
        items.map((item) => ({
          name: item.name,
          start: item.start,
          end: item.end,
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
