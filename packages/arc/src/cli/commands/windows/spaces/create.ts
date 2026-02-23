import { Command, Option } from 'clipanion';
import { getClient } from '../../../sdk.js';
import { createFormatter } from '../../../output/index.js';

/**
 * Create a new space.
 */
export class CreateSpaceCommand extends Command {
  static override paths = [["arc", "windows", "spaces", "create"]];

  static override usage = Command.Usage({
    description: 'Create a new space',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  windowId = Option.String('--window-id', { required: true, description: 'Window ID' });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const item = await client.spaces.create({

      } as Record<string, unknown>);

      const output = formatter.format({
        message: 'Space created successfully',
        id: item.id,
        title: item.title,
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
