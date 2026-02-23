import { Command, Option } from 'clipanion';
import { getClient } from '../../../../sdk.js';
import { createFormatter } from '../../../../output/index.js';

/**
 * Create a new socialprofile.
 */
export class CreateSocialProfileCommand extends Command {
  static override paths = [["contacts", "groups", "people", "socialProfiles", "create"]];

  static override usage = Command.Usage({
    description: 'Create a new socialprofile',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  groupId = Option.String('--group-id', { required: true, description: 'Group ID' });
  personId = Option.String('--person-id', { required: true, description: 'Person ID' });
  serviceName = Option.String('--service-name', { required: true, description: "The service name of this social profile." });
  userName = Option.String('--user-name', { required: true, description: "The username used with this social profile." });
  userIdentifier = Option.String('--user-identifier', { required: true, description: "A service-specific identifier used with this social profile." });
  url = Option.String('--url', { required: true, description: "The URL of this social profile." });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const item = await client.socialprofiles.create({
        serviceName: this.serviceName,
        userName: this.userName,
        userIdentifier: this.userIdentifier,
        url: this.url,
      } as Record<string, unknown>);

      const output = formatter.format({
        message: 'SocialProfile created successfully',
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
