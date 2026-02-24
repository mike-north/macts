import { Command, Option } from 'clipanion'
import { getClient } from '../../../sdk.js'
import { createFormatter } from '../../../output/index.js'

/**
 * Get a url by ID.
 */
export class GetUrlCommand extends Command {
  static override paths = [['contacts', 'people', 'urls', 'get']]

  static override usage = Command.Usage({
    description: 'Get a url by ID',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  personId = Option.String('--person-id', { required: true, description: 'Person ID' })

  urlId = Option.String({ required: true })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const item = await client.urls.get(this.urlId)

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
