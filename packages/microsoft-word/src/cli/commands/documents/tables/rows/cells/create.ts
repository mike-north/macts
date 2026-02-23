import { Command, Option } from 'clipanion';
import { getClient } from '../../../../../sdk.js';
import { createFormatter } from '../../../../../output/index.js';

/**
 * Create a new cell.
 */
export class CreateCellCommand extends Command {
  static override paths = [["microsoft-word", "documents", "tables", "rows", "cells", "create"]];

  static override usage = Command.Usage({
    description: 'Create a new cell',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  documentId = Option.String('--document-id', { required: true, description: 'Document ID' });
  tableId = Option.String('--table-id', { required: true, description: 'Table ID' });
  rowId = Option.String('--row-id', { required: true, description: 'Row ID' });
  content = Option.String('--content', { required: true, description: "The text content of the cell" });
  width = Option.String('--width', { required: true, description: "The width of the cell in points" });
  height = Option.String('--height', { required: true, description: "The height of the cell in points" });
  verticalAlignment = Option.String('--vertical-alignment', { required: true, description: "The vertical alignment of text in the cell" });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const item = await client.cells.create({
        content: this.content,
        width: this.width,
        height: this.height,
        verticalAlignment: this.verticalAlignment,
      } as Record<string, unknown>);

      const output = formatter.format({
        message: 'Cell created successfully',
        content: item.content,
        width: item.width,
        height: item.height,
        verticalAlignment: item.verticalAlignment,
        rowIndex: item.rowIndex,
        columnIndex: item.columnIndex,
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
