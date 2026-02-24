import { Command, Option } from 'clipanion'
import { getClient } from '../../../../sdk.js'
import { createFormatter } from '../../../../output/index.js'

/**
 * Create a new filetrack.
 */
export class CreateFileTrackCommand extends Command {
  static override paths = [['tv', 'sources', 'userPlaylists', 'fileTracks', 'create']]

  static override usage = Command.Usage({
    description: 'Create a new filetrack',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  sourceId = Option.String('--source-id', { required: true, description: 'Source ID' })
  userPlaylistId = Option.String('--user-playlist-id', {
    required: true,
    description: 'UserPlaylist ID',
  })
  location = Option.String('--location', {
    required: true,
    description: 'the location of the file represented by this track',
  })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const item = await client.filetracks.create({
        location: this.location,
      } as Record<string, unknown>)

      const output = formatter.format({
        message: 'FileTrack created successfully',
        id: item.id,
        location: item.location,
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
