import { Command, Option } from 'clipanion';
import { getClient } from '../../../../sdk.js';
import { createFormatter } from '../../../../output/index.js';

/**
 * Get a column by ID.
 */
export class GetColumnCommand extends Command {
  static override paths = [["microsoft-word", "documents", "tables", "columns", "get"]];

  static override usage = Command.Usage({
    description: 'Get a column by ID',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  documentId = Option.String('--document-id', { required: true, description: 'Document ID' });
  tableId = Option.String('--table-id', { required: true, description: 'Table ID' });

  columnId = Option.String({ required: true });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const item = await client.columns.get(this.columnId);

      if (!item) {
        this.context.stderr.write(formatter.formatError('Column not found') + '\n');
        return 1;
      }

      const output = formatter.format({
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
