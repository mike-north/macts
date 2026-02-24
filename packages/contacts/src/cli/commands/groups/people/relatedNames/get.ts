import { Command, Option } from 'clipanion';
import { getClient } from '../../../../sdk.js';
import { createFormatter } from '../../../../output/index.js';

/**
 * Get a relatedname by ID.
 */
export class GetRelatedNameCommand extends Command {
  static override paths = [["contacts", "groups", "people", "relatedNames", "get"]];

  static override usage = Command.Usage({
    description: 'Get a relatedname by ID',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  groupId = Option.String('--group-id', { required: true, description: 'Group ID' });
  personId = Option.String('--person-id', { required: true, description: 'Person ID' });

  relatedNameId = Option.String({ required: true });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const item = await client.relatednames.get(this.relatedNameId);

      const output = formatter.format({
        id: item.id,
        label: item.label,
        value: item.value,
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
