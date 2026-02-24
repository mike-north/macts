import { Command, Option } from 'clipanion';
import { getClient } from '../../sdk.js';
import { createFormatter } from '../../output/index.js';

/**
 * Times and loads given settings pane and returns load time. Deprecated: no longer does anything.
 */
export class TimedLoadPaneCommand extends Command {
  static override paths = [["system-settings", "panes", "timed-load"]];

  static override usage = Command.Usage({
    description: "Times and loads given settings pane and returns load time. Deprecated: no longer does anything.",
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });

  paneId = Option.String({ required: true });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      await client.panes.timedLoad();

      const output = formatter.formatSuccess('timedLoad completed successfully');
      this.context.stdout.write(output + '\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\n');
      return 1;
    }
  }
}
