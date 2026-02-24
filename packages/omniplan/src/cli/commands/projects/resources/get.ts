import { Command, Option } from 'clipanion'
import { getClient } from '../../../sdk.js'
import { createFormatter } from '../../../output/index.js'

/**
 * Get a resource by ID.
 */
export class GetResourceCommand extends Command {
  static override paths = [['omniplan', 'projects', 'resources', 'get']]

  static override usage = Command.Usage({
    description: 'Get a resource by ID',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  projectId = Option.String('--project-id', { required: true, description: 'Project ID' })

  resourceId = Option.String({ required: true })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const item = await client.resources.get(this.resourceId)

      const output = formatter.format({
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
