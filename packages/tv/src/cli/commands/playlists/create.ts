import { Command, Option } from 'clipanion'
import { getClient } from '../../sdk.js'
import { createFormatter } from '../../output/index.js'

/**
 * Create a new playlist.
 */
export class CreatePlaylistCommand extends Command {
  static override paths = [['tv', 'playlists', 'create']]

  static override usage = Command.Usage({
    description: 'Create a new playlist',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  description = Option.String('--description', {
    required: true,
    description: 'the description of the playlist',
  })
  name = Option.String('--name', { required: true, description: 'the name of the playlist' })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const item = await client.playlists.create({
        description: this.description,
        name: this.name,
      } as Record<string, unknown>)

      const output = formatter.format({
        message: 'Playlist created successfully',
        id: item.id,
        description: item.description,
        duration: item.duration,
        name: item.name,
        parent: item.parent,
        size: item.size,
        specialKind: item.specialKind,
        time: item.time,
        visible: item.visible,
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
