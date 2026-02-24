import { Command, Option } from 'clipanion'
import { getClient } from '../../../sdk.js'
import { createFormatter } from '../../../output/index.js'

/**
 * Get a scenario by ID.
 */
export class GetScenarioCommand extends Command {
  static override paths = [['omniplan', 'projects', 'scenarios', 'get']]

  static override usage = Command.Usage({
    description: 'Get a scenario by ID',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  projectId = Option.String('--project-id', { required: true, description: 'Project ID' })

  scenarioId = Option.String({ required: true })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const item = await client.scenarios.get(this.scenarioId)

      const output = formatter.format({
        id: item.id,
        name: item.name,
        startingDate: item.startingDate,
        endingDate: item.endingDate,
        totalCost: item.totalCost,
        completed: item.completed,
        duration: item.duration,
        effort: item.effort,
        violationCount: item.violationCount,
        schedulingGranularity: item.schedulingGranularity,
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
