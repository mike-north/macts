import { Command, Option } from 'clipanion'
import { getClient } from '../sdk.js'
import { createFormatter } from '../output/index.js'

/**
 * Change theme in Alfred
 */
export class SetThemeCommand extends Command {
  static override paths = [['alfred', 'set-theme']]

  static override usage = Command.Usage({
    description: 'Change theme in Alfred',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  theme = Option.String('--theme', {
    required: true,
    description: 'The name of the theme to switch to',
  })
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      await client.setTheme(this.theme as unknown as Parameters<typeof client.setTheme>[0])

      const output = formatter.formatSuccess('setTheme completed successfully')
      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}
