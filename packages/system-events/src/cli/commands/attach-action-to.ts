import { Command, Option } from 'clipanion'
import { getClient } from '../sdk.js'
import { createFormatter } from '../output/index.js'

/**
 * Attach an action to a folder
 */
export class AttachActionToCommand extends Command {
  static override paths = [['system-events', 'attach-action-to']]

  static override usage = Command.Usage({
    description: 'Attach an action to a folder',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  using = Option.String('--using', {
    required: true,
    description: 'a file containing the script to attach',
  })
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      await client.attachActionTo(this.using as unknown)

      const output = formatter.formatSuccess('attachActionTo completed successfully')
      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}
