import { Command, Option } from 'clipanion'
import { getClient } from '../../../../sdk.js'
import { createFormatter } from '../../../../output/index.js'

/**
 * Create a new urltrack.
 */
export class CreateURLTrackCommand extends Command {
  static override paths = [['music', 'sources', 'userPlaylists', 'uRLTracks', 'create']]

  static override usage = Command.Usage({
    description: 'Create a new urltrack',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  sourceId = Option.String('--source-id', { required: true, description: 'Source ID' })
  userPlaylistId = Option.String('--user-playlist-id', {
    required: true,
    description: 'UserPlaylist ID',
  })
  address = Option.String('--address', { required: true, description: 'the URL for this track' })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      // Assert the SDK's precise create-input type. CLI flags surface every field as a
      // string/boolean primitive, which may not structurally overlap the input's richer
      // member types (e.g. a color object) or exact-optional members, so we assert via
      // `unknown`. The RPC layer coerces/validates the payload at runtime.
      const item = await client.urltracks.create({
        address: this.address,
      } as unknown as Parameters<typeof client.urltracks.create>[0])

      const output = formatter.format({
        message: 'URLTrack created successfully',
        address: item.address,
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
