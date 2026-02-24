import { Command, Option } from 'clipanion'
import { getClient } from '../../../sdk.js'
import { createFormatter } from '../../../output/index.js'

/**
 * Get a aimhandle by ID.
 */
export class GetAIMHandleCommand extends Command {
  static override paths = [['contacts', 'people', 'aIMHandles', 'get']]

  static override usage = Command.Usage({
    description: 'Get a aimhandle by ID',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  personId = Option.String('--person-id', { required: true, description: 'Person ID' })

  aIMHandleId = Option.String({ required: true })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const item = await client.aimhandles.get(this.aIMHandleId)

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
