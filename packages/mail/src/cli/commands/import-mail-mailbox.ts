import { Command, Option } from 'clipanion';
import { getClient } from '../sdk.js';
import { createFormatter } from '../output/index.js';

/**
 * Imports a mailbox created by Mail.
 */
export class ImportMailMailboxCommand extends Command {
  static override paths = [["mail", "import-mail-mailbox"]];

  static override usage = Command.Usage({
    description: "Imports a mailbox created by Mail.",
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  at = Option.String('--at', { required: true, description: "the mailbox or folder of mailboxes to import" });
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await client.importMailMailbox(this.at as any);

      const output = formatter.formatSuccess('importMailMailbox completed successfully');
      this.context.stdout.write(output + '\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\n');
      return 1;
    }
  }
}
