import { Command, Option } from 'clipanion';
import { getClient } from '../sdk.js';
import { createFormatter } from '../output/index.js';

/**
 * Export a document
 */
export class ExportCommand extends Command {
  static override paths = [["omniplan", "export"]];

  static override usage = Command.Usage({
    description: "Export a document",
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  to = Option.String('--to', { required: true, description: "Export file path" });
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await client._export(this.to as any);

      const output = formatter.formatSuccess('export completed successfully');
      this.context.stdout.write(output + '\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\n');
      return 1;
    }
  }
}
