import { Command, Option } from 'clipanion'
import { getClient } from '../sdk.js'
import { createFormatter } from '../output/index.js'

/**
 * Generate a list of completions given a string
 */
export class CompleteCommand extends Command {
  static override paths = [['omnifocus', 'complete']]

  static override usage = Command.Usage({
    description: 'Generate a list of completions given a string',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  text = Option.String('--text', { required: true, description: 'Text to complete' })
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      await client.complete(this.text as unknown as Parameters<typeof client.complete>[0])

      const output = formatter.formatSuccess('complete completed successfully')
      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}
