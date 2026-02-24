import { Command, Option } from 'clipanion';
import { getClient } from '../../../sdk.js';
import { createFormatter } from '../../../output/index.js';

/**
 * Get a event by ID.
 */
export class GetEventCommand extends Command {
  static override paths = [["calendar", "calendars", "events", "get"]];

  static override usage = Command.Usage({
    description: 'Get a event by ID',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  calendarId = Option.String('--calendar-id', { required: true, description: 'Calendar ID' });

  eventId = Option.String({ required: true });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const item = await client.events.get(this.eventId);

      const output = formatter.format({
        summary: item.summary,
        description: item.description,
        location: item.location,
        startDate: item.startDate,
        endDate: item.endDate,
        alldayEvent: item.alldayEvent,
        recurrence: item.recurrence,
        status: item.status,
        sequence: item.sequence,
        stampDate: item.stampDate,
        excludedDates: item.excludedDates,
        uid: item.uid,
        url: item.url,
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
