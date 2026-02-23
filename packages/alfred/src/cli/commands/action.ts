import { Command, Option } from 'clipanion';
import { getClient } from '../sdk.js';
import { createFormatter } from '../output/index.js';

/**
 * Show Alfred actions for the given file
 */
export class ActionCommand extends Command {
  static override paths = [["alfred", "action"]];

  static override usage = Command.Usage({
    description: "Show Alfred actions for the given file",
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  items = Option.String('--items', { required: true, description: "The items to show actions for" });
  asType = Option.String('--as-type', { required: false, description: "An optional type for the items - file, url or text" });
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await client.action(this.items as any, this.asType as any);

      const output = formatter.formatSuccess('action completed successfully');
      this.context.stdout.write(output + '\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\n');
      return 1;
    }
  }
}
