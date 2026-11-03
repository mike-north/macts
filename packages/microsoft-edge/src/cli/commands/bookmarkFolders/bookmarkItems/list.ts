import { Command, Option } from 'clipanion'
import { getClient } from '../../../sdk.js'
import { createFormatter } from '../../../output/index.js'

/**
 * List bookmark items.
 */
export class ListBookmarkItemsCommand extends Command {
  static override paths = [['microsoft-edge', 'bookmarkFolders', 'bookmarkItems', 'list']]

  static override usage = Command.Usage({
    description: 'List bookmark items',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  folderId = Option.String('--folder-id', {
    required: true,
    description: 'Bookmark folder identifier',
  })
  pageSize = Option.String('--page-size', {
    description: 'The most items to show, from 1 to 100 (default 25)',
  })
  cursor = Option.String('--cursor', {
    description: 'Continue from the previous page, as its output says',
  })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const page = await client.bookmarkItems.list(this.folderId, {
        ...(this.pageSize === undefined ? {} : { pageSize: Number(this.pageSize) }),
        ...(this.cursor === undefined ? {} : { cursor: this.cursor }),
      })

      const output = formatter.formatPage(
        page.items.map((item) => ({
          id: item.id,
          title: item.title,
          uRL: item.uRL,
          index: item.index,
        })),
        page.nextCursor
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
