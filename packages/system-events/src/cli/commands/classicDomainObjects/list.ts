import { Command, Option } from 'clipanion'
import { getClient } from '../../sdk.js'
import { createFormatter } from '../../output/index.js'

/**
 * List classic domain objects.
 */
export class ListClassicDomainObjectsCommand extends Command {
  static override paths = [['system-events', 'classicDomainObjects', 'list']]

  static override usage = Command.Usage({
    description: 'List classic domain objects',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const page = await client.classicDomainObjects.list()

      const output = formatter.formatList(
        page.items.map((item) => ({
          preferencesFolder: item.preferencesFolder,
          kind: item.kind,
          applicationSupportFolder: item.applicationSupportFolder,
          applicationsFolder: item.applicationsFolder,
          id: item.id,
          libraryFolder: item.libraryFolder,
          name: item.name,
          scriptsFolder: item.scriptsFolder,
          workflowsFolder: item.workflowsFolder,
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
