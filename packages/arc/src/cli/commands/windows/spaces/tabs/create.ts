import { Command, Option } from 'clipanion'
import { getClient } from '../../../../sdk.js'
import { createFormatter } from '../../../../output/index.js'

/**
 * Create a new tab.
 */
export class CreateTabCommand extends Command {
  static override paths = [['arc', 'windows', 'spaces', 'tabs', 'create']]

  static override usage = Command.Usage({
    description: 'Create a new tab',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  windowId = Option.String('--window-id', { required: true, description: 'Window ID' })
  spaceId = Option.String('--space-id', { required: true, description: 'Space ID' })
  uRL = Option.String('--u-rl', { required: true, description: 'The url of the tab.' })
  location = Option.String('--location', {
    required: true,
    description:
      "Represents the location of the tab in the sidebar. Can be 'topApp', 'pinned', or 'unpinned'.",
  })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const item = await client.tabs.create({
        uRL: this.uRL,
        location: this.location,
      } as Record<string, unknown>)

      const output = formatter.format({
        message: 'Tab created successfully',
        id: item.id,
        title: item.title,
        uRL: item.uRL,
        loading: item.loading,
        location: item.location,
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
