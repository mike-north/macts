import { Command, Option } from 'clipanion';
import { getClient } from '../../sdk.js';
import { createFormatter } from '../../output/index.js';

/**
 * Get a master by ID.
 */
export class GetMasterCommand extends Command {
  static override paths = [["omnigraffle", "masters", "get"]];

  static override usage = Command.Usage({
    description: 'Get a master by ID',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });

  masterId = Option.String({ required: true });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const item = await client.masters.get(this.masterId);

      if (!item) {
        this.context.stderr.write(formatter.formatError('Master not found') + '\n');
        return 1;
      }

      const output = formatter.format({
        id: item.id,
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
