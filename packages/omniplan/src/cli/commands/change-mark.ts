import { Command, Option } from 'clipanion'
import { getClient } from '../sdk.js'
import { createFormatter } from '../output/index.js'

/**
 * Make a change tracking mark on project
 */
export class ChangeMarkCommand extends Command {
  static override paths = [['omniplan', 'change-mark']]

  static override usage = Command.Usage({
    description: 'Make a change tracking mark on project',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      await client.changeMark()

      const output = formatter.formatSuccess('changeMark completed successfully')
      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}
