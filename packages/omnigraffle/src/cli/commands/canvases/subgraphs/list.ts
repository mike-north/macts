import { Command, Option } from 'clipanion';
import { getClient } from '../../../sdk.js';
import { createFormatter } from '../../../output/index.js';

/**
 * List subgraphs.
 */
export class ListSubgraphsCommand extends Command {
  static override paths = [["omnigraffle", "canvases", "subgraphs", "list"]];

  static override usage = Command.Usage({
    description: 'List subgraphs',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  canvasId = Option.String('--canvas-id', { required: true, description: 'Canvas ID' });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const items = await client.subgraphs.list();

      const output = formatter.formatList(items.map(item => ({
        id: item.id,
        collapsed: item.collapsed,
        topMargin: item.topMargin,
        bottomMargin: item.bottomMargin,
        leftMargin: item.leftMargin,
        rightMargin: item.rightMargin,
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
