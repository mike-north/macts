import { Command, Option } from 'clipanion'
import { getClient } from '../../../sdk.js'
import { createFormatter } from '../../../output/index.js'

/**
 * Create a new artwork.
 */
export class CreateArtworkCommand extends Command {
  static override paths = [['music', 'tracks', 'artworks', 'create']]

  static override usage = Command.Usage({
    description: 'Create a new artwork',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  trackId = Option.String('--track-id', { required: true, description: 'Track ID' })
  data = Option.String('--data', {
    required: true,
    description: 'data for this artwork, in the form of a picture',
  })
  description = Option.String('--description', {
    required: true,
    description: 'description of artwork as a string',
  })
  kind = Option.String('--kind', {
    required: true,
    description: 'kind or purpose of this piece of artwork',
  })
  rawData = Option.String('--raw-data', {
    required: true,
    description: 'data for this artwork, in original format',
  })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      // Assert the SDK's precise create-input type. CLI flags surface every field as a
      // string/boolean primitive, which may not structurally overlap the input's richer
      // member types (e.g. a color object) or exact-optional members, so we assert via
      // `unknown`. The RPC layer coerces/validates the payload at runtime.
      const item = await client.artworks.create({
        data: this.data,
        description: this.description,
        kind: this.kind,
        rawData: this.rawData,
      } as unknown as Parameters<typeof client.artworks.create>[0])

      const output = formatter.format({
        message: 'Artwork created successfully',
        data: item.data,
        description: item.description,
        downloaded: item.downloaded,
        format: item.format,
        kind: item.kind,
        rawData: item.rawData,
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
