import { Command, Option } from 'clipanion'
import { getClient } from '../sdk.js'
import { createFormatter } from '../output/index.js'

/**
 * Hides a hotkey window. Only to be called on windows that are hotkey windows.
 */
export class HideHotkeyWindowCommand extends Command {
  static override paths = [['iterm', 'hide-hotkey-window']]

  static override usage = Command.Usage({
    description: 'Hides a hotkey window. Only to be called on windows that are hotkey windows.',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      await client.hideHotkeyWindow()

      const output = formatter.formatSuccess('hideHotkeyWindow completed successfully')
      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}
