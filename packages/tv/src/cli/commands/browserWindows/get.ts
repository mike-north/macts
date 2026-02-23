import { Command, Option } from 'clipanion';
import { getClient } from '../../sdk.js';
import { createFormatter } from '../../output/index.js';

/**
 * Get a browserwindow by ID.
 */
export class GetBrowserWindowCommand extends Command {
  static override paths = [["tv", "browserWindows", "get"]];

  static override usage = Command.Usage({
    description: 'Get a browserwindow by ID',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });

  browserWindowId = Option.String({ required: true });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const item = await client.browserwindows.get(this.browserWindowId);

      if (!item) {
        this.context.stderr.write(formatter.formatError('BrowserWindow not found') + '\n');
        return 1;
      }

      const output = formatter.format({
        id: item.id,
        selection: item.selection,
        view: item.view,
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
