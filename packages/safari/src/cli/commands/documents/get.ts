import { Command, Option } from 'clipanion';
import { getClient } from '../../sdk.js';
import { createFormatter } from '../../output/index.js';

/**
 * Get a document by ID.
 */
export class GetDocumentCommand extends Command {
  static override paths = [["safari", "documents", "get"]];

  static override usage = Command.Usage({
    description: 'Get a document by ID',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });

  documentId = Option.String({ required: true });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const item = await client.documents.get(this.documentId);

      if (!item) {
        this.context.stderr.write(formatter.formatError('Document not found') + '\n');
        return 1;
      }

      const output = formatter.format({
        name: item.name,
        id: item.id,
        url: item.url,
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
