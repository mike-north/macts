import { Command, Option } from 'clipanion';
import { getClient } from '../sdk.js';
import { createFormatter } from '../output/index.js';

/**
 * Write a backup archive of the document
 */
export class ArchiveCommand extends Command {
  static override paths = [["omnifocus", "archive"]];

  static override usage = Command.Usage({
    description: "Write a backup archive of the document",
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  in = Option.String('--in', { required: true, description: "The file in which to archive the document" });
  compression = Option.Boolean('--compression', { description: "Should the archive be written with data compression enabled" });
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await client.archive(this.in as any, this.compression as any);

      const output = formatter.formatSuccess('archive completed successfully');
      this.context.stdout.write(output + '\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\n');
      return 1;
    }
  }
}
