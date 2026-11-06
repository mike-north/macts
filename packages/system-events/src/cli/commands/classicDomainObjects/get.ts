import { Command, Option } from 'clipanion'
import { getClient } from '../../sdk.js'
import { createFormatter } from '../../output/index.js'

/**
 * Get a classic domain object by kind.
 */
export class GetClassicDomainObjectCommand extends Command {
  static override paths = [['system-events', 'classicDomainObjects', 'get']]

  static override usage = Command.Usage({
    description: 'Get a classic domain object by kind',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })

  classicDomainObjectId = Option.String({ name: 'kind', required: true })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const item = await client.classicDomainObjects.get(this.classicDomainObjectId)

      const output = formatter.format({
        preferencesFolder: item.preferencesFolder,
        kind: item.kind,
        applicationSupportFolder: item.applicationSupportFolder,
        applicationsFolder: item.applicationsFolder,
        id: item.id,
        libraryFolder: item.libraryFolder,
        name: item.name,
        scriptsFolder: item.scriptsFolder,
        workflowsFolder: item.workflowsFolder,
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
