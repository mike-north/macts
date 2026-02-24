import { Command, Option } from 'clipanion';
import { getClient } from '../../../../sdk.js';
import { createFormatter } from '../../../../output/index.js';

/**
 * Get a mailalarm by ID.
 */
export class GetMailAlarmCommand extends Command {
  static override paths = [["calendar", "calendars", "events", "mailAlarms", "get"]];

  static override usage = Command.Usage({
    description: 'Get a mailalarm by ID',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  calendarId = Option.String('--calendar-id', { required: true, description: 'Calendar ID' });
  eventId = Option.String('--event-id', { required: true, description: 'Event ID' });

  mailAlarmId = Option.String({ required: true });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const item = await client.mailalarms.get(this.mailAlarmId);

      const output = formatter.format({
        triggerInterval: item.triggerInterval,
        triggerDate: item.triggerDate,
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
