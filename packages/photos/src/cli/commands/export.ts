import { Command, Option } from 'clipanion'
import { getClient } from '../sdk.js'
import { createFormatter } from '../output/index.js'

/**
 * Export media items to the specified location as files
 */
export class ExportCommand extends Command {
  static override paths = [['photos', 'export']]

  static override usage = Command.Usage({
    description: 'Export media items to the specified location as files',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  mediaItems = Option.String('--media-items', {
    required: true,
    description: 'The list of media items to export',
  })
  to = Option.String('--to', { required: true, description: 'The destination of the export' })
  usingOriginals = Option.Boolean('--using-originals', {
    description: 'Export the original files if true, otherwise export rendered jpgs',
  })
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      await client._export(
        this.mediaItems as unknown,
        this.to as unknown,
        this.usingOriginals as unknown
      )

      const output = formatter.formatSuccess('export completed successfully')
      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}
