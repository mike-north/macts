import { Command, Option } from 'clipanion'
import { getClient } from '../sdk.js'
import { createFormatter } from '../output/index.js'

/**
 * Export a movie to another file
 */
export class ExportCommand extends Command {
  static override paths = [['quicktime-player', 'export']]

  static override usage = Command.Usage({
    description: 'Export a movie to another file',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  in = Option.String('--in', { required: true, description: 'the destination file' })
  usingSettingsPreset = Option.String('--using-settings-preset', {
    required: true,
    description: 'the name of the export settings preset to use',
  })
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      await client._export(this.in as unknown, this.usingSettingsPreset as unknown)

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
