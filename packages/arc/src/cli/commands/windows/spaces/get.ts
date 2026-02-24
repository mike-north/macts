import { Command, Option } from 'clipanion';
import { getClient } from '../../../sdk.js';
import { createFormatter } from '../../../output/index.js';

/**
 * Get a space by ID.
 */
export class GetSpaceCommand extends Command {
  static override paths = [["arc", "windows", "spaces", "get"]];

  static override usage = Command.Usage({
    description: 'Get a space by ID',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  windowId = Option.String('--window-id', { required: true, description: 'Window ID' });

  spaceId = Option.String({ required: true });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const item = await client.spaces.get(this.spaceId);

      const output = formatter.format({
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
