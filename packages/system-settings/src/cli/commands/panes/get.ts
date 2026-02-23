import { Command, Option } from 'clipanion';
import { getClient } from '../../sdk.js';
import { createFormatter } from '../../output/index.js';

/**
 * Get a pane by ID.
 */
export class GetPaneCommand extends Command {
  static override paths = [["system-settings", "panes", "get"]];

  static override usage = Command.Usage({
    description: 'Get a pane by ID',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });

  paneId = Option.String({ required: true });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const item = await client.panes.get(this.paneId);

      if (!item) {
        this.context.stderr.write(formatter.formatError('Pane not found') + '\n');
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
