import { Command, Option } from 'clipanion';
import { getClient } from '../../sdk.js';
import { createFormatter } from '../../output/index.js';

/**
 * Invoke the "build" scheme action
 */
export class BuildWorkspaceDocumentCommand extends Command {
  static override paths = [["xcode", "workspaceDocuments", "build"]];

  static override usage = Command.Usage({
    description: "Invoke the \"build\" scheme action",
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });

  workspaceDocumentId = Option.String({ required: true });
  workspaceName = Option.String('--workspace-name', { required: true, description: "Workspace document name" });
  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      await client.workspacedocuments.build(this.workspaceName as any);

      const output = formatter.formatSuccess('build completed successfully');
      this.context.stdout.write(output + '\n');
      return 0;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.context.stderr.write(formatter.formatError(message) + '\n');
      return 1;
    }
  }
}
