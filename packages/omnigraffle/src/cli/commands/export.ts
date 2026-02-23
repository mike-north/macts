import { Command, Option } from 'clipanion';
import * as t from 'typanion';
import { getClient } from '../sdk.js';
import { createFormatter } from '../output/index.js';

/**
 * Export documents
 */
export class ExportCommand extends Command {
  static override paths = [["omnigraffle", "export"]];

  static override usage = Command.Usage({
    description: "Export documents",
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  as = Option.String('--as', { required: true, description: "File type" });
  scope = Option.String('--scope', { required: true, description: "Area to export", validator: t.isEnum(["selectedGraphics", "allGraphics", "currentCanvas", "entireDocument"]) });
  to = Option.String('--to', { required: true, description: "Output file path" });
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await client._export(this.as as any, this.scope as any, this.to as any);

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
