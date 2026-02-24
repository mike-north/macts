import { Command, Option } from 'clipanion';
import { getClient } from '../../sdk.js';
import { createFormatter } from '../../output/index.js';

/**
 * Get a participant by ID.
 */
export class GetParticipantCommand extends Command {
  static override paths = [["messages", "participants", "get"]];

  static override usage = Command.Usage({
    description: 'Get a participant by ID',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });

  participantId = Option.String({ required: true });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const item = await client.participants.get(this.participantId);

      const output = formatter.format({
        id: item.id,
        account: item.account,
        name: item.name,
        handle: item.handle,
        firstName: item.firstName,
        lastName: item.lastName,
        fullName: item.fullName,
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
