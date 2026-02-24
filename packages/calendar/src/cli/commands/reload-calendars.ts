import { Command, Option } from 'clipanion';
import { getClient } from '../sdk.js';
import { createFormatter } from '../output/index.js';

/**
 * Tell the application to reload all calendar files contents
 */
export class ReloadCalendarsCommand extends Command {
  static override paths = [["calendar", "reload-calendars"]];

  static override usage = Command.Usage({
    description: "Tell the application to reload all calendar files contents",
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      await client.reloadCalendars();

      const output = formatter.formatSuccess('reloadCalendars completed successfully');
      this.context.stdout.write(output + '\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\n');
      return 1;
    }
  }
}
