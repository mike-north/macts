import { Command, Option } from 'clipanion';
import { getClient } from '../../sdk.js';
import { createFormatter } from '../../output/index.js';

/**
 * Get a miniplayerwindow by ID.
 */
export class GetMiniplayerWindowCommand extends Command {
  static override paths = [["music", "miniplayerWindows", "get"]];

  static override usage = Command.Usage({
    description: 'Get a miniplayerwindow by ID',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });

  miniplayerWindowId = Option.String({ required: true });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const item = await client.miniplayerwindows.get(this.miniplayerWindowId);

      if (!item) {
        this.context.stderr.write(formatter.formatError('MiniplayerWindow not found') + '\n');
        return 1;
      }

      const output = formatter.format({
        id: item.id,
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
