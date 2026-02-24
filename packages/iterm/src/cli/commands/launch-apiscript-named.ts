import { Command, Option } from 'clipanion'
import { getClient } from '../sdk.js'
import { createFormatter } from '../output/index.js'

/**
 * Launch API script by name
 */
export class LaunchAPIScriptNamedCommand extends Command {
  static override paths = [['iterm', 'launch-apiscript-named']]

  static override usage = Command.Usage({
    description: 'Launch API script by name',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  arguments = Option.String('--arguments', {
    required: false,
    description: 'Arguments to pass to script',
  })
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      await client.launchAPIScriptNamed(this.arguments as unknown)

      const output = formatter.formatSuccess('launchAPIScriptNamed completed successfully')
      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}
