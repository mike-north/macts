import { Command, Option } from 'clipanion'
import { getClient } from '../sdk.js'
import { createFormatter } from '../output/index.js'

/**
 * Show Alfred with the given text
 */
export class SearchCommand extends Command {
  static override paths = [['alfred', 'search']]

  static override usage = Command.Usage({
    description: 'Show Alfred with the given text',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  query = Option.String('--query', {
    required: false,
    description: 'The search string to populate Alfred with',
  })
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      await client.search(this.query as unknown)

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
