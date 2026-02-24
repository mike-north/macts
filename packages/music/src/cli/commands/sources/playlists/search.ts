import { Command, Option } from 'clipanion'
import { getClient } from '../../../sdk.js'
import { createFormatter } from '../../../output/index.js'

/**
 * search a playlist for tracks matching the search string. Identical to entering search text in the Search field.
 */
export class SearchPlaylistCommand extends Command {
  static override paths = [['music', 'sources', 'playlists', 'search']]

  static override usage = Command.Usage({
    description:
      'search a playlist for tracks matching the search string. Identical to entering search text in the Search field.',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  sourceId = Option.String('--source-id', { required: true, description: 'Source ID' })

  playlistId = Option.String({ required: true })
  for = Option.String('--for', { required: true, description: 'the search text' })
  only = Option.String('--only', {
    required: false,
    description: 'area to search (default is all)',
  })
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      await client.playlists.search(this.for as unknown, this.only as unknown)

      const output = formatter.formatSuccess('search completed successfully')
      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}
