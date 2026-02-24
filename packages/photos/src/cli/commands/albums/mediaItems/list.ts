import { Command, Option } from 'clipanion'
import { getClient } from '../../../sdk.js'
import { createFormatter } from '../../../output/index.js'

/**
 * List mediaitems.
 */
export class ListMediaItemsCommand extends Command {
  static override paths = [['photos', 'albums', 'mediaItems', 'list']]

  static override usage = Command.Usage({
    description: 'List mediaitems',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  albumId = Option.String('--album-id', { required: true, description: 'Album ID' })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const items = await client.mediaitems.list()

      const output = formatter.formatList(
        items.map((item) => ({
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
