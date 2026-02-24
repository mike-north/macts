import { Command, Option } from 'clipanion'
import { getClient } from '../../../sdk.js'
import { createFormatter } from '../../../output/index.js'

/**
 * List userplaylists.
 */
export class ListUserPlaylistsCommand extends Command {
  static override paths = [['music', 'sources', 'userPlaylists', 'list']]

  static override usage = Command.Usage({
    description: 'List userplaylists',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  sourceId = Option.String('--source-id', { required: true, description: 'Source ID' })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const items = await client.userplaylists.list()

      const output = formatter.formatList(
        items.map((item) => ({
          shared: item.shared,
          smart: item.smart,
          genius: item.genius,
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
