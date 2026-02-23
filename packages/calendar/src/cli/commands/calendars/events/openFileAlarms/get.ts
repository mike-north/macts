import { Command, Option } from 'clipanion';
import { getClient } from '../../../../sdk.js';
import { createFormatter } from '../../../../output/index.js';

/**
 * Get a openfilealarm by ID.
 */
export class GetOpenFileAlarmCommand extends Command {
  static override paths = [["calendar", "calendars", "events", "openFileAlarms", "get"]];

  static override usage = Command.Usage({
    description: 'Get a openfilealarm by ID',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  calendarId = Option.String('--calendar-id', { required: true, description: 'Calendar ID' });
  eventId = Option.String('--event-id', { required: true, description: 'Event ID' });

  openFileAlarmId = Option.String({ required: true });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const item = await client.openfilealarms.get(this.openFileAlarmId);

      if (!item) {
        this.context.stderr.write(formatter.formatError('OpenFileAlarm not found') + '\n');
        return 1;
      }

      const output = formatter.format({
        triggerInterval: item.triggerInterval,
        triggerDate: item.triggerDate,
        filepath: item.filepath,
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
