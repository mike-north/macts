import { Command, Option } from 'clipanion';
import { getClient } from '../../sdk.js';
import { createFormatter } from '../../output/index.js';

/**
 * Close the specified document
 */
export class CloseDocumentCommand extends Command {
  static override paths = [["microsoft-word", "documents", "close"]];

  static override usage = Command.Usage({
    description: "Close the specified document",
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });

  documentId = Option.String({ required: true });
  saving = Option.Boolean('--saving', { description: "Whether to save changes before closing" });
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await client.documents.close(this.saving as any);

      const output = formatter.formatSuccess('close completed successfully');
      this.context.stdout.write(output + '\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\n');
      return 1;
    }
  }
}
