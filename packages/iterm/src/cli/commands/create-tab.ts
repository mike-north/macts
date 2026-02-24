import { Command, Option } from 'clipanion'
import { getClient } from '../sdk.js'
import { createFormatter } from '../output/index.js'

/**
 * Create a new tab
 */
export class CreateTabCommand extends Command {
  static override paths = [['iterm', 'create-tab']]

  static override usage = Command.Usage({
    description: 'Create a new tab',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  withProfile = Option.String('--with-profile', { required: true, description: 'The profile name' })
  command = Option.String('--command', { required: false, description: 'Shell command to run' })
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      await client.createTab(this.withProfile as unknown, this.command as unknown)

      const output = formatter.formatSuccess('createTab completed successfully')
      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}
