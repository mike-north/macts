import { Command, Option } from 'clipanion'
import { getClient } from '../../sdk.js'
import { createFormatter } from '../../output/index.js'

/**
 * List workspacedocuments.
 */
export class ListWorkspaceDocumentsCommand extends Command {
  static override paths = [['xcode', 'workspaceDocuments', 'list']]

  static override usage = Command.Usage({
    description: 'List workspacedocuments',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const items = await client.workspacedocuments.list()

      const output = formatter.formatList(
        items.map((item) => ({
          name: item.name,
          modified: item.modified,
          file: item.file,
          path: item.path,
          loaded: item.loaded,
          activeScheme: item.activeScheme,
          activeRunDestination: item.activeRunDestination,
          lastSchemeActionResult: item.lastSchemeActionResult,
        }))
      )

      this.context.stdout.write(output + '\n')
      return 0
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      this.context.stderr.write(formatter.formatError(message) + '\n')
      return 1
    }
  }
}
