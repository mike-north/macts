import { Command, Option } from 'clipanion'
import { getClient } from '../../../sdk.js'
import { createFormatter } from '../../../output/index.js'

/**
 * Get a rulecondition by ID.
 */
export class GetRuleConditionCommand extends Command {
  static override paths = [['mail', 'rules', 'ruleConditions', 'get']]

  static override usage = Command.Usage({
    description: 'Get a rulecondition by ID',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  ruleId = Option.String('--rule-id', { required: true, description: 'Rule ID' })

  ruleConditionId = Option.String({ required: true })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const item = await client.ruleconditions.get(this.ruleConditionId)

      const output = formatter.format({
        expression: item.expression,
        header: item.header,
        qualifier: item.qualifier,
        ruleType: item.ruleType,
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
