import { Command, Option } from 'clipanion'
import { getClient } from '../sdk.js'
import { createFormatter } from '../output/index.js'

/**
 * Split a session vertically.
 */
export class SplitVerticallyCommand extends Command {
  static override paths = [['iterm', 'split-vertically']]

  static override usage = Command.Usage({
    description: 'Split a session vertically.',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  withProfile = Option.String('--with-profile', {
    required: true,
    description: 'Name of profile for new session.',
  })
  command = Option.String('--command', { required: false, description: 'Shell command to run' })
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      await client.splitVertically(this.withProfile as unknown, this.command as unknown)

      const output = formatter.formatSuccess('splitVertically completed successfully')
      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}
