import { Command, Option } from 'clipanion'
import { getClient } from '../sdk.js'
import { createFormatter } from '../output/index.js'

/**
 * cause the target process to behave as if key codes were entered
 */
export class KeyCodeCommand extends Command {
  static override paths = [['system-events', 'key-code']]

  static override usage = Command.Usage({
    description: 'cause the target process to behave as if key codes were entered',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  using = Option.String('--using', {
    required: false,
    description: 'modifiers with which the key codes are to be entered',
  })
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      await client.keyCode(this.using as unknown)

      const output = formatter.formatSuccess('keyCode completed successfully')
      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}
