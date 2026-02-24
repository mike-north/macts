import { Command, Option } from 'clipanion';
import { getClient } from '../../../sdk.js';
import { createFormatter } from '../../../output/index.js';

/**
 * Go Forward (If Possible)
 */
export class GoForwardTabCommand extends Command {
  static override paths = [["microsoft-edge", "windows", "tabs", "go-forward"]];

  static override usage = Command.Usage({
    description: "Go Forward (If Possible)",
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  windowId = Option.String('--window-id', { required: true, description: 'Window ID' });

  tabId = Option.String({ required: true });
  tabId = Option.String('--tab-id', { required: true, description: "Tab identifier" });
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      await client.tabs.goForward(this.tabId as unknown);

      const output = formatter.formatSuccess('goForward completed successfully');
      this.context.stdout.write(output + '\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\n');
      return 1;
    }
  }
}
