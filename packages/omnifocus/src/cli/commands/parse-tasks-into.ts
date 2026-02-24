import { Command, Option } from 'clipanion'
import { getClient } from '../sdk.js'
import { createFormatter } from '../output/index.js'

/**
 * Converts a textual representation of tasks into tasks
 */
export class ParseTasksIntoCommand extends Command {
  static override paths = [['omnifocus', 'parse-tasks-into']]

  static override usage = Command.Usage({
    description: 'Converts a textual representation of tasks into tasks',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  text = Option.String('--text', { required: true, description: 'Text to parse' })
  into = Option.String('--into', { required: true, description: 'Target container' })
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      await client.parseTasksInto(this.text as unknown, this.into as unknown)

      const output = formatter.formatSuccess('parseTasksInto completed successfully')
      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}
