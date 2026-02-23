import { Command, Option } from 'clipanion';
import { getClient } from '../../../../sdk.js';
import { createFormatter } from '../../../../output/index.js';

/**
 * Get a soundalarm by ID.
 */
export class GetSoundAlarmCommand extends Command {
  static override paths = [["calendar", "calendars", "events", "soundAlarms", "get"]];

  static override usage = Command.Usage({
    description: 'Get a soundalarm by ID',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  calendarId = Option.String('--calendar-id', { required: true, description: 'Calendar ID' });
  eventId = Option.String('--event-id', { required: true, description: 'Event ID' });

  soundAlarmId = Option.String({ required: true });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const item = await client.soundalarms.get(this.soundAlarmId);

      if (!item) {
        this.context.stderr.write(formatter.formatError('SoundAlarm not found') + '\n');
        return 1;
      }

      const output = formatter.format({
        triggerInterval: item.triggerInterval,
        triggerDate: item.triggerDate,
        soundName: item.soundName,
        soundFile: item.soundFile,
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
