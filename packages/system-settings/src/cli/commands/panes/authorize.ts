import { Command, Option } from 'clipanion'
import { getClient } from '../../sdk.js'
import { createFormatter } from '../../output/index.js'

/**
 * Prompt for authorization for a settings pane. Deprecated: no longer does anything.
 */
export class AuthorizePaneCommand extends Command {
  static override paths = [['system-settings', 'panes', 'authorize']]

  static override usage = Command.Usage({
    description:
      'Prompt for authorization for a settings pane. Deprecated: no longer does anything.',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  paneId = Option.String({ required: true })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      await client.panes.authorize()

      const output = formatter.formatSuccess('authorize completed successfully')
      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}
