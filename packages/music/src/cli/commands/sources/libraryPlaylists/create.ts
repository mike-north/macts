import { Command, Option } from 'clipanion'
import { getClient } from '../../../sdk.js'
import { createFormatter } from '../../../output/index.js'

/**
 * Create a new libraryplaylist.
 */
export class CreateLibraryPlaylistCommand extends Command {
  static override paths = [['music', 'sources', 'libraryPlaylists', 'create']]

  static override usage = Command.Usage({
    description: 'Create a new libraryplaylist',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  sourceId = Option.String('--source-id', { required: true, description: 'Source ID' })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const item = await client.libraryplaylists.create({} as Record<string, unknown>)

      const output = formatter.format({
        message: 'LibraryPlaylist created successfully',
        id: item.id,
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
