import { Command, Option } from 'clipanion'
import { getClient } from '../../sdk.js'
import { createFormatter } from '../../output/index.js'

/**
 * List media items.
 */
export class ListMediaItemsCommand extends Command {
  static override paths = [['photos', 'mediaItems', 'list']]

  static override usage = Command.Usage({
    description: 'List media items',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const page = await client.mediaItems.list()

      const output = formatter.formatList(
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
