import { Command, Option } from 'clipanion';
import { getClient } from '../../../sdk.js';
import { createFormatter } from '../../../output/index.js';

/**
 * Get a table by ID.
 */
export class GetTableCommand extends Command {
  static override paths = [["microsoft-word", "documents", "tables", "get"]];

  static override usage = Command.Usage({
    description: 'Get a table by ID',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  documentId = Option.String('--document-id', { required: true, description: 'Document ID' });

  tableId = Option.String({ required: true });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const item = await client.tables.get(this.tableId);

      if (!item) {
        this.context.stderr.write(formatter.formatError('Table not found') + '\n');
        return 1;
      }

      const output = formatter.format({
        rowCount: item.rowCount,
        columnCount: item.columnCount,
        allowAutoFit: item.allowAutoFit,
        borders: item.borders,
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
