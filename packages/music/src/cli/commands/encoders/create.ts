import { Command, Option } from 'clipanion';
import { getClient } from '../../sdk.js';
import { createFormatter } from '../../output/index.js';

/**
 * Create a new encoder.
 */
export class CreateEncoderCommand extends Command {
  static override paths = [["music", "encoders", "create"]];

  static override usage = Command.Usage({
    description: 'Create a new encoder',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const item = await client.encoders.create({

      } as Record<string, unknown>);

      const output = formatter.format({
        message: 'Encoder created successfully',
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
