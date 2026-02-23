import { Command, Option } from 'clipanion';
import { getClient } from '../../../../sdk.js';
import { createFormatter } from '../../../../output/index.js';

/**
 * Get a instantmessage by ID.
 */
export class GetInstantMessageCommand extends Command {
  static override paths = [["contacts", "groups", "people", "instantMessages", "get"]];

  static override usage = Command.Usage({
    description: 'Get a instantmessage by ID',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  groupId = Option.String('--group-id', { required: true, description: 'Group ID' });
  personId = Option.String('--person-id', { required: true, description: 'Person ID' });

  instantMessageId = Option.String({ required: true });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const item = await client.instantmessages.get(this.instantMessageId);

      if (!item) {
        this.context.stderr.write(formatter.formatError('InstantMessage not found') + '\n');
        return 1;
      }

      const output = formatter.format({
        serviceName: item.serviceName,
        serviceType: item.serviceType,
        userName: item.userName,
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
