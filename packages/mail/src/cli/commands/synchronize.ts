import { Command, Option } from 'clipanion';
import { getClient } from '../sdk.js';
import { createFormatter } from '../output/index.js';

/**
 * Command to trigger synchronizing of an IMAP account with the server.
 */
export class SynchronizeCommand extends Command {
  static override paths = [["mail", "synchronize"]];

  static override usage = Command.Usage({
    description: "Command to trigger synchronizing of an IMAP account with the server.",
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  with = Option.String('--with', { required: true, description: "The account to synchronize" });
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      await client.synchronize(this.with as unknown);

      const output = formatter.formatSuccess('synchronize completed successfully');
      this.context.stdout.write(output + '\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\n');
      return 1;
    }
  }
}
