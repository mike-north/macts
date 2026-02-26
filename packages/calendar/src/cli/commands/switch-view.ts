import { Command, Option } from 'clipanion';
import * as t from 'typanion';
import { getClient } from '../sdk.js';
import { createFormatter } from '../output/index.js';

/**
 * Show calendar on the given view
 */
export class SwitchViewCommand extends Command {
  static override paths = [["calendar", "switch-view"]];

  static override usage = Command.Usage({
    description: "Show calendar on the given view",
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  to = Option.String('--to', { required: true, description: "The calendar view to be displayed", validator: t.isEnum(["dayView", "weekView", "monthView"]) });
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      await client.switchView(this.to as unknown);

      const output = formatter.formatSuccess('switchView completed successfully');
      this.context.stdout.write(output + '\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\n');
      return 1;
    }
  }
}
