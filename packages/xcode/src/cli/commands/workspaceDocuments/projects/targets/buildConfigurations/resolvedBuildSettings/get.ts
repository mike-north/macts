import { Command, Option } from 'clipanion';
import { getClient } from '../../../../../../sdk.js';
import { createFormatter } from '../../../../../../output/index.js';

/**
 * Get a resolvedbuildsetting by ID.
 */
export class GetResolvedBuildSettingCommand extends Command {
  static override paths = [["xcode", "workspaceDocuments", "projects", "targets", "buildConfigurations", "resolvedBuildSettings", "get"]];

  static override usage = Command.Usage({
    description: 'Get a resolvedbuildsetting by ID',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  workspaceDocumentId = Option.String('--workspace-document-id', { required: true, description: 'WorkspaceDocument ID' });
  projectId = Option.String('--project-id', { required: true, description: 'Project ID' });
  targetId = Option.String('--target-id', { required: true, description: 'Target ID' });
  buildConfigurationId = Option.String('--build-configuration-id', { required: true, description: 'BuildConfiguration ID' });

  resolvedBuildSettingId = Option.String({ required: true });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const item = await client.resolvedbuildsettings.get(this.resolvedBuildSettingId);

      if (!item) {
        this.context.stderr.write(formatter.formatError('ResolvedBuildSetting not found') + '\n');
        return 1;
      }

      const output = formatter.format({
        name: item.name,
        value: item.value,
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
