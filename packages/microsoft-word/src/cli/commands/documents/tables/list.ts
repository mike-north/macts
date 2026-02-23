import { Command, Option } from 'clipanion';
import { getClient } from '../../../sdk.js';
import { createFormatter } from '../../../output/index.js';

/**
 * List tables.
 */
export class ListTablesCommand extends Command {
  static override paths = [["microsoft-word", "documents", "tables", "list"]];

  static override usage = Command.Usage({
    description: 'List tables',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  documentId = Option.String('--document-id', { required: true, description: 'Document ID' });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const items = await client.tables.list();

      const output = formatter.formatList(items.map(item => ({
        rowCount: item.rowCount,
        columnCount: item.columnCount,
        allowAutoFit: item.allowAutoFit,
        borders: item.borders,
      })));

      this.context.stdout.write(output + '\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\n');
      return 1;
    }
  }
}
