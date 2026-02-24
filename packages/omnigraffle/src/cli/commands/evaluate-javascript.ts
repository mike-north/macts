import { Command, Option } from 'clipanion'
import { getClient } from '../sdk.js'
import { createFormatter } from '../output/index.js'

/**
 * Evaluate JavaScript and return the result
 */
export class EvaluateJavascriptCommand extends Command {
  static override paths = [['omnigraffle', 'evaluate-javascript']]

  static override usage = Command.Usage({
    description: 'Evaluate JavaScript and return the result',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  script = Option.String('--script', { required: true, description: 'JavaScript code to evaluate' })
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      await client.evaluateJavascript(this.script as unknown)

      const output = formatter.formatSuccess('evaluateJavascript completed successfully')
      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}
