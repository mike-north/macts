import { Command, Option } from 'clipanion';
import { getClient } from '../sdk.js';
import { createFormatter } from '../output/index.js';

/**
 * Show the document's Remote HUD
 */
export class ShowRemoteHudCommand extends Command {
  static override paths = [["quicktime-player", "show-remote-hud"]];

  static override usage = Command.Usage({
    description: "Show the document's Remote HUD",
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await client.showRemoteHud();

      const output = formatter.formatSuccess('showRemoteHud completed successfully');
      this.context.stdout.write(output + '\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\n');
      return 1;
    }
  }
}
