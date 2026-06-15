import { Command, Option } from 'clipanion'
import { getClient } from '../sdk.js'
import { createFormatter } from '../output/index.js'

/**
 * Split a session horizontally.
 */
export class SplitHorizontallyCommand extends Command {
  static override paths = [['iterm', 'split-horizontally']]

  static override usage = Command.Usage({
    description: 'Split a session horizontally.',
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
      await client.splitHorizontally(
        this.withProfile as unknown as Parameters<typeof client.splitHorizontally>[0],
        this.command as unknown as Parameters<typeof client.splitHorizontally>[1]
      )

      const output = formatter.formatSuccess('splitHorizontally completed successfully')
      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}
