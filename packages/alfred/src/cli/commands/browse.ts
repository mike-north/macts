import { Command, Option } from 'clipanion'
import { getClient } from '../sdk.js'
import { createFormatter } from '../output/index.js'

/**
 * Show Alfred file system navigation for given path
 */
export class BrowseCommand extends Command {
  static override paths = [['alfred', 'browse']]

  static override usage = Command.Usage({
    description: 'Show Alfred file system navigation for given path',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  browsePath = Option.String('--path', {
    required: true,
    description: 'The path or search string to browse',
  })
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      await client.browse(this.browsePath as unknown as Parameters<typeof client.browse>[0])

      const output = formatter.formatSuccess('browse completed successfully')
      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}
