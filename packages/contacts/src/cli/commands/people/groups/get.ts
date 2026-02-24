import { Command, Option } from 'clipanion';
import { getClient } from '../../../sdk.js';
import { createFormatter } from '../../../output/index.js';

/**
 * Get a group by ID.
 */
export class GetGroupCommand extends Command {
  static override paths = [["contacts", "people", "groups", "get"]];

  static override usage = Command.Usage({
    description: 'Get a group by ID',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  personId = Option.String('--person-id', { required: true, description: 'Person ID' });

  groupId = Option.String({ required: true });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const item = await client.groups.get(this.groupId);

      const output = formatter.format({
        name: item.name,
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
