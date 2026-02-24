import { Command, Option } from 'clipanion';
import { getClient } from '../sdk.js';
import { createFormatter } from '../output/index.js';

/**
 * Make sure that all in-memory structures are in-sync with their on-disk counterparts.
 */
export class SyncAllPlistToDiskCommand extends Command {
  static override paths = [["safari", "sync-all-plist-to-disk"]];

  static override usage = Command.Usage({
    description: "Make sure that all in-memory structures are in-sync with their on-disk counterparts.",
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      await client.syncAllPlistToDisk();

      const output = formatter.formatSuccess('syncAllPlistToDisk completed successfully');
      this.context.stdout.write(output + '\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\n');
      return 1;
    }
  }
}
