import { Command, Option } from 'clipanion';
import { getClient } from '../../../../../sdk.js';
import { createFormatter } from '../../../../../output/index.js';

/**
 * List buildsettings.
 */
export class ListBuildSettingsCommand extends Command {
  static override paths = [["xcode", "workspaceDocuments", "projects", "buildConfigurations", "buildSettings", "list"]];

  static override usage = Command.Usage({
    description: 'List buildsettings',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  workspaceDocumentId = Option.String('--workspace-document-id', { required: true, description: 'WorkspaceDocument ID' });
  projectId = Option.String('--project-id', { required: true, description: 'Project ID' });
  buildConfigurationId = Option.String('--build-configuration-id', { required: true, description: 'BuildConfiguration ID' });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const items = await client.buildsettings.list();

      const output = formatter.formatList(items.map(item => ({
        name: item.name,
        value: item.value,
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
