import { Command, Option } from 'clipanion';
import { getClient } from '../../../../sdk.js';
import { createFormatter } from '../../../../output/index.js';

/**
 * Get a buildconfiguration by ID.
 */
export class GetBuildConfigurationCommand extends Command {
  static override paths = [["xcode", "workspaceDocuments", "projects", "buildConfigurations", "get"]];

  static override usage = Command.Usage({
    description: 'Get a buildconfiguration by ID',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  workspaceDocumentId = Option.String('--workspace-document-id', { required: true, description: 'WorkspaceDocument ID' });
  projectId = Option.String('--project-id', { required: true, description: 'Project ID' });

  buildConfigurationId = Option.String({ required: true });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const item = await client.buildconfigurations.get(this.buildConfigurationId);

      if (!item) {
        this.context.stderr.write(formatter.formatError('BuildConfiguration not found') + '\n');
        return 1;
      }

      const output = formatter.format({
        id: item.id,
        name: item.name,
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
