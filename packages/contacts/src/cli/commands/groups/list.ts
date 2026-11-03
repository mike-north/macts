import { Command, Option } from 'clipanion'
import { getClient } from '../../sdk.js'
import { createFormatter } from '../../output/index.js'

/**
 * List groups.
 */
export class ListGroupsCommand extends Command {
  static override paths = [['contacts', 'groups', 'list']]

  static override usage = Command.Usage({
    description: 'List groups',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const page = await client.groups.list()

      const output = formatter.formatList(
        page.items.map((item) => ({
          id: item.id,
          name: item.name,
          creationDate: item.creationDate,
          modificationDate: item.modificationDate,
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
