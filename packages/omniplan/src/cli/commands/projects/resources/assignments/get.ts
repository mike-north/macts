import { Command, Option } from 'clipanion'
import { getClient } from '../../../../sdk.js'
import { createFormatter } from '../../../../output/index.js'

/**
 * Get a assignment by ID.
 */
export class GetAssignmentCommand extends Command {
  static override paths = [['omniplan', 'projects', 'resources', 'assignments', 'get']]

  static override usage = Command.Usage({
    description: 'Get a assignment by ID',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  projectId = Option.String('--project-id', { required: true, description: 'Project ID' })
  resourceId = Option.String('--resource-id', { required: true, description: 'Resource ID' })

  assignmentId = Option.String({ required: true })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const item = await client.assignments.get(this.assignmentId)

      const output = formatter.format({
        units: item.units,
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
