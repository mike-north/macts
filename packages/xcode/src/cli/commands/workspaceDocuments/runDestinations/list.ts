import { Command, Option } from 'clipanion';
import { getClient } from '../../../sdk.js';
import { createFormatter } from '../../../output/index.js';

/**
 * List rundestinations.
 */
export class ListRunDestinationsCommand extends Command {
  static override paths = [["xcode", "workspaceDocuments", "runDestinations", "list"]];

  static override usage = Command.Usage({
    description: 'List rundestinations',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  workspaceDocumentId = Option.String('--workspace-document-id', { required: true, description: 'WorkspaceDocument ID' });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const items = await client.rundestinations.list();

      const output = formatter.formatList(items.map(item => ({
        name: item.name,
        architecture: item.architecture,
        platform: item.platform,
        device: item.device,
        companionDevice: item.companionDevice,
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
