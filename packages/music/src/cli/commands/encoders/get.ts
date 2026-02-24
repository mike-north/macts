import { Command, Option } from 'clipanion';
import { getClient } from '../../sdk.js';
import { createFormatter } from '../../output/index.js';

/**
 * Get a encoder by ID.
 */
export class GetEncoderCommand extends Command {
  static override paths = [["music", "encoders", "get"]];

  static override usage = Command.Usage({
    description: 'Get a encoder by ID',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });

  encoderId = Option.String({ required: true });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const item = await client.encoders.get(this.encoderId);

      const output = formatter.format({
        format: item.format,
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
