import { Command, Option } from 'clipanion';
import { getClient } from '../../sdk.js';
import { createFormatter } from '../../output/index.js';

/**
 * Get a person by ID.
 */
export class GetPersonCommand extends Command {
  static override paths = [["contacts", "people", "get"]];

  static override usage = Command.Usage({
    description: 'Get a person by ID',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });

  personId = Option.String({ required: true });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const item = await client.people.get(this.personId);

      const output = formatter.format({
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
      });

      this.context.stdout.write(output + '\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\n');
      return 1;
    }
  }
}
