import { Command, Option } from 'clipanion';
import { getClient } from '../../../sdk.js';
import { createFormatter } from '../../../output/index.js';

/**
 * Get a tag by ID.
 */
export class GetTagCommand extends Command {
  static override paths = [["omnifocus", "tags", "tags", "get"]];

  static override usage = Command.Usage({
    description: 'Get a tag by ID',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  tagId = Option.String('--tag-id', { required: true, description: 'Tag ID' });

  tagId = Option.String({ required: true });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const item = await client.tags.get(this.tagId);

      if (!item) {
        this.context.stderr.write(formatter.formatError('Tag not found') + '\n');
        return 1;
      }

      const output = formatter.format({
        id: item.id,
        name: item.name,
        note: item.note,
        allowsNextAction: item.allowsNextAction,
        hidden: item.hidden,
        effectivelyHidden: item.effectivelyHidden,
        availableTaskCount: item.availableTaskCount,
        remainingTaskCount: item.remainingTaskCount,
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
