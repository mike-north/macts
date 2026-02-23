import { Command, Option } from 'clipanion';
import { getClient } from '../../sdk.js';
import { createFormatter } from '../../output/index.js';

/**
 * List sourcedocuments.
 */
export class ListSourceDocumentsCommand extends Command {
  static override paths = [["xcode", "sourceDocuments", "list"]];

  static override usage = Command.Usage({
    description: 'List sourcedocuments',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const items = await client.sourcedocuments.list();

      const output = formatter.formatList(items.map(item => ({
        name: item.name,
        modified: item.modified,
        file: item.file,
        path: item.path,
        selectedCharacterRange: item.selectedCharacterRange,
        selectedParagraphRange: item.selectedParagraphRange,
        text: item.text,
        notifiesWhenClosing: item.notifiesWhenClosing,
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
