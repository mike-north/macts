import { Command, Option } from 'clipanion';
import { getClient } from '../../../sdk.js';
import { createFormatter } from '../../../output/index.js';

/**
 * Get a field by ID.
 */
export class GetFieldCommand extends Command {
  static override paths = [["microsoft-word", "documents", "fields", "get"]];

  static override usage = Command.Usage({
    description: 'Get a field by ID',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  documentId = Option.String('--document-id', { required: true, description: 'Document ID' });

  fieldId = Option.String({ required: true });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const item = await client.fields.get(this.fieldId);

      const output = formatter.format({
        fieldType: item.fieldType,
        fieldCode: item.fieldCode,
        fieldText: item.fieldText,
        locked: item.locked,
        showCodes: item.showCodes,
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
