import { Command, Option } from 'clipanion'
import { getClient } from '../../../sdk.js'
import { createFormatter } from '../../../output/index.js'

/**
 * List bookmarkfolders.
 */
export class ListBookmarkFoldersCommand extends Command {
  static override paths = [['microsoft-edge', 'bookmarkFolders', 'bookmarkFolders', 'list']]

  static override usage = Command.Usage({
    description: 'List bookmarkfolders',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const items = await client.bookmarkfolders.list()

      const output = formatter.formatList(
        items.map((item) => ({
          id: item.id,
          title: item.title,
          index: item.index,
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
