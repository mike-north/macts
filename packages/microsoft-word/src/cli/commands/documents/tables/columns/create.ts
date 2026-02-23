import { Command, Option } from 'clipanion';
import { getClient } from '../../../../sdk.js';
import { createFormatter } from '../../../../output/index.js';

/**
 * Create a new column.
 */
export class CreateColumnCommand extends Command {
  static override paths = [["microsoft-word", "documents", "tables", "columns", "create"]];

  static override usage = Command.Usage({
    description: 'Create a new column',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  documentId = Option.String('--document-id', { required: true, description: 'Document ID' });
  tableId = Option.String('--table-id', { required: true, description: 'Table ID' });
  width = Option.String('--width', { required: true, description: "The width of the column in points" });
  preferredWidth = Option.String('--preferred-width', { required: true, description: "The preferred width of the column" });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const item = await client.columns.create({
        width: this.width,
        preferredWidth: this.preferredWidth,
      } as Record<string, unknown>);

      const output = formatter.format({
        message: 'Column created successfully',
        width: item.width,
        preferredWidth: item.preferredWidth,
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
