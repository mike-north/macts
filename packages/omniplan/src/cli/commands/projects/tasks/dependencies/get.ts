import { Command, Option } from 'clipanion';
import { getClient } from '../../../../sdk.js';
import { createFormatter } from '../../../../output/index.js';

/**
 * Get a dependency by ID.
 */
export class GetDependencyCommand extends Command {
  static override paths = [["omniplan", "projects", "tasks", "dependencies", "get"]];

  static override usage = Command.Usage({
    description: 'Get a dependency by ID',
  });

  json = Option.Boolean('--json', { description: 'Output as JSON' });
  projectId = Option.String('--project-id', { required: true, description: 'Project ID' });
  taskId = Option.String('--task-id', { required: true, description: 'Task ID' });

  dependencyId = Option.String({ required: true });

  async execute(): Promise<number> {
    const formatter = createFormatter(this.json ?? false);

    try {
      const client = getClient();
      const item = await client.dependencies.get(this.dependencyId);

      const output = formatter.format({
        dependencyType: item.dependencyType,
        leadTime: item.leadTime,
        leadPercentage: item.leadPercentage,
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
