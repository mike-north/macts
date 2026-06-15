import { Command, Option } from 'clipanion'
import * as t from 'typanion'
import { getClient } from '../../../../sdk.js'
import { createFormatter } from '../../../../output/index.js'

/**
 * Create a new resource.
 */
export class CreateResourceCommand extends Command {
  static override paths = [['omniplan', 'projects', 'scenarios', 'resources', 'create']]

  static override usage = Command.Usage({
    description: 'Create a new resource',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  projectId = Option.String('--project-id', { required: true, description: 'Project ID' })
  scenarioId = Option.String('--scenario-id', { required: true, description: 'Scenario ID' })
  name = Option.String('--name', { required: true, description: 'The name of the resource' })
  resourceType = Option.String('--resource-type', {
    required: true,
    description: 'Type of the resource',
    validator: t.isEnum(['person', 'equipment', 'material', 'resourceGroup']),
  })
  number = Option.String('--number', {
    required: true,
    description: 'The total number of units for this resource (1.0 = 100%)',
  })
  emailAddress = Option.String('--email-address', {
    required: true,
    description: 'Email address for this resource',
  })
  costPerUse = Option.String('--cost-per-use', {
    required: true,
    description: 'The fixed cost per use of this resource',
  })
  costPerHour = Option.String('--cost-per-hour', {
    required: true,
    description: 'The cost per hour of this resource',
  })
  efficiency = Option.String('--efficiency', {
    required: true,
    description: 'Resource efficiency (1.0 = 100%)',
  })
  note = Option.String('--note', { required: true, description: 'Notes' })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      // Assert the SDK's precise create-input type. CLI flags surface every field as a
      // string/boolean primitive, which may not structurally overlap the input's richer
      // member types (e.g. a color object) or exact-optional members, so we assert via
      // `unknown`. The RPC layer coerces/validates the payload at runtime.
      const item = await client.resources.create({
        name: this.name,
        resourceType: this.resourceType,
        number: this.number,
        emailAddress: this.emailAddress,
        costPerUse: this.costPerUse,
        costPerHour: this.costPerHour,
        efficiency: this.efficiency,
        note: this.note,
      } as unknown as Parameters<typeof client.resources.create>[0])

      const output = formatter.format({
        message: 'Resource created successfully',
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
