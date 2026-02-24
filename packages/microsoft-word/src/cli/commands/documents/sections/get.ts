import { Command, Option } from 'clipanion';
import { getClient } from '../../../sdk.js';
import { createFormatter } from '../../../output/index.js';

/**
 * Get a section by ID.
 */
export class GetSectionCommand extends Command {
  static override paths = [["microsoft-word", "documents", "sections", "get"]];

  static override usage = Command.Usage({
    description: 'Get a section by ID',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  documentId = Option.String('--document-id', { required: true, description: 'Document ID' });

  sectionId = Option.String({ required: true });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const item = await client.sections.get(this.sectionId);

      const output = formatter.format({
        sectionIndex: item.sectionIndex,
        protectedForForms: item.protectedForForms,
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
