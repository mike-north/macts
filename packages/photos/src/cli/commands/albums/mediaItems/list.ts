import { Command, Option } from 'clipanion'
import { getClient } from '../../../sdk.js'
import { createFormatter } from '../../../output/index.js'

/**
 * List media items.
 */
export class ListMediaItemsCommand extends Command {
  static override paths = [['photos', 'albums', 'mediaItems', 'list']]

  static override usage = Command.Usage({
    description: 'List media items',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
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
      const page = await client.mediaItems.list({
        ...(this.pageSize === undefined ? {} : { pageSize: Number(this.pageSize) }),
        ...(this.cursor === undefined ? {} : { cursor: this.cursor }),
      })

      const output = formatter.formatPage(
        page.items.map((item) => ({
          id: item.id,
          name: item.name,
          description: item.description,
          filename: item.filename,
          date: item.date,
          height: item.height,
          width: item.width,
          altitude: item.altitude,
          location: item.location,
          favorite: item.favorite,
          keywords: item.keywords,
          size: item.size,
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
