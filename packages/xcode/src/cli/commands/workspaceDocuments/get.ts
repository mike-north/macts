import { Command, Option } from 'clipanion';
import { getClient } from '../../sdk.js';
import { createFormatter } from '../../output/index.js';

/**
 * Get a workspacedocument by ID.
 */
export class GetWorkspaceDocumentCommand extends Command {
  static override paths = [["xcode", "workspaceDocuments", "get"]];

  static override usage = Command.Usage({
    description: 'Get a workspacedocument by ID',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });

  workspaceDocumentId = Option.String({ required: true });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const item = await client.workspacedocuments.get(this.workspaceDocumentId);

      const output = formatter.format({
        name: item.name,
        modified: item.modified,
        file: item.file,
        path: item.path,
        loaded: item.loaded,
        activeScheme: item.activeScheme,
        activeRunDestination: item.activeRunDestination,
        lastSchemeActionResult: item.lastSchemeActionResult,
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
