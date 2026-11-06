import { Command, Option } from 'clipanion'
import { getClient } from '../../sdk.js'
import { createFormatter } from '../../output/index.js'

/**
 * Get a disk item by posix path.
 */
export class GetDiskItemCommand extends Command {
  static override paths = [['system-events', 'diskItems', 'get']]

  static override usage = Command.Usage({
    description: 'Get a disk item by posix path',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })

  diskItemId = Option.String({ name: 'posix-path', required: true })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const item = await client.diskItems.get(this.diskItemId)

      const output = formatter.format({
        busyStatus: item.busyStatus,
        container: item.container,
        creationDate: item.creationDate,
        displayedName: item.displayedName,
        id: item.id,
        modificationDate: item.modificationDate,
        name: item.name,
        nameExtension: item.nameExtension,
        packageFolder: item.packageFolder,
        path: item.path,
        physicalSize: item.physicalSize,
        posixPath: item.posixPath,
        size: item.size,
        uRL: item.uRL,
        visible: item.visible,
        volume: item.volume,
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
