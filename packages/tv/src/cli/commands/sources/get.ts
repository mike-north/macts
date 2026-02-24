import { Command, Option } from 'clipanion';
import { getClient } from '../../sdk.js';
import { createFormatter } from '../../output/index.js';

/**
 * Get a source by ID.
 */
export class GetSourceCommand extends Command {
  static override paths = [["tv", "sources", "get"]];

  static override usage = Command.Usage({
    description: 'Get a source by ID',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });

  sourceId = Option.String({ required: true });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const item = await client.sources.get(this.sourceId);

      const output = formatter.format({
        id: item.id,
        capacity: item.capacity,
        freeSpace: item.freeSpace,
        kind: item.kind,
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
