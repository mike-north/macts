import { Command, Option } from 'clipanion'
import { getClient } from '../sdk.js'
import { createFormatter } from '../output/index.js'

/**
 * Restart the computer
 */
export class RestartCommand extends Command {
  static override paths = [['system-events', 'restart']]

  static override usage = Command.Usage({
    description: 'Restart the computer',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  stateSavingPreference = Option.Boolean('--state-saving-preference', {
    description: 'Is the user defined state saving preference followed?',
  })
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      await client.restart(this.stateSavingPreference as unknown)

      const output = formatter.formatSuccess('restart completed successfully')
      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}
