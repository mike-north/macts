import { Command, Option } from 'clipanion'
import { getClient } from '../sdk.js'
import { createFormatter } from '../output/index.js'

/**
 * Send a folder action code to a folder action script
 */
export class DoFolderActionCommand extends Command {
  static override paths = [['system-events', 'do-folder-action']]

  static override usage = Command.Usage({
    description: 'Send a folder action code to a folder action script',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  folderActionCode = Option.String('--folder-action-code', {
    required: true,
    description: 'the folder action message to process',
  })
  withItemList = Option.String('--with-item-list', {
    required: false,
    description: 'a list of items for the folder action message to process',
  })
  withWindowSize = Option.String('--with-window-size', {
    required: false,
    description: 'the new window size for the folder action message to process',
  })
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      await client.doFolderAction(
        this.folderActionCode as unknown as Parameters<typeof client.doFolderAction>[0],
        this.withItemList as unknown as Parameters<typeof client.doFolderAction>[1],
        this.withWindowSize as unknown as Parameters<typeof client.doFolderAction>[2]
      )

      const output = formatter.formatSuccess('doFolderAction completed successfully')
      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}
