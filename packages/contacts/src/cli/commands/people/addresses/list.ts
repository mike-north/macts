import { Command, Option } from 'clipanion'
import { getClient } from '../../../sdk.js'
import { createFormatter } from '../../../output/index.js'

/**
 * List addresses.
 */
export class ListAddressesCommand extends Command {
  static override paths = [['contacts', 'people', 'addresses', 'list']]

  static override usage = Command.Usage({
    description: 'List addresses',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  personId = Option.String('--person-id', {
    required: true,
    description: 'Identifier of the person',
  })
  pageSize = Option.String('--page-size', {
    description: 'The most items to show, from 1 to 100 (default 25)',
  })
  cursor = Option.String('--cursor', {
    description: 'Continue from the previous page, as its output says',
  })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const page = await client.addresses.list(this.personId, {
        ...(this.pageSize === undefined ? {} : { pageSize: Number(this.pageSize) }),
        ...(this.cursor === undefined ? {} : { cursor: this.cursor }),
      })

      const output = formatter.formatPage(
        page.items.map((item) => ({
          city: item.city,
          formattedAddress: item.formattedAddress,
          street: item.street,
          id: item.id,
          zip: item.zip,
          country: item.country,
          label: item.label,
          countryCode: item.countryCode,
          state: item.state,
        })),
        page.nextCursor
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
