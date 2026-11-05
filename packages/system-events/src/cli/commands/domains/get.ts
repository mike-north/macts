import { Command, Option } from 'clipanion'
import { getClient } from '../../sdk.js'
import { createFormatter } from '../../output/index.js'

/**
 * Get a domain by ID.
 */
export class GetDomainCommand extends Command {
  static override paths = [['system-events', 'domains', 'get']]

  static override usage = Command.Usage({
    description: 'Get a domain by ID',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })

  domainId = Option.String({ name: 'id', required: true })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const item = await client.domains.get(this.domainId)

      const output = formatter.format({
        applicationSupportFolder: item.applicationSupportFolder,
        applicationsFolder: item.applicationsFolder,
        desktopPicturesFolder: item.desktopPicturesFolder,
        folderActionScriptsFolder: item.folderActionScriptsFolder,
        fontsFolder: item.fontsFolder,
        id: item.id,
        libraryFolder: item.libraryFolder,
        name: item.name,
        preferencesFolder: item.preferencesFolder,
        scriptingAdditionsFolder: item.scriptingAdditionsFolder,
        scriptsFolder: item.scriptsFolder,
        sharedDocumentsFolder: item.sharedDocumentsFolder,
        speakableItemsFolder: item.speakableItemsFolder,
        utilitiesFolder: item.utilitiesFolder,
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
