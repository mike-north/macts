import { Command, Option } from 'clipanion'
import { getClient } from '../sdk.js'
import { createFormatter } from '../output/index.js'

/**
 * export a source or playlist
 */
export class ExportCommand extends Command {
  static override paths = [['music', 'export']]

  static override usage = Command.Usage({
    description: 'export a source or playlist',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  as = Option.String('--as', {
    required: false,
    description: 'the format to export for a playlist',
  })
  to = Option.String('--to', { required: false, description: 'the destination of the export' })
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      await client._export(
        this.as as unknown as Parameters<typeof client._export>[0],
        this.to as unknown as Parameters<typeof client._export>[1]
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
