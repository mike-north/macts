import { Command, Option } from 'clipanion';
import { getClient } from '../../sdk.js';
import { createFormatter } from '../../output/index.js';

/**
 * Save the specified document
 */
export class SaveDocumentCommand extends Command {
  static override paths = [["microsoft-word", "documents", "save"]];

  static override usage = Command.Usage({
    description: "Save the specified document",
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });

  documentId = Option.String({ required: true });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      await client.documents.save();

      const output = formatter.formatSuccess('save completed successfully');
      this.context.stdout.write(output + '\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\n');
      return 1;
    }
  }
}
