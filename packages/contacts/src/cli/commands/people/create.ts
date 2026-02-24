import { Command, Option } from 'clipanion'
import { getClient } from '../../sdk.js'
import { createFormatter } from '../../output/index.js'

/**
 * Create a new person.
 */
export class CreatePersonCommand extends Command {
  static override paths = [['contacts', 'people', 'create']]

  static override usage = Command.Usage({
    description: 'Create a new person',
  })

  json = Option.Boolean('--json', { description: 'Output as JSON' })
  nickname = Option.String('--nickname', {
    required: true,
    description: 'The Nickname of this person.',
  })
  organization = Option.String('--organization', {
    required: true,
    description: 'Organization that employs this person.',
  })
  maidenName = Option.String('--maiden-name', {
    required: true,
    description: 'The Maiden name of this person.',
  })
  suffix = Option.String('--suffix', { required: true, description: 'The Suffix of this person.' })
  homePage = Option.String('--home-page', {
    required: true,
    description: 'The home page of this person.',
  })
  birthDate = Option.String('--birth-date', {
    required: true,
    description: 'The birth date of this person.',
  })
  phoneticLastName = Option.String('--phonetic-last-name', {
    required: true,
    description: 'The phonetic version of the Last name of this person.',
  })
  title = Option.String('--title', { required: true, description: 'The title of this person.' })
  phoneticMiddleName = Option.String('--phonetic-middle-name', {
    required: true,
    description: 'The Phonetic version of the Middle name of this person.',
  })
  department = Option.String('--department', {
    required: true,
    description: 'Department that this person works for.',
  })
  image = Option.String('--image', { required: true, description: 'Image for person.' })
  note = Option.String('--note', { required: true, description: 'Notes for this person.' })
  company = Option.Boolean('--company', {
    description: 'Is the current record a company or a person.',
  })
  middleName = Option.String('--middle-name', {
    required: true,
    description: 'The Middle name of this person.',
  })
  phoneticFirstName = Option.String('--phonetic-first-name', {
    required: true,
    description: 'The phonetic version of the First name of this person.',
  })
  jobTitle = Option.String('--job-title', {
    required: true,
    description: 'The job title of this person.',
  })
  lastName = Option.String('--last-name', {
    required: true,
    description: 'The Last name of this person.',
  })
  firstName = Option.String('--first-name', {
    required: true,
    description: 'The First name of this person.',
  })

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false)

    try {
      const client = getClient()
      const item = await client.people.create({
        nickname: this.nickname,
        organization: this.organization,
        maidenName: this.maidenName,
        suffix: this.suffix,
        homePage: this.homePage,
        birthDate: this.birthDate,
        phoneticLastName: this.phoneticLastName,
        title: this.title,
        phoneticMiddleName: this.phoneticMiddleName,
        department: this.department,
        image: this.image,
        note: this.note,
        company: this.company,
        middleName: this.middleName,
        phoneticFirstName: this.phoneticFirstName,
        jobTitle: this.jobTitle,
        lastName: this.lastName,
        firstName: this.firstName,
      } as Record<string, unknown>)

      const output = formatter.format({
        message: 'Person created successfully',
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
