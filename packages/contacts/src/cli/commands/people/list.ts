import { Command, Option } from 'clipanion'
import { getClient } from '../../sdk.js'
import { createFormatter } from '../../output/index.js'

/**
 * List people.
 */
export class ListPeopleCommand extends Command {
  static override paths = [['contacts', 'people', 'list']]

  static override usage = Command.Usage({
    description: 'List people',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const items = await client.people.list()

      const output = formatter.formatList(
        items.map((item) => ({
          nickname: item.nickname,
          organization: item.organization,
          maidenName: item.maidenName,
          suffix: item.suffix,
          vcard: item.vcard,
          homePage: item.homePage,
          birthDate: item.birthDate,
          phoneticLastName: item.phoneticLastName,
          title: item.title,
          phoneticMiddleName: item.phoneticMiddleName,
          department: item.department,
          image: item.image,
          name: item.name,
          note: item.note,
          company: item.company,
          middleName: item.middleName,
          phoneticFirstName: item.phoneticFirstName,
          jobTitle: item.jobTitle,
          lastName: item.lastName,
          firstName: item.firstName,
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
