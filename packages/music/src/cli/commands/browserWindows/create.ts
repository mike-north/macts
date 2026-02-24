import { Command, Option } from 'clipanion'
import { getClient } from '../../sdk.js'
import { createFormatter } from '../../output/index.js'

/**
 * Create a new browserwindow.
 */
export class CreateBrowserWindowCommand extends Command {
  static override paths = [['music', 'browserWindows', 'create']]

  static override usage = Command.Usage({
    description: 'Create a new browserwindow',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  view = Option.String('--view', {
    required: true,
    description: 'the playlist currently displayed in the window',
  })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const item = await client.browserwindows.create({
        view: this.view,
      } as Record<string, unknown>)

      const output = formatter.format({
        message: 'BrowserWindow created successfully',
        selection: item.selection,
        view: item.view,
      })

      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}
