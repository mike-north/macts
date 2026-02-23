import { Command, Option } from 'clipanion';
import { getClient } from '../../../sdk.js';
import { createFormatter } from '../../../output/index.js';

/**
 * Execute a piece of javascript
 */
export class ExecuteTabCommand extends Command {
  static override paths = [["microsoft-edge", "windows", "tabs", "execute"]];

  static override usage = Command.Usage({
    description: "Execute a piece of javascript",
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  windowId = Option.String('--window-id', { required: true, description: 'Window ID' });

  tabId = Option.String({ required: true });
  tabId = Option.String('--tab-id', { required: true, description: "Tab identifier" });
  javascript = Option.String('--javascript', { required: true, description: "The javascript code to execute" });
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await client.tabs.execute(this.tabId as any, this.javascript as any);

      const output = formatter.formatSuccess('execute completed successfully');
      this.context.stdout.write(output + '\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\n');
      return 1;
    }
  }
}
