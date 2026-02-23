import { Command, Option } from 'clipanion';
import { getClient } from '../../../sdk.js';
import { createFormatter } from '../../../output/index.js';

/**
 * Show the event or to-do in the calendar window
 */
export class ShowEventCommand extends Command {
  static override paths = [["calendar", "calendars", "events", "show"]];

  static override usage = Command.Usage({
    description: "Show the event or to-do in the calendar window",
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  calendarId = Option.String('--calendar-id', { required: true, description: 'Calendar ID' });

  eventId = Option.String({ required: true });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await client.events.show();

      const output = formatter.formatSuccess('show completed successfully');
      this.context.stdout.write(output + '\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\n');
      return 1;
    }
  }
}
