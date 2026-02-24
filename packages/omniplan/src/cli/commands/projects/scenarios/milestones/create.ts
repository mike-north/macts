import { Command, Option } from 'clipanion'
import { getClient } from '../../../../sdk.js'
import { createFormatter } from '../../../../output/index.js'

/**
 * Create a new milestone.
 */
export class CreateMilestoneCommand extends Command {
  static override paths = [['omniplan', 'projects', 'scenarios', 'milestones', 'create']]

  static override usage = Command.Usage({
    description: 'Create a new milestone',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  projectId = Option.String('--project-id', { required: true, description: 'Project ID' })
  scenarioId = Option.String('--scenario-id', { required: true, description: 'Scenario ID' })
  name = Option.String('--name', { required: true, description: 'The name of the milestone' })
  startingDate = Option.String('--starting-date', {
    required: true,
    description: 'The date of the milestone',
  })
  note = Option.String('--note', { required: true, description: 'Notes' })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const item = await client.milestones.create({
        name: this.name,
        startingDate: this.startingDate,
        note: this.note,
      } as Record<string, unknown>)

      const output = formatter.format({
        message: 'Milestone created successfully',
        id: item.id,
        name: item.name,
        startingDate: item.startingDate,
        note: item.note,
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
