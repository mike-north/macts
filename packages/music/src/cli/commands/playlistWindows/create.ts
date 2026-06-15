import { Command, Option } from 'clipanion'
import { getClient } from '../../sdk.js'
import { createFormatter } from '../../output/index.js'

/**
 * Create a new playlistwindow.
 */
export class CreatePlaylistWindowCommand extends Command {
  static override paths = [['music', 'playlistWindows', 'create']]

  static override usage = Command.Usage({
    description: 'Create a new playlistwindow',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      // Assert the SDK's precise create-input type. CLI flags surface every field as a
      // string/boolean primitive, which may not structurally overlap the input's richer
      // member types (e.g. a color object) or exact-optional members, so we assert via
      // `unknown`. The RPC layer coerces/validates the payload at runtime.
      const item = await client.playlistwindows.create(
        {} as unknown as Parameters<typeof client.playlistwindows.create>[0]
      )

      const output = formatter.format({
        message: 'PlaylistWindow created successfully',
        selection: item.selection,
        view: item.view,
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
