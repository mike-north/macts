import { Command, Option } from 'clipanion';
import { getClient } from '../../../../sdk.js';
import { createFormatter } from '../../../../output/index.js';

/**
 * List targets.
 */
export class ListTargetsCommand extends Command {
  static override paths = [["xcode", "workspaceDocuments", "projects", "targets", "list"]];

  static override usage = Command.Usage({
    description: 'List targets',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  workspaceDocumentId = Option.String('--workspace-document-id', { required: true, description: 'WorkspaceDocument ID' });
  projectId = Option.String('--project-id', { required: true, description: 'Project ID' });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const items = await client.targets.list();

      const output = formatter.formatList(items.map(item => ({
        id: item.id,
        name: item.name,
        project: item.project,
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
