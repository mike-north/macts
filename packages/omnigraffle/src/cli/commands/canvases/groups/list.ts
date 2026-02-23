import { Command, Option } from 'clipanion';
import { getClient } from '../../../sdk.js';
import { createFormatter } from '../../../output/index.js';

/**
 * List groups.
 */
export class ListGroupsCommand extends Command {
  static override paths = [["omnigraffle", "canvases", "groups", "list"]];

  static override usage = Command.Usage({
    description: 'List groups',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  canvasId = Option.String('--canvas-id', { required: true, description: 'Canvas ID' });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const items = await client.groups.list();

      const output = formatter.formatList(items.map(item => ({
        id: item.id,
        rotation: item.rotation,
        connectToGroupOnly: item.connectToGroupOnly,
      })));

      this.context.stdout.write(output + '\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\n');
      return 1;
    }
  }
}
