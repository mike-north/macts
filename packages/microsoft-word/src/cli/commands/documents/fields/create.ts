import { Command, Option } from 'clipanion';
import { getClient } from '../../../sdk.js';
import { createFormatter } from '../../../output/index.js';

/**
 * Create a new field.
 */
export class CreateFieldCommand extends Command {
  static override paths = [["microsoft-word", "documents", "fields", "create"]];

  static override usage = Command.Usage({
    description: 'Create a new field',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  documentId = Option.String('--document-id', { required: true, description: 'Document ID' });
  fieldCode = Option.String('--field-code', { required: true, description: "The field code" });
  fieldText = Option.String('--field-text', { required: true, description: "The field text" });
  locked = Option.Boolean('--locked', { description: "Whether the field is locked" });
  showCodes = Option.Boolean('--show-codes', { description: "Whether field codes are displayed" });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const item = await client.fields.create({
        fieldCode: this.fieldCode,
        fieldText: this.fieldText,
        locked: this.locked,
        showCodes: this.showCodes,
      } as Record<string, unknown>);

      const output = formatter.format({
        message: 'Field created successfully',
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
