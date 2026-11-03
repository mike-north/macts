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
      const page = await client.people.list({
        ...(this.pageSize === undefined ? {} : { pageSize: Number(this.pageSize) }),
        ...(this.cursor === undefined ? {} : { cursor: this.cursor }),
      })

      const output = formatter.formatPage(
        page.items.map((item) => ({
          id: item.id,
          creationDate: item.creationDate,
          modificationDate: item.modificationDate,
          nickname: item.nickname,
          organization: item.organization,
          maidenName: item.maidenName,
          suffix: item.suffix,
          homePage: item.homePage,
          birthDate: item.birthDate,
          phoneticLastName: item.phoneticLastName,
          title: item.title,
          phoneticMiddleName: item.phoneticMiddleName,
          department: item.department,
          name: item.name,
          note: item.note,
          company: item.company,
          middleName: item.middleName,
          phoneticFirstName: item.phoneticFirstName,
          jobTitle: item.jobTitle,
          lastName: item.lastName,
          firstName: item.firstName,
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
