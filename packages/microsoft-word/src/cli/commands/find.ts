import { Command, Option } from 'clipanion'
import { getClient } from '../sdk.js'
import { createFormatter } from '../output/index.js'

/**
 * Find text in the document
 */
export class FindCommand extends Command {
  static override paths = [['microsoft-word', 'find']]

  static override usage = Command.Usage({
    description: 'Find text in the document',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  findText = Option.String('--find-text', { required: true, description: 'The text to search for' })
  matchCase = Option.Boolean('--match-case', { description: 'Whether to match case' })
  matchWholeWord = Option.Boolean('--match-whole-word', {
    description: 'Whether to match whole words only',
  })
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      await client.find(
        this.findText as unknown,
        this.matchCase as unknown,
        this.matchWholeWord as unknown
      )

      const output = formatter.formatSuccess('find completed successfully')
      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}
