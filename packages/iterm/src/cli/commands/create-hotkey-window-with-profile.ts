import { Command, Option } from 'clipanion'
import { getClient } from '../sdk.js'
import { createFormatter } from '../output/index.js'

/**
 * Create a hotkey window
 */
export class CreateHotkeyWindowWithProfileCommand extends Command {
  static override paths = [['iterm', 'create-hotkey-window-with-profile']]

  static override usage = Command.Usage({
    description: 'Create a hotkey window',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      await client.createHotkeyWindowWithProfile()

      const output = formatter.formatSuccess('createHotkeyWindowWithProfile completed successfully')
      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}
