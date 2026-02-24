import { Command, Option } from 'clipanion';
import { getClient } from '../sdk.js';
import { createFormatter } from '../output/index.js';

/**
 * Create a new document
 */
export class CreateNewDocumentCommand extends Command {
  static override paths = [["microsoft-word", "create-new-document"]];

  static override usage = Command.Usage({
    description: "Create a new document",
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  attachedTemplate = Option.String('--attached-template', { required: false, description: "Path to template for the new document" });
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      await client.createNewDocument(this.attachedTemplate as unknown);

      const output = formatter.formatSuccess('createNewDocument completed successfully');
      this.context.stdout.write(output + '\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\n');
      return 1;
    }
  }
}
