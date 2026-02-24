import { Command, Option } from 'clipanion'
import { getClient } from '../sdk.js'
import { createFormatter } from '../output/index.js'

/**
 * Searches the web using Safari's current search provider.
 */
export class SearchTheWebCommand extends Command {
  static override paths = [['safari', 'search-the-web']]

  static override usage = Command.Usage({
    description: "Searches the web using Safari's current search provider.",
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  for = Option.String('--for', { required: true, description: 'The query to search for.' });
  in = Option.String('--in', {
    required: false,
    description: 'The tab that the search results should shown in.',
  })
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      await client.searchTheWeb(this.for as unknown, this.in as unknown)

      const output = formatter.formatSuccess('searchTheWeb completed successfully')
      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}
