import { Command, Option } from 'clipanion';
import { getClient } from '../../../../sdk.js';
import { createFormatter } from '../../../../output/index.js';

/**
 * List instantmessages.
 */
export class ListInstantMessagesCommand extends Command {
  static override paths = [["contacts", "groups", "people", "instantMessages", "list"]];

  static override usage = Command.Usage({
    description: 'List instantmessages',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  groupId = Option.String('--group-id', { required: true, description: 'Group ID' });
  personId = Option.String('--person-id', { required: true, description: 'Person ID' });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const items = await client.instantmessages.list();

      const output = formatter.formatList(items.map(item => ({
        serviceName: item.serviceName,
        serviceType: item.serviceType,
        userName: item.userName,
      })));

      this.context.stdout.write(output + '\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\n');
      return 1;
    }
  }
}
