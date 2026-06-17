import { Command, Option } from 'clipanion'
import { getClient } from '../../../sdk.js'
import { createFormatter } from '../../../output/index.js'

/**
 * List resources.
 */
export class ListResourcesCommand extends Command {
  static override paths = [['omniplan', 'projects', 'resources', 'list']]

  static override usage = Command.Usage({
    description: 'List resources',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const items = await client.resources.list()

      const output = formatter.formatList(
        items.map((item) => ({
          id: item.id,
          name: item.name,
          resourceType: item.resourceType,
          number: item.number,
          emailAddress: item.emailAddress,
          costPerUse: item.costPerUse,
          costPerHour: item.costPerHour,
          efficiency: item.efficiency,
          totalUses: item.totalUses,
          totalSeconds: item.totalSeconds,
          totalCost: item.totalCost,
          note: item.note,
          outlineDepth: item.outlineDepth,
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
