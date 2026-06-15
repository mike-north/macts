import { Command, Option } from 'clipanion'
import { getClient } from '../../../sdk.js'
import { createFormatter } from '../../../output/index.js'

/**
 * Move playlist(s) to a new location
 */
export class MovePlaylistCommand extends Command {
  static override paths = [['tv', 'sources', 'playlists', 'move']]

  static override usage = Command.Usage({
    description: 'Move playlist(s) to a new location',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  sourceId = Option.String('--source-id', { required: true, description: 'Source ID' })
  playlistId = Option.String({ required: true })
  to = Option.String('--to', {
    required: true,
    description: 'the new location for the playlist(s)',
  })
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      await client.playlists.move(this.to as unknown as Parameters<typeof client.playlists.move>[0])

      const output = formatter.formatSuccess('move completed successfully')
      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}
