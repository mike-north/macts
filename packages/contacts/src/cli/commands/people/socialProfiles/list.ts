import { Command, Option } from 'clipanion'
import { getClient } from '../../../sdk.js'
import { createFormatter } from '../../../output/index.js'

/**
 * List socialprofiles.
 */
export class ListSocialProfilesCommand extends Command {
  static override paths = [['contacts', 'people', 'socialProfiles', 'list']]

  static override usage = Command.Usage({
    description: 'List socialprofiles',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  personId = Option.String('--person-id', { required: true, description: 'Person ID' })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const items = await client.socialprofiles.list()

      const output = formatter.formatList(
        items.map((item) => ({
          id: item.id,
          serviceName: item.serviceName,
          userName: item.userName,
          userIdentifier: item.userIdentifier,
          url: item.url,
        }))
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
