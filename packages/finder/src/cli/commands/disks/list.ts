import { Command, Option } from 'clipanion'
import { getClient } from '../../sdk.js'
import { createFormatter } from '../../output/index.js'

/**
 * List disks.
 */
export class ListDisksCommand extends Command {
  static override paths = [['finder', 'disks', 'list']]

  static override usage = Command.Usage({
    description: 'List disks',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const items = await client.disks.list()

      const output = formatter.formatList(
        items.map((item) => ({
          id: item.id,
          capacity: item.capacity,
          freeSpace: item.freeSpace,
          ejectable: item.ejectable,
          localVolume: item.localVolume,
          startup: item.startup,
          format: item.format,
          journalingEnabled: item.journalingEnabled,
          ignorePrivileges: item.ignorePrivileges,
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
