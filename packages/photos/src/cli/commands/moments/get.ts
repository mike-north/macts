import { Command, Option } from 'clipanion';
import { getClient } from '../../sdk.js';
import { createFormatter } from '../../output/index.js';

/**
 * Get a moment by ID.
 */
export class GetMomentCommand extends Command {
  static override paths = [["photos", "moments", "get"]];

  static override usage = Command.Usage({
    description: 'Get a moment by ID',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });

  momentId = Option.String({ required: true });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const item = await client.moments.get(this.momentId);

      if (!item) {
        this.context.stderr.write(formatter.formatError('Moment not found') + '\n');
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
