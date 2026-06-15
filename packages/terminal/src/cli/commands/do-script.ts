import { Command, Option } from 'clipanion'
import { getClient } from '../sdk.js'
import { createFormatter } from '../output/index.js'

/**
 * Execute a shell command in a Terminal window or tab
 */
export class DoScriptCommand extends Command {
  static override paths = [['terminal', 'do-script']]

  static override usage = Command.Usage({
    description: 'Execute a shell command in a Terminal window or tab',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  command = Option.String('--command', { required: true, description: 'The command to execute' });
  in = Option.String('--in', {
    required: false,
    description: 'The window or tab to run the command in',
  })
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      await client.doScript(
        this.command as unknown as Parameters<typeof client.doScript>[0],
        this.in as unknown as Parameters<typeof client.doScript>[1]
      )

      const output = formatter.formatSuccess('doScript completed successfully')
      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}
