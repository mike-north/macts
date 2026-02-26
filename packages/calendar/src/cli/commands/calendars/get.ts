import { Command, Option } from 'clipanion';
import { getClient } from '../../sdk.js';
import { createFormatter } from '../../output/index.js';

/**
 * Get a calendar by ID.
 */
export class GetCalendarCommand extends Command {
  static override paths = [["calendar", "calendars", "get"]];

  static override usage = Command.Usage({
    description: 'Get a calendar by ID',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });

  calendarId = Option.String({ required: true });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const item = await client.calendars.get(this.calendarId);

      const output = formatter.format({
        name: item.name,
        title: item.title,
        color: item.color,
        calendarIdentifier: item.calendarIdentifier,
        writable: item.writable,
        description: item.description,
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
