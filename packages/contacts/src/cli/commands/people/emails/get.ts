import { Command, Option } from 'clipanion'
import { getClient } from '../../../sdk.js'
import { createFormatter } from '../../../output/index.js'

/**
 * Get a email by ID.
 */
export class GetEmailCommand extends Command {
  static override paths = [['contacts', 'people', 'emails', 'get']]

  static override usage = Command.Usage({
    description: 'Get a email by ID',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  personId = Option.String('--person-id', { required: true, description: 'Person ID' })

  emailId = Option.String({ required: true })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const item = await client.emails.get(this.emailId)

      const output = formatter.format({
        id: item.id,
        label: item.label,
        value: item.value,
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
