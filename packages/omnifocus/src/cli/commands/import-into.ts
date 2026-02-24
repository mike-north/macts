import { Command, Option } from 'clipanion'
import { getClient } from '../sdk.js'
import { createFormatter } from '../output/index.js'

/**
 * Imports a file into an existing OmniFocus document
 */
export class ImportIntoCommand extends Command {
  static override paths = [['omnifocus', 'import-into']]

  static override usage = Command.Usage({
    description: 'Imports a file into an existing OmniFocus document',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  file = Option.String('--file', { required: true, description: 'File to import' })
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      await client.importInto(this.file as unknown)

      const output = formatter.formatSuccess('importInto completed successfully')
      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}
