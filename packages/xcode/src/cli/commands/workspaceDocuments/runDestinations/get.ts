import { Command, Option } from 'clipanion';
import { getClient } from '../../../sdk.js';
import { createFormatter } from '../../../output/index.js';

/**
 * Get a rundestination by ID.
 */
export class GetRunDestinationCommand extends Command {
  static override paths = [["xcode", "workspaceDocuments", "runDestinations", "get"]];

  static override usage = Command.Usage({
    description: 'Get a rundestination by ID',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  workspaceDocumentId = Option.String('--workspace-document-id', { required: true, description: 'WorkspaceDocument ID' });

  runDestinationId = Option.String({ required: true });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const item = await client.rundestinations.get(this.runDestinationId);

      if (!item) {
        this.context.stderr.write(formatter.formatError('RunDestination not found') + '\n');
        return 1;
      }

      const output = formatter.format({
        name: item.name,
        architecture: item.architecture,
        platform: item.platform,
        device: item.device,
        companionDevice: item.companionDevice,
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
