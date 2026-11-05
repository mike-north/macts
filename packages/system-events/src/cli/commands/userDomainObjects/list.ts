import { Command, Option } from 'clipanion'
import { getClient } from '../../sdk.js'
import { createFormatter } from '../../output/index.js'

/**
 * List user domain objects.
 */
export class ListUserDomainObjectsCommand extends Command {
  static override paths = [['system-events', 'userDomainObjects', 'list']]

  static override usage = Command.Usage({
    description: 'List user domain objects',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const page = await client.userDomainObjects.list()

      const output = formatter.formatList(
        page.items.map((item) => ({
          desktopFolder: item.desktopFolder,
          documentsFolder: item.documentsFolder,
          downloadsFolder: item.downloadsFolder,
          favoritesFolder: item.favoritesFolder,
          homeFolder: item.homeFolder,
          moviesFolder: item.moviesFolder,
          musicFolder: item.musicFolder,
          picturesFolder: item.picturesFolder,
          publicFolder: item.publicFolder,
          sitesFolder: item.sitesFolder,
          temporaryItemsFolder: item.temporaryItemsFolder,
          kind: item.kind,
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
