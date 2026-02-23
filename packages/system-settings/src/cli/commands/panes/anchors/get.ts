import { Command, Option } from 'clipanion';
import { getClient } from '../../../sdk.js';
import { createFormatter } from '../../../output/index.js';

/**
 * Get a anchor by ID.
 */
export class GetAnchorCommand extends Command {
  static override paths = [["system-settings", "panes", "anchors", "get"]];

  static override usage = Command.Usage({
    description: 'Get a anchor by ID',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  paneId = Option.String('--pane-id', { required: true, description: 'Pane ID' });

  anchorId = Option.String({ required: true });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const item = await client.anchors.get(this.anchorId);

      if (!item) {
        this.context.stderr.write(formatter.formatError('Anchor not found') + '\n');
        return 1;
      }

      const output = formatter.format({
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
