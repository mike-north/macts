import { Command, Option } from 'clipanion';
import { getClient } from '../../../../sdk.js';
import { createFormatter } from '../../../../output/index.js';

/**
 * Get a socialprofile by ID.
 */
export class GetSocialProfileCommand extends Command {
  static override paths = [["contacts", "groups", "people", "socialProfiles", "get"]];

  static override usage = Command.Usage({
    description: 'Get a socialprofile by ID',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  groupId = Option.String('--group-id', { required: true, description: 'Group ID' });
  personId = Option.String('--person-id', { required: true, description: 'Person ID' });

  socialProfileId = Option.String({ required: true });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const item = await client.socialprofiles.get(this.socialProfileId);

      const output = formatter.format({
        id: item.id,
        serviceName: item.serviceName,
        userName: item.userName,
        userIdentifier: item.userIdentifier,
        url: item.url,
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
